"""
Pipeline RAG: extracción → chunking → embeddings → bulk insert en `pgvector`.

Diseñado para correr como BackgroundTask de FastAPI: nunca recibe la sesión
del request (esa se cierra al responder), abre las suyas vía `SessionFactory`.

Las operaciones de IO de CPU (parseo PDF/EPUB, OCR) corren en `asyncio.to_thread`
para no bloquear el event loop.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

import asyncio

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.embedding import Embedding
from app.models.material import Material, MaterialStatus
from app.services.embeddings import get_embedding_client
from app.services.storage import get_storage

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Extracción
# ---------------------------------------------------------------------------


async def extract_text_from_storage(storage_key: str, mime_type: str) -> str:
    """
    Resuelve la ruta absoluta del archivo en el RAID y delega a un extractor
    específico según el `mime_type`. Si el resultado está vacío, lanza
    `ValueError` para que el pipeline marque el material como `failed`.
    """
    storage = get_storage()
    path = storage.absolute_path(storage_key)

    if mime_type == "application/pdf":
        text = await asyncio.to_thread(_extract_pdf, path)
    elif mime_type == "application/epub+zip":
        text = await asyncio.to_thread(_extract_epub, path)
    elif mime_type in ("image/jpeg", "image/png"):
        text = await asyncio.to_thread(_extract_ocr, path)
    else:
        raise ValueError(f"mime_type no soportado por el extractor: {mime_type}")

    text = text.strip()
    if not text:
        raise ValueError("El extractor no obtuvo texto del archivo.")
    return text


def _extract_pdf(path: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(path)
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception as exc:  # noqa: BLE001
            logger.warning("pypdf falló en una página de %s: %s", path, exc)
            continue
    return "\n\n".join(pages)


def _extract_epub(path: str) -> str:
    from bs4 import BeautifulSoup
    from ebooklib import ITEM_DOCUMENT, epub

    book = epub.read_epub(path)
    parts: list[str] = []
    for item in book.get_items_of_type(ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        parts.append(soup.get_text(separator=" ", strip=True))
    return "\n\n".join(parts)


def _extract_ocr(path: str) -> str:
    import pytesseract
    from PIL import Image

    settings = get_settings()
    with Image.open(path) as image:
        return pytesseract.image_to_string(image, lang=settings.ocr_langs)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
    """
    Splitter por caracteres con ventana deslizante y solapamiento. Cuando hay
    un cambio de párrafo cerca del corte, prefiere romper ahí para preservar
    semántica básica sin librerías externas.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size debe ser > 0")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("0 <= chunk_overlap < chunk_size")

    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    step = chunk_size - chunk_overlap
    start = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        chunk = text[start:end]

        if end < n:
            tail = chunk
            soft_break = max(tail.rfind("\n\n"), tail.rfind("\n"), tail.rfind(". "))
            if soft_break > chunk_size * 0.5:
                end = start + soft_break + 1
                chunk = text[start:end]

        chunk = chunk.strip()
        if chunk:
            chunks.append(chunk)

        if end >= n:
            break
        start = max(end - chunk_overlap, start + 1)

    return chunks


# ---------------------------------------------------------------------------
# Pipeline completo
# ---------------------------------------------------------------------------


async def _set_status(material_id: UUID, status: MaterialStatus) -> None:
    async with SessionFactory() as session:
        material = await session.get(Material, material_id)
        if material is None:
            return
        material.status = status
        await session.commit()


async def process_material_pipeline(material_id: UUID) -> None:
    """
    Orquesta extracción + chunking + embeddings + persistencia para `material_id`.

    Idempotencia ligera: si ya está en `processing`, no re-procesa.
    Cualquier fallo deja al material en `failed`.
    """
    settings = get_settings()

    async with SessionFactory() as session:
        material = await session.get(Material, material_id)
        if material is None:
            logger.warning("Pipeline RAG: material %s inexistente", material_id)
            return
        if material.status == MaterialStatus.processing:
            return
        material.status = MaterialStatus.processing
        snapshot = {
            "id": material.id,
            "storage_key": material.storage_key,
            "mime_type": material.mime_type,
            "carrera": material.carrera,
            "tipo_archivo": material.tipo_archivo.value,
            "sha256": material.sha256,
        }
        await session.commit()

    try:
        text = await extract_text_from_storage(snapshot["storage_key"], snapshot["mime_type"])
        chunks = chunk_text(text, chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap)
        if not chunks:
            raise ValueError("No se generaron chunks a partir del texto extraído.")

        client = get_embedding_client()
        vectors = await client.embed_batch(chunks)
        if len(vectors) != len(chunks):
            raise RuntimeError("La cantidad de vectores no coincide con los chunks.")

        now = datetime.now(tz=UTC)
        carrera = snapshot["carrera"]
        meta_base = {
            "tipo": snapshot["tipo_archivo"],
            "carrera": carrera,
            "fecha_creacion": now.isoformat(),
            "sha256": snapshot["sha256"],
        }

        async with SessionFactory() as session:
            session.add_all(
                [
                    Embedding(
                        material_id=snapshot["id"],
                        chunk_idx=idx,
                        content=chunk,
                        vector=vector,
                        tipo="material",
                        carrera=carrera,
                        meta={**meta_base, "chunk_idx": idx, "chunk_len": len(chunk)},
                    )
                    for idx, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True))
                ]
            )
            material = await session.get(Material, material_id)
            if material is not None:
                material.status = MaterialStatus.active
            await session.commit()

        logger.info("Pipeline RAG OK material=%s chunks=%d", material_id, len(chunks))

    except Exception:
        logger.exception("Pipeline RAG fallido para material %s", material_id)
        await _set_status(material_id, MaterialStatus.failed)

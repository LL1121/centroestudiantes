"""Generación de citas APA 7 y extracción híbrida de metadata bibliográfica."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.material import Material, TipoArchivo
from app.services.llm_chat import get_llm_client
from app.services.rag_processor import extract_preview_text
from app.services.storage import get_storage

logger = logging.getLogger(__name__)

CitationSource = Literal["manual", "llm", "mixed", "fake"]

_APA_FIELDS = ("autor", "anio_publicacion", "editorial", "ciudad_publicacion", "isbn")

_LLM_SYSTEM = (
    "Sos un bibliotecario académico. Extraé metadata bibliográfica del texto dado. "
    "Respondé ÚNICAMENTE con JSON válido, sin markdown ni explicaciones."
)
_LLM_USER_TEMPLATE = """Extraé metadata del siguiente extracto de un material académico.

Devolvé JSON estricto con estas claves (null si no podés determinarlo):
{{
  "autor": "Apellido, Nombre o institución",
  "anio_publicacion": 2020,
  "editorial": "...",
  "ciudad_publicacion": "...",
  "isbn": "..."
}}

Título conocido del material: {titulo}

Texto:
{text}
"""


@dataclass(slots=True)
class CitationResult:
    citation_apa: str
    source: CitationSource
    missing_fields: list[str]


def _format_label(tipo: TipoArchivo) -> str:
    labels = {
        TipoArchivo.pdf: "PDF",
        TipoArchivo.epub: "EPUB",
        TipoArchivo.jpeg: "Imagen JPEG",
        TipoArchivo.png: "Imagen PNG",
    }
    return labels.get(tipo, tipo.value.upper())


def format_apa(material: Material) -> str:
    """Formatea cita APA 7 básica para material digital."""
    autor = (material.autor or "Autor desconocido").strip()
    anio = material.anio_publicacion
    anio_str = str(anio) if anio else "s.f."
    titulo = material.titulo.strip()
    formato = _format_label(material.tipo_archivo)

    parts = [f"{autor} ({anio_str}). *{titulo}* [{formato}]"]
    if material.editorial:
        parts.append(f"{material.editorial.strip()}.")
    if material.ciudad_publicacion:
        parts[-1] = f"{material.ciudad_publicacion.strip()}: {parts[-1]}"
    if material.isbn:
        parts.append(f"ISBN {material.isbn.strip()}.")
    return " ".join(parts)


def _missing_fields(material: Material) -> list[str]:
    missing: list[str] = []
    if not material.autor:
        missing.append("autor")
    if material.anio_publicacion is None:
        missing.append("anio_publicacion")
    return missing


def _parse_llm_json(raw: str) -> dict[str, object]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def _extract_with_llm(material: Material, text: str) -> dict[str, object]:
    settings = get_settings()
    if settings.llm_backend.lower() == "fake":
        return {}

    client = get_llm_client()
    snippet = text[:8000]
    user_msg = _LLM_USER_TEMPLATE.format(titulo=material.titulo, text=snippet)
    try:
        raw = await client.complete(
            system=_LLM_SYSTEM,
            user=user_msg,
            max_tokens=400,
            temperature=0.1,
        )
        data = _parse_llm_json(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.exception("LLM citation extract falló material=%s", material.id)
        return {}


def _apply_llm_fields(material: Material, data: dict[str, object]) -> bool:
    changed = False
    if not material.autor and data.get("autor"):
        material.autor = str(data["autor"]).strip()[:255] or None
        changed = changed or bool(material.autor)
    if material.anio_publicacion is None and data.get("anio_publicacion") is not None:
        try:
            material.anio_publicacion = int(data["anio_publicacion"])  # type: ignore[arg-type]
            changed = True
        except (TypeError, ValueError):
            pass
    if not material.editorial and data.get("editorial"):
        material.editorial = str(data["editorial"]).strip()[:255] or None
        changed = changed or bool(material.editorial)
    if not material.ciudad_publicacion and data.get("ciudad_publicacion"):
        material.ciudad_publicacion = str(data["ciudad_publicacion"]).strip()[:120] or None
        changed = changed or bool(material.ciudad_publicacion)
    if not material.isbn and data.get("isbn"):
        material.isbn = str(data["isbn"]).strip()[:32] or None
        changed = changed or bool(material.isbn)
    return changed


async def build_citation(session: AsyncSession, material_id: UUID) -> CitationResult:
    material = await session.get(Material, material_id)
    if material is None:
        raise ValueError("Material no encontrado")

    had_manual = not _missing_fields(material)
    source: CitationSource = "manual" if had_manual else "llm"

    if _missing_fields(material):
        storage = get_storage()
        path = storage.absolute_path(material.storage_key)
        preview = extract_preview_text(path, material.mime_type)
        if preview:
            llm_data = await _extract_with_llm(material, preview)
            if llm_data:
                _apply_llm_fields(material, llm_data)
                await session.commit()
                await session.refresh(material)
                settings = get_settings()
                if settings.llm_backend.lower() == "fake":
                    source = "fake"
                elif had_manual:
                    source = "mixed"
                else:
                    source = "mixed" if material.autor and material.anio_publicacion else "llm"

    missing = _missing_fields(material)
    return CitationResult(
        citation_apa=format_apa(material),
        source=source if not missing else source,
        missing_fields=missing,
    )

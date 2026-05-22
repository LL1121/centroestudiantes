from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.material import Material, MaterialStatus
from app.schemas.material import MaterialUploadResponse
from app.services.file_validation import MIME_TO_EXT, MIME_TO_TIPO, validate_file_bytes
from app.services.rag_processor import process_material_pipeline
from app.services.storage import get_storage

router = APIRouter(prefix="/materials", tags=["materials"])

_TITULO_MIN = 2
_TITULO_MAX = 255
_CARRERA_MIN = 2
_CARRERA_MAX = 120


@router.post(
    "/upload",
    response_model=MaterialUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_material(
    user: CurrentUser,
    session: SessionDep,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File()],
    titulo: Annotated[str, Form(min_length=_TITULO_MIN, max_length=_TITULO_MAX)],
    carrera: Annotated[str, Form(min_length=_CARRERA_MIN, max_length=_CARRERA_MAX)],
    descripcion: Annotated[str | None, Form(max_length=2000)] = None,
) -> MaterialUploadResponse:
    """
    Sube un material académico. Flujo estricto:
    1. Valida los primeros 4 bytes (magic numbers).
    2. Persiste el archivo en streaming sobre el RAID, calculando sha256.
    3. Deduplica por sha256 (si ya existe un material activo, se borra la copia
       recién subida y se devuelve el original).
    4. Crea el registro `Material(status=pending)` para que la Etapa 3 lo indexe.
    """
    if file.filename is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Archivo sin nombre.")

    mime_type = await validate_file_bytes(file)
    tipo_archivo = MIME_TO_TIPO[mime_type]
    ext = MIME_TO_EXT[mime_type]

    storage = get_storage()
    material_id = uuid.uuid4()
    storage_key = f"materiales/{material_id}.{ext}"

    try:
        stored = await storage.upload(file=file, key=storage_key, mime_type=mime_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "No pudimos guardar el archivo en el servidor.",
        ) from exc

    # Deduplicación: cualquier material no-fallido con el mismo hash.
    existing = await session.scalar(
        select(Material)
        .where(
            Material.sha256 == stored.sha256,
            Material.status != MaterialStatus.failed,
        )
        .limit(1)
    )
    if existing is not None:
        await storage.delete(stored.key)
        return MaterialUploadResponse(material=existing, deduplicated=True)  # type: ignore[arg-type]

    material = Material(
        id=material_id,
        titulo=titulo,
        descripcion=descripcion,
        carrera=carrera,
        storage_key=stored.key,
        tipo_archivo=tipo_archivo,
        mime_type=mime_type,
        size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        status=MaterialStatus.pending,
        uploader_id=user.id,
    )
    session.add(material)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        await storage.delete(stored.key)
        raise

    await session.refresh(material)

    # Dispara el pipeline RAG (extracción → chunks → embeddings → pgvector)
    # en background; la respuesta vuelve enseguida con el material en `pending`.
    background_tasks.add_task(process_material_pipeline, material.id)

    return MaterialUploadResponse(material=material, deduplicated=False)  # type: ignore[arg-type]

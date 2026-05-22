from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.material import MaterialStatus, TipoArchivo


class MaterialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    titulo: str
    descripcion: str | None
    autor: str | None
    carrera: str
    tipo_archivo: TipoArchivo
    mime_type: str
    size_bytes: int
    sha256: str
    status: MaterialStatus
    storage_key: str
    uploader_id: UUID | None
    created_at: datetime


class MaterialUploadResponse(BaseModel):
    """Respuesta del endpoint de subida: indica si se deduplicó o se creó nuevo."""

    material: MaterialRead
    deduplicated: bool = False

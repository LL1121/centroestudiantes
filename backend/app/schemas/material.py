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
    anio_publicacion: int | None = None
    editorial: str | None = None
    isbn: str | None = None
    ciudad_publicacion: str | None = None
    carrera: str
    tags: list[str] = []
    tipo_archivo: TipoArchivo
    mime_type: str
    size_bytes: int
    sha256: str
    status: MaterialStatus
    storage_key: str
    uploader_id: UUID | None
    created_at: datetime


class MaterialSearchRead(MaterialRead):
    """Material con metadatos de relevancia cuando proviene de una búsqueda."""

    relevance: float | None = None
    match_kind: str | None = None


class MaterialUploadResponse(BaseModel):
    """Respuesta del endpoint de subida: indica si se deduplicó o se creó nuevo."""

    material: MaterialRead
    deduplicated: bool = False


class MaterialCitationRead(BaseModel):
    citation_apa: str
    source: str
    missing_fields: list[str] = []


class MaterialBibliographyUpdate(BaseModel):
    autor: str | None = None
    anio_publicacion: int | None = None
    editorial: str | None = None
    isbn: str | None = None
    ciudad_publicacion: str | None = None

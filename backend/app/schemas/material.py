from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.material import ContentKind, MaterialStatus, TipoArchivo


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
    carrera: str | None = None
    tags: list[str] = []
    tipo_archivo: TipoArchivo
    mime_type: str
    size_bytes: int
    sha256: str
    status: MaterialStatus
    storage_key: str
    uploader_id: UUID | None
    content_kind: ContentKind | None = None
    rights_declared_at: datetime | None = None
    rights_declared_by_id: UUID | None = None
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
    """Subconjunto bibliográfico (p. ej. cita APA). Compatible con PATCH parcial."""

    autor: str | None = None
    anio_publicacion: int | None = None
    editorial: str | None = None
    isbn: str | None = None
    ciudad_publicacion: str | None = None


class MaterialUpdate(BaseModel):
    """Edición de metadata del material (sin reemplazar el archivo)."""

    titulo: str | None = Field(None, min_length=2, max_length=255)
    descripcion: str | None = Field(None, max_length=2000)
    carrera: str | None = Field(None, max_length=120)
    tags: list[str] | None = None
    autor: str | None = Field(None, max_length=255)
    anio_publicacion: int | None = None
    editorial: str | None = Field(None, max_length=255)
    isbn: str | None = Field(None, max_length=32)
    ciudad_publicacion: str | None = Field(None, max_length=120)

    @field_validator("carrera")
    @classmethod
    def _validate_carrera(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if len(value) < 2:
            raise ValueError("La carrera debe tener al menos 2 caracteres o quedar vacía.")
        return value

    @field_validator("carrera", "autor", "editorial", "isbn", "ciudad_publicacion", mode="before")
    @classmethod
    def _strip_optional_str(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return value

    @field_validator("descripcion", mode="before")
    @classmethod
    def _strip_descripcion(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return value

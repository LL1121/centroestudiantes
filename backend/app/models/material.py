from __future__ import annotations

import enum
import uuid

from sqlalchemy import BigInteger, Enum as PgEnum, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class TipoArchivo(str, enum.Enum):
    pdf = "pdf"
    epub = "epub"
    jpeg = "jpeg"
    png = "png"


class MaterialStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    active = "active"
    indexed = "indexed"  # legado pre-Etapa3; tratar como `active`
    quarantined = "quarantined"
    failed = "failed"


class Material(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "materiales"

    titulo: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    autor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    anio_publicacion: Mapped[int | None] = mapped_column(nullable=True)
    editorial: Mapped[str | None] = mapped_column(String(255), nullable=True)
    isbn: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ciudad_publicacion: Mapped[str | None] = mapped_column(String(120), nullable=True)
    carrera: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        nullable=False,
        server_default=text("'{}'::varchar(50)[]"),
    )

    storage_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    tipo_archivo: Mapped[TipoArchivo] = mapped_column(
        PgEnum(TipoArchivo, name="tipo_archivo"), nullable=False
    )
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    status: Mapped[MaterialStatus] = mapped_column(
        PgEnum(MaterialStatus, name="material_status"),
        default=MaterialStatus.pending,
        nullable=False,
    )

    uploader_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

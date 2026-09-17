from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Voto(Base, UUIDMixin, TimestampMixin):
    """Un voto por estudiante: UNIQUE(dni) + UNIQUE(nombre normalizado)."""

    __tablename__ = "votos"

    profesor_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("profesores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre_apellido: Mapped[str] = mapped_column(String(255), nullable=False)
    carrera: Mapped[str] = mapped_column(String(120), nullable=False)
    dni: Mapped[str] = mapped_column(String(8), nullable=False, unique=True, index=True)

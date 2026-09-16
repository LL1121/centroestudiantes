from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Profesor(Base, UUIDMixin, TimestampMixin):
    """Docente candidato en la votación Mejor Profesor."""

    __tablename__ = "profesores"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

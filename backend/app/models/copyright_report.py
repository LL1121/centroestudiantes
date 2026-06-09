from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum as PgEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class CopyrightReportReason(str, enum.Enum):
    sin_autorizacion = "sin_autorizacion"
    obra_comercial = "obra_comercial"
    datos_personales = "datos_personales"
    otro = "otro"


class CopyrightReportStatus(str, enum.Enum):
    pending = "pending"
    dismissed = "dismissed"
    upheld = "upheld"


class CopyrightReport(Base, UUIDMixin, TimestampMixin):
    """Reclamo de derechos de autor sobre un material de la biblioteca."""

    __tablename__ = "copyright_reports"

    material_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("materiales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reporter_email: Mapped[str] = mapped_column(String(255), nullable=False)
    reporter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[CopyrightReportReason] = mapped_column(
        PgEnum(CopyrightReportReason, name="copyright_report_reason"),
        nullable=False,
    )
    details: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[CopyrightReportStatus] = mapped_column(
        PgEnum(CopyrightReportStatus, name="copyright_report_status"),
        default=CopyrightReportStatus.pending,
        nullable=False,
        index=True,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )

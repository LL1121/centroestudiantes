"""copyright: content_kind, declaración de derechos, reclamos

Revision ID: 0009_copyright
Revises: 0008_twofa
Create Date: 2026-06-09
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_copyright"
down_revision: str | Sequence[str] | None = "0008_twofa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

content_kind = postgresql.ENUM(
    "apunte_propio",
    "material_docente",
    "dominio_publico",
    "licencia_abierta",
    name="content_kind",
    create_type=False,
)
report_reason = postgresql.ENUM(
    "sin_autorizacion",
    "obra_comercial",
    "datos_personales",
    "otro",
    name="copyright_report_reason",
    create_type=False,
)
report_status = postgresql.ENUM(
    "pending",
    "dismissed",
    "upheld",
    name="copyright_report_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE content_kind AS ENUM (
                'apunte_propio', 'material_docente', 'dominio_publico', 'licencia_abierta'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE copyright_report_reason AS ENUM (
                'sin_autorizacion', 'obra_comercial', 'datos_personales', 'otro'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE copyright_report_status AS ENUM (
                'pending', 'dismissed', 'upheld'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    op.add_column(
        "materiales",
        sa.Column("content_kind", content_kind, nullable=True),
    )
    op.add_column(
        "materiales",
        sa.Column("rights_declared_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "materiales",
        sa.Column("rights_declared_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_materiales_rights_declared_by",
        "materiales",
        "usuarios",
        ["rights_declared_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "copyright_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "material_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("materiales.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reporter_email", sa.String(255), nullable=False),
        sa.Column("reporter_name", sa.String(255), nullable=True),
        sa.Column("reason", report_reason, nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column(
            "status",
            report_status,
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "reviewed_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_copyright_reports_material_id", "copyright_reports", ["material_id"])
    op.create_index("ix_copyright_reports_status", "copyright_reports", ["status"])


def downgrade() -> None:
    op.drop_index("ix_copyright_reports_status", table_name="copyright_reports")
    op.drop_index("ix_copyright_reports_material_id", table_name="copyright_reports")
    op.drop_table("copyright_reports")
    op.drop_constraint("fk_materiales_rights_declared_by", "materiales", type_="foreignkey")
    op.drop_column("materiales", "rights_declared_by_id")
    op.drop_column("materiales", "rights_declared_at")
    op.drop_column("materiales", "content_kind")
    op.execute("DROP TYPE IF EXISTS copyright_report_status")
    op.execute("DROP TYPE IF EXISTS copyright_report_reason")
    op.execute("DROP TYPE IF EXISTS content_kind")

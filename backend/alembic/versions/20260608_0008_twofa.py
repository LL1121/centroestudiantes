"""twofa: columnas en usuarios, backup codes, auth_token twofa_email

Revision ID: 0008_twofa
Revises: 0007_material_carrera_nullable
Create Date: 2026-06-08
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_twofa"
down_revision: str | Sequence[str] | None = "0007_material_carrera_nullable"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("twofa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("usuarios", sa.Column("twofa_secret", sa.String(64), nullable=True))
    op.alter_column("usuarios", "twofa_enabled", server_default=None)

    op.execute("ALTER TYPE auth_token_kind ADD VALUE IF NOT EXISTS 'twofa_email'")

    op.create_table(
        "twofa_backup_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("twofa_backup_codes")
    op.drop_column("usuarios", "twofa_secret")
    op.drop_column("usuarios", "twofa_enabled")

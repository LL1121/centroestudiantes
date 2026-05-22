"""extend material_status enum (processing, active)

Revision ID: 0002_status_extend
Revises: 0001_initial
Create Date: 2026-05-22
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0002_status_extend"
down_revision: str | Sequence[str] | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE material_status ADD VALUE IF NOT EXISTS 'processing'")
        op.execute("ALTER TYPE material_status ADD VALUE IF NOT EXISTS 'active'")


def downgrade() -> None:
    # PostgreSQL no permite quitar valores de un ENUM. No-op intencional.
    pass

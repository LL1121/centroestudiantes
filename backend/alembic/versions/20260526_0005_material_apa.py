"""APA bibliography fields on materiales

Revision ID: 0005_material_apa
Revises: 0004_pg_trgm
Create Date: 2026-05-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_material_apa"
down_revision: str | Sequence[str] | None = "0004_pg_trgm"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("materiales", sa.Column("anio_publicacion", sa.Integer(), nullable=True))
    op.add_column("materiales", sa.Column("editorial", sa.String(255), nullable=True))
    op.add_column("materiales", sa.Column("isbn", sa.String(32), nullable=True))
    op.add_column("materiales", sa.Column("ciudad_publicacion", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("materiales", "ciudad_publicacion")
    op.drop_column("materiales", "isbn")
    op.drop_column("materiales", "editorial")
    op.drop_column("materiales", "anio_publicacion")

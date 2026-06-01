"""pg_trgm indexes for fuzzy search

Revision ID: 0004_pg_trgm
Revises: 0003_material_tags
Create Date: 2026-05-26
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0004_pg_trgm"
down_revision: str | Sequence[str] | None = "0003_material_tags"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_materiales_titulo_trgm "
        "ON materiales USING GIN (titulo gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_materiales_descripcion_trgm "
        "ON materiales USING GIN (descripcion gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_materiales_carrera_trgm "
        "ON materiales USING GIN (carrera gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_materiales_carrera_trgm")
    op.execute("DROP INDEX IF EXISTS ix_materiales_descripcion_trgm")
    op.execute("DROP INDEX IF EXISTS ix_materiales_titulo_trgm")

"""material tags column

Revision ID: 0003_material_tags
Revises: 0002_status_extend
Create Date: 2026-05-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_material_tags"
down_revision: str | Sequence[str] | None = "0002_status_extend"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "materiales",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_materiales_tags_gin ON materiales USING GIN (tags)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_materiales_tags_gin")
    op.drop_column("materiales", "tags")

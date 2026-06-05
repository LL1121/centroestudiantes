"""material: carrera opcional en materiales y embeddings

Revision ID: 0007_material_carrera_nullable
Revises: 0006_security_moderation
Create Date: 2026-06-05
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_material_carrera_nullable"
down_revision: str | Sequence[str] | None = "0006_security_moderation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("materiales", "carrera", existing_type=sa.String(120), nullable=True)
    op.alter_column("embeddings", "carrera", existing_type=sa.String(120), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE materiales SET carrera = 'General' WHERE carrera IS NULL")
    op.execute("UPDATE embeddings SET carrera = 'General' WHERE carrera IS NULL")
    op.alter_column("materiales", "carrera", existing_type=sa.String(120), nullable=False)
    op.alter_column("embeddings", "carrera", existing_type=sa.String(120), nullable=False)

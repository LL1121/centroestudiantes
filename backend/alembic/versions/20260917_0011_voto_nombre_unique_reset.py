"""voting: unique nombre normalizado + reset votos de prueba

Revision ID: 0011_voto_nombre
Revises: 0010_voting
Create Date: 2026-09-17
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0011_voto_nombre"
down_revision: str | Sequence[str] | None = "0010_voting"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Limpia votos de prueba; los docentes del seed se mantienen.
    op.execute("TRUNCATE TABLE votos RESTART IDENTITY CASCADE")

    # Unique por nombre normalizado (lower + trim + espacios colapsados).
    op.execute(
        """
        CREATE UNIQUE INDEX uq_votos_nombre_norm
        ON votos (
            (lower(regexp_replace(btrim(nombre_apellido), '\\s+', ' ', 'g')))
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_votos_nombre_norm")

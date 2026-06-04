"""security: refresh tokens, email verify, quarantined status

Revision ID: 0006_security_moderation
Revises: 0005_material_apa
Create Date: 2026-06-04
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_security_moderation"
down_revision: str | Sequence[str] | None = "0005_material_apa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("usuarios", "email_verified", server_default=None)

    auth_token_kind = postgresql.ENUM(
        "email_verify",
        "password_reset",
        name="auth_token_kind",
    )
    auth_token_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "auth_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", postgresql.ENUM(name="auth_token_kind", create_type=False), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("jti", sa.String(36), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("replaced_by", sa.String(36), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.execute("ALTER TYPE material_status ADD VALUE IF NOT EXISTS 'quarantined'")


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("auth_tokens")
    op.drop_column("usuarios", "email_verified")
    op.execute("DROP TYPE IF EXISTS auth_token_kind")

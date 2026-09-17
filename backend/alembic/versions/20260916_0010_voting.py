"""voting: profesores, votos (dni unique) + seed

Revision ID: 0010_voting
Revises: 0009_copyright
Create Date: 2026-09-16
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_voting"
down_revision: str | Sequence[str] | None = "0009_copyright"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Docentes IES (Docentes.pdf) — 64 nombres únicos, formato "Apellido, Nombre".
PROFESORES_SEED: list[str] = [
    "Alaimo, Andrea",
    "Alcala, Christian",
    "Alvarez, Leonardo",
    "Alvarez, Patricia",
    "Alvarez, Paulo",
    "Ayala, Ivana",
    "Baigorria, Marisol",
    "Barrera, Cecilia",
    "Barrio, Martin",
    "Bavaresco, German",
    "Beron, Johana",
    "Bisacco, Alejandro",
    "Bondino, Valeria",
    "Bouille, Vanessa",
    "Bustamante, Gustavo",
    "Cabaña, Gustavo",
    "Cabello, Daniel",
    "Carrizo, Jose Luis",
    "Castilla, Maria Jose",
    "Castilla, Nelson",
    "Castro, Carlos",
    "Coria, Miguel",
    "Coronel, Victoria",
    "Curiel, Ricardo",
    "Fernandez, Ricardo",
    "Ferrada, Lourdes",
    "Gajardo, Oscar",
    "Gallardo, Marcos",
    "Garcia, Marcelo",
    "Gasques, Martin",
    "Jaque, Daiana",
    "Jaque, Flavia",
    "Lineros, Eliana",
    "Martinez, Claudia",
    "Martinez, Facundo",
    "Mc Queen, Lourdes",
    "Mena, Nilda",
    "Milarck, Alejandra",
    "Milicevic, Mariela",
    "Molina, Mariela",
    "Molina, Paola",
    "Monzon, Fabian",
    "Morales, Veronica",
    "Negreira, Gabriel",
    "Olate, Cecilia",
    "Olate, Matias",
    "Ortega, Cecilia",
    "Palomeque, Gonzalo",
    "Pampillon, Cristina",
    "Perez, Sofia",
    "Quiroz, Julio",
    "Reyes, Ana",
    "Rivero, Hersilia",
    "Rojo, Paola",
    "Sambataro, Ana",
    "Sanchez, Indiana",
    "Sandmeier, Carolina",
    "Saponara, Fiona",
    "Silveira, Andrea",
    "Soria, Pablo",
    "Suppicich, Lorena",
    "Vazquez, Fanny",
    "Von Zedtwitz, Daniel",
    "Yarrach, Edgardo",
]


def upgrade() -> None:
    op.create_table(
        "profesores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
    op.create_index("ix_profesores_nombre", "profesores", ["nombre"])
    op.create_index("ix_profesores_activo", "profesores", ["activo"])

    op.create_table(
        "votos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("profesor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre_apellido", sa.String(length=255), nullable=False),
        sa.Column("carrera", sa.String(length=120), nullable=False),
        sa.Column("dni", sa.String(length=8), nullable=False),
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
        sa.ForeignKeyConstraint(["profesor_id"], ["profesores.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("dni", name="uq_votos_dni"),
    )
    op.create_index("ix_votos_profesor_id", "votos", ["profesor_id"])

    profesores = sa.table(
        "profesores",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("nombre", sa.String()),
        sa.column("activo", sa.Boolean()),
    )
    op.bulk_insert(
        profesores,
        [
            {"id": uuid.uuid4(), "nombre": nombre, "activo": True}
            for nombre in PROFESORES_SEED
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_votos_profesor_id", table_name="votos")
    op.drop_table("votos")
    op.drop_index("ix_profesores_activo", table_name="profesores")
    op.drop_index("ix_profesores_nombre", table_name="profesores")
    op.drop_table("profesores")

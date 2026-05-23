"""Crea (o promueve) un usuario admin de la Biblioteca Digital.

Modo de uso:

    # Local
    python -m app.scripts.create_admin --email admin@ies.edu.ar --full-name "Admin"

    # Dentro del contenedor en producción
    docker compose exec backend python -m app.scripts.create_admin \\
        --email admin@ies.edu.ar --full-name "Admin"

Si no se pasan ``--password`` ni ``ADMIN_PASSWORD`` por env, el script
pide la contraseña por consola (sin eco). Si ya existe un usuario con
ese email, se promueve a ``admin`` y se actualiza la contraseña sólo si
se pasa ``--force-password`` o si la cuenta no estaba en estado activo.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import re
import sys
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models.user import User, UserRole

try:
    import asyncpg
except ImportError:  # pragma: no cover
    asyncpg = None  # type: ignore[assignment]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 8


@dataclass(slots=True)
class AdminInput:
    email: str
    full_name: str
    password: str
    force_password: bool


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="create-admin",
        description="Crea o promueve un usuario admin de la Biblioteca Digital.",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL"),
        help="Email del admin (también ADMIN_EMAIL).",
    )
    parser.add_argument(
        "--full-name",
        default=os.getenv("ADMIN_FULL_NAME"),
        help="Nombre completo (también ADMIN_FULL_NAME).",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("ADMIN_PASSWORD"),
        help=(
            "Contraseña (también ADMIN_PASSWORD). Si no se pasa, se "
            "solicita interactivamente."
        ),
    )
    parser.add_argument(
        "--force-password",
        action="store_true",
        help="Pisar la contraseña aunque el usuario ya exista.",
    )
    return parser.parse_args(argv)


def _prompt_password(confirm: bool = True) -> str:
    if not sys.stdin.isatty():
        raise SystemExit(
            "No se pasó --password ni ADMIN_PASSWORD y stdin no es "
            "interactivo. Abortando."
        )
    while True:
        pwd = getpass.getpass("Password admin: ")
        if len(pwd) < MIN_PASSWORD_LEN:
            print(f"  La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres.")
            continue
        if confirm:
            again = getpass.getpass("Repetir password: ")
            if pwd != again:
                print("  No coinciden. Probá de nuevo.")
                continue
        return pwd


def _collect_input(args: argparse.Namespace) -> AdminInput:
    email = (args.email or "").strip().lower()
    if not email:
        if not sys.stdin.isatty():
            raise SystemExit("Falta --email / ADMIN_EMAIL.")
        email = input("Email admin: ").strip().lower()
    if not EMAIL_RE.match(email):
        raise SystemExit(f"Email inválido: {email!r}")

    full_name = (args.full_name or "").strip()
    if not full_name:
        if not sys.stdin.isatty():
            raise SystemExit("Falta --full-name / ADMIN_FULL_NAME.")
        full_name = input("Nombre completo: ").strip()
    if not full_name:
        raise SystemExit("Nombre completo no puede estar vacío.")

    password = args.password or ""
    if not password:
        password = _prompt_password()
    elif len(password) < MIN_PASSWORD_LEN:
        raise SystemExit(
            f"La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres."
        )

    return AdminInput(
        email=email,
        full_name=full_name,
        password=password,
        force_password=bool(args.force_password),
    )


async def _upsert_admin(data: AdminInput) -> tuple[str, User]:
    """Crea o promueve a admin. Devuelve ('created'|'updated', user)."""
    async with SessionFactory() as session:
        existing = (
            await session.execute(select(User).where(User.email == data.email))
        ).scalar_one_or_none()

        if existing is None:
            user = User(
                email=data.email,
                full_name=data.full_name,
                password_hash=hash_password(data.password),
                role=UserRole.admin,
                is_active=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return "created", user

        existing.role = UserRole.admin
        existing.is_active = True
        existing.full_name = data.full_name or existing.full_name
        if data.force_password or not existing.password_hash:
            existing.password_hash = hash_password(data.password)
        await session.commit()
        await session.refresh(existing)
        return "updated", existing


def _print_db_target() -> None:
    settings = get_settings()
    url = make_url(settings.resolved_database_url)
    print(
        f"DB → {url.username}@{url.host}:{url.port}/{url.database} "
        f"(env={settings.app_env})"
    )


def _db_password_help() -> None:
    print(
        "\nError: la contraseña de Postgres no coincide con POSTGRES_PASSWORD del .env.\n"
        "\nEsto pasa si el volumen se creó con otra contraseña y después cambiaste .env.\n"
        "\nOpciones:\n"
        "  1) Sincronizar sin borrar datos (desde la raíz del repo):\n"
        "       chmod +x scripts/sync-postgres-password.sh\n"
        "       ./scripts/sync-postgres-password.sh\n"
        "       docker compose up -d --force-recreate backend\n"
        "\n"
        "  2) Recrear volumen (BORRA la base):\n"
        "       docker compose down -v && docker compose up -d\n"
        "\n"
        "Verificá que exista .env en la raíz con el mismo POSTGRES_PASSWORD "
        "que usaste al levantar `db`.\n",
        file=sys.stderr,
    )


async def _run(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    data = _collect_input(args)
    _print_db_target()

    try:
        action, user = await _upsert_admin(data)
    except Exception as exc:
        if asyncpg is not None and isinstance(exc, asyncpg.exceptions.InvalidPasswordError):
            _db_password_help()
            return 1
        raise
    finally:
        await engine.dispose()

    verb = "Creado" if action == "created" else "Actualizado"
    print(f"{verb} admin → {user.email} (id={user.id}, role={user.role.value}).")
    if action == "updated" and not data.force_password:
        print(
            "  Tip: pasá --force-password para resetear el password del "
            "usuario existente."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    return asyncio.run(_run(argv))


if __name__ == "__main__":
    raise SystemExit(main())

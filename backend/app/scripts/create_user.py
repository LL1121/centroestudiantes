"""Crea un usuario común (rol ``alumno`` por defecto) en la Biblioteca.

Modo de uso:

    # Local
    python -m app.scripts.create_user --email juan@ies.edu.ar --full-name "Juan"

    # Dentro del contenedor en producción
    docker compose exec backend python -m app.scripts.create_user \\
        --email juan@ies.edu.ar --full-name "Juan"

    # Especificar rol (alumno | moderador). Para 'admin' usá create-admin.
    python -m app.scripts.create_user \\
        --email mod@ies.edu.ar --full-name "Mod" --role moderador

Si no se pasan ``--password`` ni ``USER_PASSWORD`` por env, el script pide
la contraseña por consola (sin eco). Si el usuario ya existe, **no** lo
modifica salvo que se pase ``--force-password`` (resetea password) o
``--allow-role-update`` (cambia rol y reactiva la cuenta).
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
DEFAULT_ROLE = UserRole.alumno
ALLOWED_ROLES = {UserRole.alumno.value, UserRole.moderador.value}


@dataclass(slots=True)
class UserInput:
    email: str
    full_name: str
    password: str
    role: UserRole
    force_password: bool
    allow_role_update: bool


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="create-user",
        description="Crea un usuario común (alumno/moderador) en la Biblioteca Digital.",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("USER_EMAIL"),
        help="Email del usuario (también USER_EMAIL).",
    )
    parser.add_argument(
        "--full-name",
        default=os.getenv("USER_FULL_NAME"),
        help="Nombre completo (también USER_FULL_NAME).",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("USER_PASSWORD"),
        help=(
            "Contraseña (también USER_PASSWORD). Si no se pasa, se "
            "solicita interactivamente."
        ),
    )
    parser.add_argument(
        "--role",
        default=os.getenv("USER_ROLE", DEFAULT_ROLE.value),
        choices=sorted(ALLOWED_ROLES),
        help=(
            f"Rol del usuario ({'/'.join(sorted(ALLOWED_ROLES))}). "
            f"Default: {DEFAULT_ROLE.value}. Para crear admins, usá "
            "`create-admin`."
        ),
    )
    parser.add_argument(
        "--force-password",
        action="store_true",
        help="Pisar la contraseña aunque el usuario ya exista.",
    )
    parser.add_argument(
        "--allow-role-update",
        action="store_true",
        help=(
            "Si el usuario ya existe, actualizar rol/estado activo. "
            "Sin este flag, conserva los valores actuales."
        ),
    )
    return parser.parse_args(argv)


def _prompt_password(confirm: bool = True) -> str:
    if not sys.stdin.isatty():
        raise SystemExit(
            "No se pasó --password ni USER_PASSWORD y stdin no es "
            "interactivo. Abortando."
        )
    while True:
        pwd = getpass.getpass("Password: ")
        if len(pwd) < MIN_PASSWORD_LEN:
            print(f"  La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres.")
            continue
        if confirm:
            again = getpass.getpass("Repetir password: ")
            if pwd != again:
                print("  No coinciden. Probá de nuevo.")
                continue
        return pwd


def _collect_input(args: argparse.Namespace) -> UserInput:
    email = (args.email or "").strip().lower()
    if not email:
        if not sys.stdin.isatty():
            raise SystemExit("Falta --email / USER_EMAIL.")
        email = input("Email: ").strip().lower()
    if not EMAIL_RE.match(email):
        raise SystemExit(f"Email inválido: {email!r}")

    full_name = (args.full_name or "").strip()
    if not full_name:
        if not sys.stdin.isatty():
            raise SystemExit("Falta --full-name / USER_FULL_NAME.")
        full_name = input("Nombre completo: ").strip()
    if not full_name:
        raise SystemExit("Nombre completo no puede estar vacío.")

    role_value = (args.role or DEFAULT_ROLE.value).strip().lower()
    if role_value not in ALLOWED_ROLES:
        raise SystemExit(
            f"Rol inválido: {role_value!r}. Permitidos: "
            f"{', '.join(sorted(ALLOWED_ROLES))}. Para admin usá create-admin."
        )
    role = UserRole(role_value)

    password = args.password or ""
    if not password:
        password = _prompt_password()
    elif len(password) < MIN_PASSWORD_LEN:
        raise SystemExit(
            f"La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres."
        )

    return UserInput(
        email=email,
        full_name=full_name,
        password=password,
        role=role,
        force_password=bool(args.force_password),
        allow_role_update=bool(args.allow_role_update),
    )


async def _upsert_user(data: UserInput) -> tuple[str, User]:
    """Crea o actualiza el usuario. Devuelve ('created'|'updated'|'skipped', user)."""
    async with SessionFactory() as session:
        existing = (
            await session.execute(select(User).where(User.email == data.email))
        ).scalar_one_or_none()

        if existing is None:
            user = User(
                email=data.email,
                full_name=data.full_name,
                password_hash=hash_password(data.password),
                role=data.role,
                is_active=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return "created", user

        changed = False
        if data.allow_role_update:
            if existing.role != data.role:
                existing.role = data.role
                changed = True
            if not existing.is_active:
                existing.is_active = True
                changed = True
        if data.force_password:
            existing.password_hash = hash_password(data.password)
            changed = True
        if data.full_name and data.full_name != existing.full_name and (
            data.allow_role_update or data.force_password
        ):
            existing.full_name = data.full_name
            changed = True

        if not changed:
            return "skipped", existing

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
        "Mirá la sección de troubleshooting del README (sync-postgres-password.sh).\n",
        file=sys.stderr,
    )


async def _run(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    data = _collect_input(args)
    _print_db_target()

    try:
        action, user = await _upsert_user(data)
    except Exception as exc:
        if asyncpg is not None and isinstance(exc, asyncpg.exceptions.InvalidPasswordError):
            _db_password_help()
            return 1
        raise
    finally:
        await engine.dispose()

    verb = {
        "created": "Creado",
        "updated": "Actualizado",
        "skipped": "Sin cambios (ya existía)",
    }[action]
    print(f"{verb} → {user.email} (id={user.id}, role={user.role.value}, activo={user.is_active}).")

    if action == "skipped":
        print(
            "  Tip: el usuario ya existía. Usá --force-password para resetear "
            "su contraseña o --allow-role-update para cambiar rol/estado."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    return asyncio.run(_run(argv))


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import hashlib
import io
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pyotp
import qrcode
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.auth_token import AuthToken, AuthTokenKind
from app.models.twofa_backup_code import TwofaBackupCode
from app.models.user import User
from app.services.auth_email import _send_mail

BACKUP_CODE_COUNT = 10


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _hash_backup(code: str) -> str:
    return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()


def generate_backup_codes() -> list[str]:
    return [secrets.token_hex(4).upper() for _ in range(BACKUP_CODE_COUNT)]


def build_setup_payload(*, user: User) -> tuple[str, str, str]:
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="Biblioteca IES 9018")
    img = qrcode.make(uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    import base64

    data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return secret, uri, data_url


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)


async def store_pending_secret(session: AsyncSession, user: User, secret: str) -> None:
    user.twofa_secret = secret
    user.twofa_enabled = False
    await session.commit()


async def enable_twofa(session: AsyncSession, user: User, code: str) -> list[str]:
    if not user.twofa_secret:
        raise ValueError("Primero ejecutá /2fa/setup")
    if not verify_totp(user.twofa_secret, code):
        raise ValueError("Código TOTP inválido")

    await session.execute(delete(TwofaBackupCode).where(TwofaBackupCode.user_id == user.id))
    plain_codes = generate_backup_codes()
    for plain in plain_codes:
        session.add(TwofaBackupCode(user_id=user.id, code_hash=_hash_backup(plain)))

    user.twofa_enabled = True
    await session.commit()
    return plain_codes


async def disable_twofa(session: AsyncSession, user: User, code: str) -> None:
    if not user.twofa_enabled or not user.twofa_secret:
        raise ValueError("2FA no está activo")

    ok = verify_totp(user.twofa_secret, code)
    if not ok:
        ok = await redeem_backup_code(session, user.id, code)
    if not ok:
        raise ValueError("Código inválido")

    user.twofa_enabled = False
    user.twofa_secret = None
    await session.execute(delete(TwofaBackupCode).where(TwofaBackupCode.user_id == user.id))
    await session.commit()


async def redeem_backup_code(session: AsyncSession, user_id: UUID, code: str) -> bool:
    code_hash = _hash_backup(code)
    record = await session.scalar(
        select(TwofaBackupCode).where(
            TwofaBackupCode.user_id == user_id,
            TwofaBackupCode.code_hash == code_hash,
            TwofaBackupCode.used_at.is_(None),
        )
    )
    if record is None:
        return False
    record.used_at = datetime.now(tz=UTC)
    await session.commit()
    return True


async def create_email_otp(session: AsyncSession, user: User) -> str:
    raw = f"{secrets.randbelow(1_000_000):06d}"
    settings = get_settings()
    session.add(
        AuthToken(
            user_id=user.id,
            kind=AuthTokenKind.twofa_email,
            token_hash=_hash_token(raw),
            expires_at=datetime.now(tz=UTC)
            + timedelta(minutes=settings.twofa_email_otp_expire_minutes),
        )
    )
    await session.commit()
    _send_mail(
        to=user.email,
        subject="Código de verificación — Biblioteca Digital",
        body=(
            f"Hola {user.full_name},\n\n"
            f"Tu código de verificación es: {raw}\n\n"
            f"Expira en {settings.twofa_email_otp_expire_minutes} minutos."
        ),
    )
    return raw


async def verify_email_otp(session: AsyncSession, user_id: UUID, code: str) -> bool:
    token_hash = _hash_token(code.strip())
    record = await session.scalar(
        select(AuthToken).where(
            AuthToken.user_id == user_id,
            AuthToken.kind == AuthTokenKind.twofa_email,
            AuthToken.token_hash == token_hash,
            AuthToken.used_at.is_(None),
        )
    )
    if record is None or record.expires_at < datetime.now(tz=UTC):
        return False
    record.used_at = datetime.now(tz=UTC)
    await session.commit()
    return True


async def verify_2fa_code(
    session: AsyncSession,
    user: User,
    *,
    code: str,
    method: str,
) -> bool:
    if method == "totp":
        return bool(user.twofa_secret and verify_totp(user.twofa_secret, code))
    if method == "email":
        return await verify_email_otp(session, user.id, code)
    if method == "backup":
        return await redeem_backup_code(session, user.id, code)
    return False

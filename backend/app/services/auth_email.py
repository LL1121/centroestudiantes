from __future__ import annotations

import hashlib
import logging
import secrets
import smtplib
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.auth_token import AuthToken, AuthTokenKind
from app.models.user import User

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    s = get_settings()
    return bool(s.smtp_host and s.smtp_from and s.public_app_url)


def _send_mail(*, to: str, subject: str, body: str) -> bool:
    settings = get_settings()
    if not _smtp_configured():
        logger.info("SMTP no configurado; email no enviado a %s (%s)", to, subject)
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or ""
    msg["To"] = to
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        return True
    except Exception:
        logger.exception("Fallo al enviar email a %s", to)
        return False


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def create_verification_token(session: AsyncSession, user: User) -> str:
    raw = secrets.token_urlsafe(32)
    settings = get_settings()
    session.add(
        AuthToken(
            user_id=user.id,
            kind=AuthTokenKind.email_verify,
            token_hash=_hash_token(raw),
            expires_at=datetime.now(tz=UTC) + timedelta(hours=settings.email_verify_expire_hours),
        )
    )
    await session.commit()
    return raw


async def send_verification_email(session: AsyncSession, user: User) -> None:
    if user.email_verified:
        return
    raw = await create_verification_token(session, user)
    settings = get_settings()
    link = f"{settings.public_app_url.rstrip('/')}/verificar-email?token={raw}"
    _send_mail(
        to=user.email,
        subject="Verificá tu cuenta — Biblioteca Digital",
        body=f"Hola {user.full_name},\n\nConfirmá tu email:\n{link}\n\nEl enlace expira en 24 horas.",
    )


async def redeem_verification_token(session: AsyncSession, raw: str) -> bool:
    token_hash = _hash_token(raw)
    record = await session.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.kind == AuthTokenKind.email_verify,
            AuthToken.used_at.is_(None),
        )
    )
    if record is None or record.expires_at < datetime.now(tz=UTC):
        return False
    user = await session.get(User, record.user_id)
    if user is None:
        return False
    user.email_verified = True
    record.used_at = datetime.now(tz=UTC)
    await session.commit()
    return True


async def create_password_reset_token(session: AsyncSession, user: User) -> str:
    raw = secrets.token_urlsafe(32)
    settings = get_settings()
    session.add(
        AuthToken(
            user_id=user.id,
            kind=AuthTokenKind.password_reset,
            token_hash=_hash_token(raw),
            expires_at=datetime.now(tz=UTC) + timedelta(hours=settings.password_reset_expire_hours),
        )
    )
    await session.commit()
    return raw


async def send_password_reset_email(user: User, raw: str) -> None:
    settings = get_settings()
    link = f"{settings.public_app_url.rstrip('/')}/restablecer?token={raw}"
    _send_mail(
        to=user.email,
        subject="Restablecer contraseña — Biblioteca Digital",
        body=f"Hola {user.full_name},\n\nRestablecé tu contraseña:\n{link}\n\nSi no pediste esto, ignorá el mensaje.",
    )


async def redeem_password_reset(session: AsyncSession, raw: str, new_password: str) -> bool:
    token_hash = _hash_token(raw)
    record = await session.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.kind == AuthTokenKind.password_reset,
            AuthToken.used_at.is_(None),
        )
    )
    if record is None or record.expires_at < datetime.now(tz=UTC):
        return False
    user = await session.get(User, record.user_id)
    if user is None:
        return False
    user.password_hash = hash_password(new_password)
    record.used_at = datetime.now(tz=UTC)
    await session.commit()
    return True

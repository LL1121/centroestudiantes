from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_token, decode_token
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.token import TokenPair


async def issue_token_pair(session: AsyncSession, user: User) -> TokenPair:
    """Emite access + refresh y persiste el jti del refresh."""
    jti = str(uuid.uuid4())
    settings = get_settings()
    expires_at = datetime.now(tz=UTC) + timedelta(days=settings.refresh_token_expire_days)

    session.add(
        RefreshToken(
            jti=jti,
            user_id=user.id,
            revoked=False,
            expires_at=expires_at,
            created_at=datetime.now(tz=UTC),
        )
    )
    await session.commit()

    return TokenPair(
        access_token=create_token(user_id=user.id, role=user.role.value, token_type="access"),
        refresh_token=create_token(
            user_id=user.id,
            role=user.role.value,
            token_type="refresh",
            jti=jti,
        ),
    )


async def rotate_refresh(session: AsyncSession, raw_refresh: str) -> TokenPair:
    """Rota refresh: invalida el anterior y emite par nuevo. Detecta reuse."""
    try:
        payload = decode_token(raw_refresh, expected_type="refresh")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh expirado") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh inválido") from exc

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh sin identificador")

    record = await session.get(RefreshToken, jti)
    if record is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh desconocido")

    if record.revoked:
        # Posible robo de token: revocar toda la cadena del usuario.
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == record.user_id)
            .values(revoked=True)
        )
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh reutilizado; sesión invalidada")

    if record.expires_at < datetime.now(tz=UTC):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh expirado")

    user = await session.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario inválido")

    new_jti = str(uuid.uuid4())
    settings = get_settings()
    new_expires = datetime.now(tz=UTC) + timedelta(days=settings.refresh_token_expire_days)

    record.revoked = True
    record.replaced_by = new_jti
    session.add(
        RefreshToken(
            jti=new_jti,
            user_id=user.id,
            revoked=False,
            expires_at=new_expires,
            created_at=datetime.now(tz=UTC),
        )
    )
    await session.commit()

    return TokenPair(
        access_token=create_token(user_id=user.id, role=user.role.value, token_type="access"),
        refresh_token=create_token(
            user_id=user.id,
            role=user.role.value,
            token_type="refresh",
            jti=new_jti,
        ),
    )


async def revoke_refresh_jti(session: AsyncSession, jti: str) -> None:
    record = await session.get(RefreshToken, jti)
    if record is not None:
        record.revoked = True
        await session.commit()


async def revoke_refresh_raw(session: AsyncSession, raw_refresh: str) -> None:
    try:
        payload = decode_token(raw_refresh, expected_type="refresh")
    except jwt.InvalidTokenError:
        return
    jti = payload.get("jti")
    if jti:
        await revoke_refresh_jti(session, jti)

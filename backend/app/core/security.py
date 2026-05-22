from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal, TypedDict
from uuid import UUID

import bcrypt
import jwt

from app.core.config import get_settings

TokenType = Literal["access", "refresh"]


class TokenPayload(TypedDict):
    sub: str
    role: str
    type: TokenType
    iat: int
    exp: int


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _expiry(token_type: TokenType) -> datetime:
    settings = get_settings()
    now = datetime.now(tz=UTC)
    if token_type == "access":
        return now + timedelta(minutes=settings.access_token_expire_minutes)
    return now + timedelta(days=settings.refresh_token_expire_days)


def create_token(*, user_id: UUID, role: str, token_type: TokenType) -> str:
    settings = get_settings()
    now = datetime.now(tz=UTC)
    payload: TokenPayload = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(_expiry(token_type).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType) -> TokenPayload:
    settings = get_settings()
    decoded = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if decoded.get("type") != expected_type:
        raise jwt.InvalidTokenError("Tipo de token incorrecto")
    return decoded  # type: ignore[return-value]

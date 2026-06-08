from __future__ import annotations

import jwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import decode_token


def chat_rate_limit_key(request: Request) -> str:
    """Clave por usuario (JWT sub) para limitar consultas al asistente."""
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token, expected_type="access")
            return f"chat:{payload['sub']}"
        except jwt.InvalidTokenError:
            pass
    return f"chat:ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_remote_address)

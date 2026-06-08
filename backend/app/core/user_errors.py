"""Mensajes seguros para el usuario final (sin filtrar errores técnicos)."""

from __future__ import annotations

import re

import httpx

_TECHNICAL = re.compile(
    r"traceback|httpx|httpstatus|exception|for url '|client error '\d|"
    r"server error '\d|\.py:\d|sqlalchemy|asyncpg|runtimeerror",
    re.IGNORECASE,
)

_DEFAULT = "No pudimos completar la acción. Intentá de nuevo."


def user_message(detail: object | None, *, fallback: str = _DEFAULT) -> str:
    """Devuelve `detail` solo si parece un mensaje corto y no técnico."""
    if not isinstance(detail, str):
        return fallback
    text = detail.strip()
    if not text or len(text) > 280 or _TECHNICAL.search(text):
        return fallback
    return text


def embedding_error_message(exc: BaseException) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code == 429:
            return (
                "El servicio de búsqueda está ocupado. "
                "Esperá un momento e intentá de nuevo."
            )
        if code in (401, 403):
            return (
                "No pudimos conectar con el servicio de búsqueda. "
                "Contactá al administrador."
            )
        if code >= 500:
            return "El servicio de búsqueda no respondió. Intentá de nuevo en un momento."
    return "No pudimos procesar tu consulta. Intentá de nuevo en un momento."


def llm_error_message() -> str:
    return "El asistente no respondió a tiempo. Intentá de nuevo en un momento."

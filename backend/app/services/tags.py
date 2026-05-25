from __future__ import annotations

import re

_MAX_TAGS = 15
_MAX_TAG_LEN = 50
_TAG_RE = re.compile(r"^[\w\sáéíóúñü\-]+$", re.IGNORECASE)


def parse_tags(raw: str | None) -> list[str]:
    """
    Normaliza tags desde texto libre (coma o salto de línea).
    Devuelve lista única en minúsculas, máx 15 ítems de 50 chars.
    """
    if not raw or not raw.strip():
        return []

    parts: list[str] = []
    for chunk in re.split(r"[,;\n]+", raw):
        tag = chunk.strip().lower()
        if not tag or len(tag) > _MAX_TAG_LEN:
            continue
        if not _TAG_RE.match(tag):
            continue
        if tag not in parts:
            parts.append(tag)
        if len(parts) >= _MAX_TAGS:
            break
    return parts

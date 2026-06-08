"""Escaneo antivirus opcional vía ClamAV (clamd)."""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def scan_file_path(path: str | Path) -> tuple[bool, str | None]:
    """
    Devuelve (infected, virus_name).
    Si ClamAV está deshabilitado o no responde, devuelve (False, None) y loguea.
    """
    settings = get_settings()
    if not settings.antivirus_enabled:
        return False, None

    try:
        import clamd
    except ImportError:
        logger.warning("clamd no instalado; antivirus omitido")
        return False, None

    try:
        client = clamd.ClamdNetworkSocket(
            host=settings.clamav_host,
            port=settings.clamav_port,
            timeout=30,
        )
        client.ping()
        with open(path, "rb") as fh:
            result = client.instream(fh)
    except Exception:
        logger.exception("ClamAV no disponible; archivo permitido en best-effort")
        return False, None

    status, detail = result.get("stream", ("OK", None))
    if status == "OK":
        return False, None
    virus_name = str(detail) if detail else "unknown"
    return True, virus_name

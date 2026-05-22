"""
Validación binaria de archivos por *magic numbers*. Sólo aceptamos formatos
declarados (PDF, EPUB, JPEG, PNG). Cualquier otro contenido se rechaza antes
de tocar disco o consumir tokens de procesamiento.
"""
from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.models.material import TipoArchivo

_REJECTION_DETAIL = "Formato de archivo no permitido o malicioso."

_HEADERS_4: dict[bytes, str] = {
    b"\x25\x50\x44\x46": "application/pdf",
    b"\x50\x4b\x03\x04": "application/epub+zip",
    b"\x89\x50\x4e\x47": "image/png",
}
_JPEG_PREFIX = b"\xff\xd8\xff"

MIME_TO_TIPO: dict[str, TipoArchivo] = {
    "application/pdf": TipoArchivo.pdf,
    "application/epub+zip": TipoArchivo.epub,
    "image/jpeg": TipoArchivo.jpeg,
    "image/png": TipoArchivo.png,
}

MIME_TO_EXT: dict[str, str] = {
    "application/pdf": "pdf",
    "application/epub+zip": "epub",
    "image/jpeg": "jpg",
    "image/png": "png",
}


async def validate_file_bytes(file: UploadFile) -> str:
    """
    Lee solo los primeros 4 bytes del stream y matchea contra firmas binarias.
    Devuelve el `mime_type` detectado o levanta HTTP 400 si no es soportado.
    """
    header = await file.read(4)
    await file.seek(0)

    if len(header) < 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _REJECTION_DETAIL)

    if header[:3] == _JPEG_PREFIX:
        return "image/jpeg"

    detected = _HEADERS_4.get(header)
    if detected is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _REJECTION_DETAIL)
    return detected

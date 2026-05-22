from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, runtime_checkable

from fastapi import UploadFile

from app.core.config import get_settings


@dataclass(slots=True, frozen=True)
class StoredObject:
    """Resultado de persistir un binario en el storage."""

    key: str
    size_bytes: int
    sha256: str
    mime_type: str


@runtime_checkable
class StorageService(Protocol):
    """
    Interfaz abstracta de almacenamiento. Implementaciones posibles:
    `LocalRaidStorage` (Etapa 2) y futuras S3/Backblaze/Minio si el RAID
    se satura, sin tocar capa de aplicación.
    """

    async def save(
        self, *, key: str, stream: AsyncIterator[bytes], mime_type: str
    ) -> StoredObject: ...

    async def upload(
        self, *, file: UploadFile, key: str, mime_type: str
    ) -> StoredObject: ...

    async def open(self, key: str) -> AsyncIterator[bytes]: ...

    async def delete(self, key: str) -> None: ...

    def absolute_path(self, key: str) -> str: ...


_CHUNK_SIZE = 64 * 1024


class LocalRaidStorage:
    """
    Backend que escribe en un volumen montado (RAID local del server).
    El cálculo de sha256 se hace streaming para no cargar el archivo en memoria.
    """

    def __init__(self, root: Path | None = None) -> None:
        self._root = (root or get_settings().storage_root).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        target = (self._root / key).resolve()
        if self._root not in target.parents and target != self._root:
            raise ValueError("Ruta fuera del root de storage")
        return target

    def _cleanup(self, target: Path) -> None:
        if target.exists():
            try:
                target.unlink()
            except OSError:
                pass

    async def save(
        self, *, key: str, stream: AsyncIterator[bytes], mime_type: str
    ) -> StoredObject:
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        sha = hashlib.sha256()
        size = 0
        try:
            with target.open("wb") as fh:
                async for chunk in stream:
                    if not chunk:
                        continue
                    fh.write(chunk)
                    sha.update(chunk)
                    size += len(chunk)
        except BaseException:
            self._cleanup(target)
            raise
        return StoredObject(key=key, size_bytes=size, sha256=sha.hexdigest(), mime_type=mime_type)

    async def upload(
        self, *, file: UploadFile, key: str, mime_type: str
    ) -> StoredObject:
        """
        Persiste un `UploadFile` en `key` haciendo streaming chunked y
        calculando sha256 en caliente. Limpia archivos parciales si algo falla.
        """
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        sha = hashlib.sha256()
        size = 0
        try:
            with target.open("wb") as fh:
                while chunk := await file.read(_CHUNK_SIZE):
                    fh.write(chunk)
                    sha.update(chunk)
                    size += len(chunk)
        except BaseException:
            self._cleanup(target)
            raise
        finally:
            try:
                await file.seek(0)
            except Exception:  # noqa: BLE001
                pass

        return StoredObject(
            key=key, size_bytes=size, sha256=sha.hexdigest(), mime_type=mime_type
        )

    async def open(self, key: str) -> AsyncIterator[bytes]:
        target = self._resolve(key)

        async def _iter() -> AsyncIterator[bytes]:
            with target.open("rb") as fh:
                while True:
                    chunk = fh.read(_CHUNK_SIZE)
                    if not chunk:
                        break
                    yield chunk

        return _iter()

    async def delete(self, key: str) -> None:
        target = self._resolve(key)
        if target.exists():
            target.unlink()

    def absolute_path(self, key: str) -> str:
        return str(self._resolve(key))


def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalRaidStorage(settings.storage_root)
    raise RuntimeError(f"Storage backend no soportado: {settings.storage_backend}")

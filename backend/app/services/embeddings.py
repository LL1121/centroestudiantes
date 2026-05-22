"""
Clientes de embeddings. La selección se hace por settings (`EMBEDDING_BACKEND`):

- `fake`  → vectores determinísticos para dev/CI (sin red).
- `openai`→ `text-embedding-3-*` vía HTTP async.

Cualquier backend nuevo debe cumplir el `Protocol` `EmbeddingClient` para
encajar en el pipeline sin tocar `rag_processor`.
"""
from __future__ import annotations

import hashlib
import math
import random
from typing import Protocol, runtime_checkable

import httpx

from app.core.config import get_settings

_OPENAI_URL = "https://api.openai.com/v1/embeddings"
_BATCH_SIZE = 64
_TIMEOUT = httpx.Timeout(60.0)


@runtime_checkable
class EmbeddingClient(Protocol):
    """Cliente que genera embeddings densos de un lote de textos."""

    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class FakeEmbeddings:
    """Embeddings deterministas (no semánticos) basados en sha256(text)."""

    def __init__(self, dim: int) -> None:
        self._dim = dim

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16) % (2**32)
            rng = random.Random(seed)
            raw = [rng.uniform(-1.0, 1.0) for _ in range(self._dim)]
            norm = math.sqrt(sum(x * x for x in raw)) or 1.0
            vectors.append([x / norm for x in raw])
        return vectors


class OpenAIEmbeddings:
    """Cliente async para `text-embedding-3-*` (soporta parámetro `dimensions`)."""

    def __init__(self, *, api_key: str, model: str, dim: int) -> None:
        self._api_key = api_key
        self._model = model
        self._dim = dim

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = []
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            for offset in range(0, len(texts), _BATCH_SIZE):
                batch = texts[offset : offset + _BATCH_SIZE]
                payload: dict[str, object] = {"model": self._model, "input": batch}
                if "3-" in self._model:
                    payload["dimensions"] = self._dim
                response = await client.post(
                    _OPENAI_URL,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                out.extend(item["embedding"] for item in data["data"])
        return out


def get_embedding_client() -> EmbeddingClient:
    settings = get_settings()
    backend = settings.embedding_backend.lower()
    if backend == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("EMBEDDING_BACKEND=openai requiere OPENAI_API_KEY")
        return OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
            dim=settings.embedding_dim,
        )
    if backend == "fake":
        return FakeEmbeddings(dim=settings.embedding_dim)
    raise RuntimeError(f"Embedding backend no soportado: {backend}")

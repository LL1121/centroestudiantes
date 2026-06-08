"""
Clientes de embeddings. La selección se hace por settings (`EMBEDDING_BACKEND`):

- `fake`  → vectores determinísticos para dev/CI (sin red).
- `openai`→ `text-embedding-3-*` vía HTTP async.
- `gemini`→ `gemini-embedding-001` (free tier de Google) vía batchEmbedContents.

Cualquier backend nuevo debe cumplir el `Protocol` `EmbeddingClient` para
encajar en el pipeline sin tocar `rag_processor`.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import random
from typing import Protocol, runtime_checkable

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/embeddings"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
_BATCH_SIZE = 64
# batchEmbedContents acepta hasta 100 requests por lote.
_GEMINI_BATCH_SIZE = 100
_TIMEOUT = httpx.Timeout(60.0)
_EMBED_MAX_RETRIES = 3
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _l2_normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vector))
    if norm <= 0:
        return vector
    return [x / norm for x in vector]


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
                response = await _post_with_retry(
                    client,
                    _OPENAI_URL,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    payload=payload,
                    provider="OpenAI",
                )
                data = response.json()
                out.extend(item["embedding"] for item in data["data"])
        return out


class GeminiEmbeddings:
    """Cliente async para `gemini-embedding-001` (free tier de Google).

    Usa `batchEmbedContents` con `outputDimensionality` para emitir vectores de
    `dim` componentes. Como `gemini-embedding-001` NO normaliza cuando se trunca
    por debajo de 3072 dims, normalizamos a L2 manualmente (clave para que la
    distancia coseno de pgvector funcione bien).
    """

    def __init__(self, *, api_key: str, model: str, dim: int) -> None:
        self._api_key = api_key
        self._model = model if model.startswith("models/") else f"models/{model}"
        self._dim = dim

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        url = f"{_GEMINI_BASE}/{self._model}:batchEmbedContents"
        out: list[list[float]] = []
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            for offset in range(0, len(texts), _GEMINI_BATCH_SIZE):
                batch = texts[offset : offset + _GEMINI_BATCH_SIZE]
                payload: dict[str, object] = {
                    "requests": [
                        {
                            "model": self._model,
                            "content": {"parts": [{"text": text}]},
                            "outputDimensionality": self._dim,
                        }
                        for text in batch
                    ]
                }
                response = await _post_with_retry(
                    client,
                    url,
                    params={"key": self._api_key},
                    payload=payload,
                    provider="Gemini",
                )
                data = response.json()
                out.extend(
                    _l2_normalize([float(v) for v in emb["values"]])
                    for emb in data["embeddings"]
                )
        return out


async def _post_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, str] | None = None,
    payload: dict[str, object],
    provider: str,
) -> httpx.Response:
    last: httpx.Response | None = None
    for attempt in range(_EMBED_MAX_RETRIES):
        response = await client.post(url, headers=headers, params=params, json=payload)
        if response.status_code in _RETRYABLE_STATUS and attempt < _EMBED_MAX_RETRIES - 1:
            retry_after = response.headers.get("retry-after", "").strip()
            wait = float(retry_after) if retry_after.isdigit() else 2**attempt
            wait = min(max(wait, 1.0), 30.0)
            logger.warning(
                "%s embeddings %s, reintento %s/%s en %.1fs",
                provider,
                response.status_code,
                attempt + 1,
                _EMBED_MAX_RETRIES,
                wait,
            )
            last = response
            await asyncio.sleep(wait)
            continue
        response.raise_for_status()
        return response
    assert last is not None
    last.raise_for_status()
    return last


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
    if backend == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("EMBEDDING_BACKEND=gemini requiere GEMINI_API_KEY")
        model = settings.embedding_model
        if "embedding" not in model or "gemini" not in model:
            model = "gemini-embedding-001"
        return GeminiEmbeddings(
            api_key=settings.gemini_api_key,
            model=model,
            dim=settings.embedding_dim,
        )
    if backend == "fake":
        return FakeEmbeddings(dim=settings.embedding_dim)
    raise RuntimeError(f"Embedding backend no soportado: {backend}")

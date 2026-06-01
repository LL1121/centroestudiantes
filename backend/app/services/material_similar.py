"""Materiales similares por centroid de embeddings + boost por carrera/tags."""

from __future__ import annotations

import math
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.embedding import Embedding
from app.models.material import Material, MaterialStatus
from app.services.material_search import MaterialSearchHit

_FAILED = (MaterialStatus.failed,)


def _compute_centroid(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        raise ValueError("sin vectores")
    dim = len(vectors[0])
    centroid = [0.0] * dim
    for vec in vectors:
        for i, val in enumerate(vec):
            centroid[i] += float(val)
    n = len(vectors)
    centroid = [x / n for x in centroid]
    norm = math.sqrt(sum(x * x for x in centroid))
    if norm > 0:
        centroid = [x / norm for x in centroid]
    return centroid


def _vector_to_list(vec: object) -> list[float]:
    if isinstance(vec, list):
        return [float(x) for x in vec]
    return [float(x) for x in list(vec)]  # type: ignore[arg-type]


async def find_similar_materials(
    session: AsyncSession,
    material_id: UUID,
    *,
    limit: int = 6,
) -> list[MaterialSearchHit]:
    """Devuelve materiales similares al indicado (excluye el propio)."""
    limit = max(1, min(limit, 20))
    source = await session.get(Material, material_id)
    if source is None or source.status in _FAILED:
        return []

    vec_rows = (
        await session.scalars(select(Embedding.vector).where(Embedding.material_id == material_id))
    ).all()
    if not vec_rows:
        return await _fallback_by_metadata(session, source, limit)

    centroid = _compute_centroid([_vector_to_list(v) for v in vec_rows])
    distance = Embedding.vector.cosine_distance(centroid).label("distance")
    ranked = (
        select(
            Embedding.material_id,
            func.min(distance).label("best_distance"),
        )
        .where(Embedding.material_id != material_id)
        .group_by(Embedding.material_id)
        .subquery()
    )

    rows = (
        await session.execute(
            select(Material, ranked.c.best_distance)
            .join(ranked, Material.id == ranked.c.material_id)
            .where(Material.status.not_in(_FAILED))
            .order_by(ranked.c.best_distance)
            .limit(limit * 3)
        )
    ).all()

    source_tags = set(source.tags or [])
    scored: list[MaterialSearchHit] = []
    for material, dist in rows:
        if material.id == material_id:
            continue
        score = max(0.35, 0.92 - float(dist) * 0.35)
        if material.carrera.strip().lower() == source.carrera.strip().lower():
            score += 0.10
        shared = len(source_tags & set(material.tags or []))
        score += min(0.15, shared * 0.05)
        scored.append(MaterialSearchHit(material=material, relevance=score, match_kind="similar"))

    scored.sort(key=lambda h: -h.relevance)
    return scored[:limit]


async def _fallback_by_metadata(
    session: AsyncSession,
    source: Material,
    limit: int,
) -> list[MaterialSearchHit]:
    """Sin embeddings indexados: misma carrera y tags compartidos."""
    rows = (
        await session.scalars(
            select(Material)
            .where(
                Material.id != source.id,
                Material.status.not_in(_FAILED),
                Material.carrera.ilike(source.carrera),
            )
            .order_by(Material.created_at.desc())
            .limit(limit * 2)
        )
    ).all()
    source_tags = set(source.tags or [])
    hits: list[MaterialSearchHit] = []
    for mat in rows:
        shared = len(source_tags & set(mat.tags or []))
        score = 0.5 + min(0.3, shared * 0.1)
        hits.append(MaterialSearchHit(material=mat, relevance=score, match_kind="similar"))
    hits.sort(key=lambda h: -h.relevance)
    return hits[:limit]

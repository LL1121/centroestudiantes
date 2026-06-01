from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.embedding import Embedding
from app.models.material import Material, MaterialStatus
from app.services.embeddings import get_embedding_client

_FAILED = (MaterialStatus.failed,)


@dataclass(slots=True, frozen=True)
class MaterialSearchHit:
    material: Material
    relevance: float
    match_kind: str  # title | description | tag | carrera | semantic | fuzzy | recent


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def search_materials(
    session: AsyncSession,
    *,
    q: str | None = None,
    carrera: str | None = None,
    tag: str | None = None,
    semantic: bool = True,
    limit: int = 50,
) -> list[MaterialSearchHit]:
    """
    Busca materiales por nombre, materia (carrera), tema (tags) y similitud semántica.

    Combina resultados de texto y vector, ordenados por relevancia descendente.
    """
    limit = max(1, min(limit, 100))
    settings = get_settings()
    hits: dict[UUID, MaterialSearchHit] = {}

    def _upsert(material: Material, relevance: float, kind: str) -> None:
        current = hits.get(material.id)
        if current is None or relevance > current.relevance:
            hits[material.id] = MaterialSearchHit(
                material=material, relevance=relevance, match_kind=kind
            )

    base = select(Material).where(Material.status.not_in(_FAILED))

    if carrera and carrera.strip():
        carrera_val = carrera.strip()
        rows = (
            await session.scalars(
                base.where(Material.carrera.ilike(f"%{_escape_like(carrera_val)}%", escape="\\"))
            )
        ).all()
        for row in rows:
            _upsert(row, 0.55, "carrera")

    if tag and tag.strip():
        tag_val = tag.strip().lower()
        rows = (
            await session.scalars(
                base.where(Material.tags.contains([tag_val]))
            )
        ).all()
        for row in rows:
            _upsert(row, 0.7, "tag")

    query = (q or "").strip()
    if query:
        pattern = f"%{_escape_like(query)}%"
        tag_exists = text(
            "EXISTS (SELECT 1 FROM unnest(materiales.tags) AS t WHERE t ILIKE :tag_pat)"
        ).bindparams(tag_pat=pattern)

        text_stmt = base.where(
            or_(
                Material.titulo.ilike(pattern, escape="\\"),
                Material.descripcion.ilike(pattern, escape="\\"),
                Material.carrera.ilike(pattern, escape="\\"),
                tag_exists,
            )
        )
        rows = (await session.scalars(text_stmt)).all()
        for row in rows:
            titulo_match = query.lower() in row.titulo.lower()
            tag_match = any(query.lower() in t for t in (row.tags or []))
            carrera_match = query.lower() in row.carrera.lower()
            if titulo_match:
                _upsert(row, 0.95, "title")
            elif tag_match:
                _upsert(row, 0.82, "tag")
            elif carrera_match:
                _upsert(row, 0.68, "carrera")
            else:
                _upsert(row, 0.6, "description")

        if len(query) >= 3:
            threshold = settings.fuzzy_threshold
            sim_titulo = func.similarity(Material.titulo, query)
            sim_desc = func.similarity(func.coalesce(Material.descripcion, ""), query)
            sim_carrera = func.similarity(Material.carrera, query)
            score_expr = func.greatest(sim_titulo, sim_desc, sim_carrera).label("fuzzy_score")
            fuzzy_stmt = (
                select(Material, score_expr)
                .where(Material.status.not_in(_FAILED))
                .where(score_expr > threshold)
                .order_by(score_expr.desc())
                .limit(limit)
            )
            fuzzy_rows = (await session.execute(fuzzy_stmt)).all()
            for material, score in fuzzy_rows:
                _upsert(material, min(0.88, float(score)), "fuzzy")

        if semantic and len(query) >= 3:
            client = get_embedding_client()
            vectors = await client.embed_batch([query])
            if vectors:
                query_vector = vectors[0]
                distance = Embedding.vector.cosine_distance(query_vector).label("distance")
                ranked = (
                    select(
                        Embedding.material_id,
                        func.min(distance).label("best_distance"),
                    )
                    .group_by(Embedding.material_id)
                    .subquery()
                )
                semantic_stmt = (
                    select(Material, ranked.c.best_distance)
                    .join(ranked, Material.id == ranked.c.material_id)
                    .where(Material.status.not_in(_FAILED))
                    .order_by(ranked.c.best_distance)
                    .limit(limit)
                )
                semantic_rows = (await session.execute(semantic_stmt)).all()
                for material, dist in semantic_rows:
                    # cosine_distance en [0, 2]; mapear a score ~[0.35, 0.92]
                    score = max(0.35, 0.92 - float(dist) * 0.35)
                    _upsert(material, score, "semantic")

    if not hits:
        if not query and not tag and not carrera:
            rows = (
                await session.scalars(
                    base.order_by(Material.created_at.desc()).limit(limit)
                )
            ).all()
            return [
                MaterialSearchHit(material=m, relevance=0.0, match_kind="recent")
                for m in rows
            ]
        return []

    ordered = sorted(hits.values(), key=lambda h: -h.relevance)
    return ordered[:limit]

"""Re-indexa materiales regenerando sus embeddings.

Útil al cambiar de `EMBEDDING_BACKEND` (p. ej. de `fake` a `gemini`): los
vectores viejos quedan obsoletos y hay que recalcularlos con el nuevo modelo.

Modo de uso:

    # Dentro del contenedor en producción
    docker compose -f docker-compose.biblioteca.yml exec backend \\
        python -m app.scripts.reindex_materials

    # Incluir también failed/pending/quarantined
    ... python -m app.scripts.reindex_materials --all

    # Un solo material
    ... python -m app.scripts.reindex_materials --material-id <uuid>

    # Pausa entre materiales (segundos) para no golpear el rate limit
    ... python -m app.scripts.reindex_materials --delay 2

Procesa de a uno (secuencial) a propósito: el free tier de Gemini tiene
límites bajos de requests por minuto.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from uuid import UUID

from sqlalchemy import delete, select

from app.db.session import SessionFactory, engine
from app.models.embedding import Embedding
from app.models.material import Material, MaterialStatus
from app.services.rag_processor import process_material_pipeline

logger = logging.getLogger("reindex")

# Estados que se reprocesan por defecto (los que deberían tener embeddings).
_DEFAULT_STATUSES = (MaterialStatus.active, MaterialStatus.indexed)


async def _load_ids(*, all_statuses: bool, material_id: UUID | None) -> list[UUID]:
    async with SessionFactory() as session:
        stmt = select(Material.id)
        if material_id is not None:
            stmt = stmt.where(Material.id == material_id)
        elif not all_statuses:
            stmt = stmt.where(Material.status.in_(_DEFAULT_STATUSES))
        return list((await session.scalars(stmt)).all())


async def _reindex_one(material_id: UUID) -> None:
    async with SessionFactory() as session:
        await session.execute(
            delete(Embedding).where(Embedding.material_id == material_id)
        )
        material = await session.get(Material, material_id)
        if material is not None:
            material.status = MaterialStatus.pending
        await session.commit()
    await process_material_pipeline(material_id, skip_moderation=True)


async def _run(*, all_statuses: bool, material_id: UUID | None, delay: float) -> int:
    try:
        ids = await _load_ids(all_statuses=all_statuses, material_id=material_id)
        total = len(ids)
        if total == 0:
            logger.warning("No hay materiales para reindexar.")
            return 0

        logger.info("Reindexando %d material(es)…", total)
        ok = 0
        failed: list[UUID] = []
        for index, mid in enumerate(ids, start=1):
            logger.info("[%d/%d] material=%s", index, total, mid)
            try:
                await _reindex_one(mid)
                ok += 1
            except Exception:  # noqa: BLE001
                logger.exception("Falló el reindexado de %s", mid)
                failed.append(mid)
            if delay > 0 and index < total:
                await asyncio.sleep(delay)

        logger.info("Listo. OK=%d  Fallidos=%d  Total=%d", ok, len(failed), total)
        for mid in failed:
            logger.warning("  fallido: %s", mid)
        return 1 if failed else 0
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description="Re-indexar embeddings de materiales")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Incluir también pending/processing/failed/quarantined (por defecto solo active/indexed).",
    )
    parser.add_argument(
        "--material-id",
        type=UUID,
        default=None,
        help="Reindexar un único material por su UUID.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Segundos de pausa entre materiales (free tier). Default: 1.0",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    return asyncio.run(
        _run(all_statuses=args.all, material_id=args.material_id, delay=args.delay)
    )


if __name__ == "__main__":
    raise SystemExit(main())

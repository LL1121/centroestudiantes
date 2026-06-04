"""Re-indexa materiales activos (útil al pasar de EMBEDDING_BACKEND=fake a openai)."""

from __future__ import annotations

import argparse
import asyncio
import logging

from sqlalchemy import delete, select

from app.db.session import SessionFactory
from app.models.embedding import Embedding
from app.models.material import Material, MaterialStatus
from app.services.rag_processor import process_material_pipeline

logger = logging.getLogger(__name__)


async def _run(*, all_statuses: bool) -> None:
    async with SessionFactory() as session:
        stmt = select(Material)
        if not all_statuses:
            stmt = stmt.where(Material.status.in_((MaterialStatus.active, MaterialStatus.indexed)))
        materials = list((await session.scalars(stmt)).all())

    logger.info("Re-indexando %d materiales…", len(materials))
    for material in materials:
        async with SessionFactory() as session:
            await session.execute(delete(Embedding).where(Embedding.material_id == material.id))
            mat = await session.get(Material, material.id)
            if mat is not None:
                mat.status = MaterialStatus.pending
                await session.commit()
        await process_material_pipeline(material.id, skip_moderation=True)
        logger.info("OK material=%s", material.id)


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-indexar embeddings de materiales")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Incluir también pending/processing/failed (por defecto solo active/indexed)",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_run(all_statuses=args.all))


if __name__ == "__main__":
    main()

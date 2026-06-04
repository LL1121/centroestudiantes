from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, status
from sqlalchemy import select

from app.api.deps import SessionDep, require_role
from app.models.material import Material, MaterialStatus
from app.models.user import User, UserRole
from app.schemas.material import MaterialRead
from app.services.rag_processor import process_material_pipeline

router = APIRouter(prefix="/moderation", tags=["moderation"])

ModeratorUser = Annotated[User, Depends(require_role(UserRole.moderador, UserRole.admin))]


@router.get("/queue", response_model=list[MaterialRead])
async def moderation_queue(
    _user: ModeratorUser,
    session: SessionDep,
    limit: int = 50,
) -> list[Material]:
    limit = max(1, min(limit, 100))
    rows = await session.scalars(
        select(Material)
        .where(Material.status == MaterialStatus.quarantined)
        .order_by(Material.created_at.desc())
        .limit(limit)
    )
    return list(rows.all())


@router.post("/{material_id}/approve", response_model=MaterialRead)
async def approve_material(
    _user: ModeratorUser,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    material_id: Annotated[uuid.UUID, Path()],
) -> Material:
    material = await session.get(Material, material_id)
    if material is None or material.status != MaterialStatus.quarantined:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no está en cuarentena")

    material.status = MaterialStatus.pending
    await session.commit()
    await session.refresh(material)

    background_tasks.add_task(process_material_pipeline, material.id, skip_moderation=True)
    return material


@router.post("/{material_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_material(
    _user: ModeratorUser,
    session: SessionDep,
    material_id: Annotated[uuid.UUID, Path()],
) -> None:
    material = await session.get(Material, material_id)
    if material is None or material.status != MaterialStatus.quarantined:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no está en cuarentena")

    material.status = MaterialStatus.failed
    await session.commit()

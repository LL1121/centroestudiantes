from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, status
from sqlalchemy import select
from app.api.deps import OptionalCurrentUser, SessionDep, require_role
from app.models.copyright_report import (
    CopyrightReport,
    CopyrightReportReason,
    CopyrightReportStatus,
)
from app.models.material import Material, MaterialStatus
from app.models.user import User, UserRole
from app.schemas.copyright import (
    CopyrightReportCreate,
    CopyrightReportCreateResponse,
    CopyrightReportRead,
)
from app.schemas.material import MaterialRead
from app.services.rag_processor import process_material_pipeline

router = APIRouter(prefix="/copyright", tags=["copyright"])

ModeratorUser = Annotated[User, Depends(require_role(UserRole.moderador, UserRole.admin))]

_QUARANTINE_STATUSES = frozenset(
    {
        MaterialStatus.pending,
        MaterialStatus.processing,
        MaterialStatus.active,
        MaterialStatus.indexed,
    }
)


@router.post(
    "/report",
    response_model=CopyrightReportCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def report_copyright(
    payload: CopyrightReportCreate,
    session: SessionDep,
    _user: OptionalCurrentUser,
) -> CopyrightReportCreateResponse:
    """
    Reclamo de derechos de autor (público).

    El material queda en cuarentena de inmediato si estaba publicado o en proceso,
    hasta que un moderador resuelva el reclamo.
    """
    material = await session.get(Material, payload.material_id)
    if material is None or material.status == MaterialStatus.failed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no encontrado.")

    report = CopyrightReport(
        material_id=material.id,
        reporter_email=payload.reporter_email.strip().lower(),
        reporter_name=payload.reporter_name.strip() if payload.reporter_name else None,
        reason=payload.reason,
        details=payload.details.strip(),
        status=CopyrightReportStatus.pending,
    )
    session.add(report)

    quarantined = False
    if material.status in _QUARANTINE_STATUSES:
        material.status = MaterialStatus.quarantined
        quarantined = True

    await session.commit()
    await session.refresh(report)

    return CopyrightReportCreateResponse(
        report=CopyrightReportRead.model_validate(report),
        material_quarantined=quarantined,
    )


@router.get("/reports", response_model=list[CopyrightReportRead])
async def list_copyright_reports(
    _user: ModeratorUser,
    session: SessionDep,
    pending_only: bool = True,
    limit: int = 50,
) -> list[CopyrightReportRead]:
    """Cola de reclamos de copyright para moderadores."""
    limit = max(1, min(limit, 100))
    stmt = select(CopyrightReport).order_by(CopyrightReport.created_at.desc()).limit(limit)
    if pending_only:
        stmt = stmt.where(CopyrightReport.status == CopyrightReportStatus.pending)

    rows = await session.scalars(stmt)
    reports = list(rows.all())
    if not reports:
        return []

    material_ids = {r.material_id for r in reports}
    materials = await session.scalars(select(Material).where(Material.id.in_(material_ids)))
    by_id = {m.id: m for m in materials.all()}

    out: list[CopyrightReportRead] = []
    for report in reports:
        material = by_id.get(report.material_id)
        item = CopyrightReportRead.model_validate(report)
        if material is not None:
            item = item.model_copy(
                update={"material": MaterialRead.model_validate(material)},
            )
        out.append(item)
    return out


@router.post("/reports/{report_id}/dismiss", response_model=CopyrightReportRead)
async def dismiss_copyright_report(
    user: ModeratorUser,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    report_id: Annotated[uuid.UUID, Path()],
) -> CopyrightReport:
    """Rechaza el reclamo y rehabilita el material (si estaba en cuarentena)."""
    report = await session.get(CopyrightReport, report_id)
    if report is None or report.status != CopyrightReportStatus.pending:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reclamo no encontrado o ya resuelto.")

    material = await session.get(Material, report.material_id)
    if material is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no encontrado.")

    report.status = CopyrightReportStatus.dismissed
    report.reviewed_by_id = user.id

    if material.status == MaterialStatus.quarantined:
        material.status = MaterialStatus.pending
        await session.commit()
        await session.refresh(report)
        background_tasks.add_task(process_material_pipeline, material.id, skip_moderation=True)
        return report

    await session.commit()
    await session.refresh(report)
    return report


@router.post("/reports/{report_id}/uphold", response_model=CopyrightReportRead)
async def uphold_copyright_report(
    user: ModeratorUser,
    session: SessionDep,
    report_id: Annotated[uuid.UUID, Path()],
) -> CopyrightReport:
    """Acoge el reclamo y retira el material de la biblioteca."""
    report = await session.get(CopyrightReport, report_id)
    if report is None or report.status != CopyrightReportStatus.pending:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reclamo no encontrado o ya resuelto.")

    material = await session.get(Material, report.material_id)
    if material is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no encontrado.")

    report.status = CopyrightReportStatus.upheld
    report.reviewed_by_id = user.id
    material.status = MaterialStatus.failed

    await session.commit()
    await session.refresh(report)
    return report

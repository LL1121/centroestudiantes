from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.copyright_report import CopyrightReportReason, CopyrightReportStatus
from app.schemas.material import MaterialRead


class CopyrightReportCreate(BaseModel):
    material_id: UUID
    reporter_email: EmailStr
    reporter_name: str | None = Field(None, max_length=255)
    reason: CopyrightReportReason
    details: str = Field(min_length=20, max_length=4000)


class CopyrightReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    material_id: UUID
    reporter_email: str
    reporter_name: str | None
    reason: CopyrightReportReason
    details: str
    status: CopyrightReportStatus
    reviewed_by_id: UUID | None
    created_at: datetime
    material: MaterialRead | None = None


class CopyrightReportCreateResponse(BaseModel):
    report: CopyrightReportRead
    material_quarantined: bool

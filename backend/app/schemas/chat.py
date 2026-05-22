from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChatAskRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    focus: Literal["local", "global"] = "global"
    material_id: UUID | None = None


class ChunkSource(BaseModel):
    material_id: UUID
    titulo: str | None
    chunk_idx: int
    snippet: str
    distance: float


class ChatAskResponse(BaseModel):
    answer: str
    sources: list[ChunkSource] = []
    blocked: bool = False
    blocked_reason: str | None = None
    focus: Literal["local", "global"]

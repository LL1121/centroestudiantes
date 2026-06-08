from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.password_policy import validate_password_strength
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.alumno

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        error = validate_password_strength(value)
        if error:
            raise ValueError(error)
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    email_verified: bool
    twofa_enabled: bool = False
    created_at: datetime
    last_login_at: datetime | None


class UserAdminUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    full_name: str | None = Field(None, min_length=2, max_length=255)

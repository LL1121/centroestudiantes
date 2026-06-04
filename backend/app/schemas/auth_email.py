from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.password_policy import validate_password_strength


class EmailOnlyRequest(BaseModel):
    email: EmailStr


class TokenOnlyRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        error = validate_password_strength(value)
        if error:
            raise ValueError(error)
        return value

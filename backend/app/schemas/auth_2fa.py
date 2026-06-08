from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LoginResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    requires_2fa: bool = False
    challenge_token: str | None = None


class TwofaSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_data_url: str


class TwofaCodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=12)


class TwofaEnableResponse(BaseModel):
    backup_codes: list[str]


class TwofaVerifyRequest(BaseModel):
    challenge_token: str = Field(min_length=16)
    code: str = Field(min_length=6, max_length=12)
    method: Literal["totp", "email", "backup"] = "totp"


class TwofaChallengeRequest(BaseModel):
    challenge_token: str = Field(min_length=16)

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.limiter import limiter
from app.core.security import create_2fa_challenge_token, decode_token
from app.models.user import User
from app.schemas.auth_2fa import (
    TwofaChallengeRequest,
    TwofaCodeRequest,
    TwofaEnableResponse,
    TwofaSetupResponse,
    TwofaVerifyRequest,
)
from app.schemas.token import TokenPair
from app.services.auth_tokens import issue_token_pair
from app.services.twofa import (
    build_setup_payload,
    create_email_otp,
    disable_twofa,
    enable_twofa,
    store_pending_secret,
    verify_2fa_code,
)

router = APIRouter(prefix="/auth/2fa", tags=["auth-2fa"])


@router.post("/setup", response_model=TwofaSetupResponse)
async def setup_2fa(user: CurrentUser, session: SessionDep) -> TwofaSetupResponse:
    secret, uri, qr = build_setup_payload(user=user)
    await store_pending_secret(session, user, secret)
    return TwofaSetupResponse(secret=secret, provisioning_uri=uri, qr_data_url=qr)


@router.post("/enable", response_model=TwofaEnableResponse)
async def enable_2fa(
    user: CurrentUser,
    session: SessionDep,
    body: TwofaCodeRequest,
) -> TwofaEnableResponse:
    try:
        codes = await enable_twofa(session, user, body.code)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await session.refresh(user)
    return TwofaEnableResponse(backup_codes=codes)


@router.post("/disable", status_code=status.HTTP_204_NO_CONTENT)
async def disable_2fa_endpoint(
    user: CurrentUser,
    session: SessionDep,
    body: TwofaCodeRequest,
) -> None:
    try:
        await disable_twofa(session, user, body.code)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.post("/email/send", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/hour")
async def send_2fa_email_otp(
    request: Request,
    session: SessionDep,
    body: TwofaChallengeRequest,
) -> None:
    del request
    try:
        payload = decode_token(body.challenge_token, expected_type="2fa")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Desafío inválido o expirado") from exc

    user = await session.get(User, user_id)
    if user is None or not user.is_active or not user.twofa_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Desafío inválido")

    await create_email_otp(session, user)


@router.post("/verify", response_model=TokenPair)
@limiter.limit("10/minute")
async def verify_2fa_login(
    request: Request,
    session: SessionDep,
    body: TwofaVerifyRequest,
) -> TokenPair:
    del request
    try:
        payload = decode_token(body.challenge_token, expected_type="2fa")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Desafío inválido o expirado") from exc

    user = await session.get(User, user_id)
    if user is None or not user.is_active or not user.twofa_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Desafío inválido")

    ok = await verify_2fa_code(session, user, code=body.code, method=body.method)
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Código incorrecto")

    return await issue_token_pair(session, user)

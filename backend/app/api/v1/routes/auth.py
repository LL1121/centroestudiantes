from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import SessionDep
from app.core.limiter import limiter
from app.core.config import get_settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_2fa_challenge_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.auth_email import (
    EmailOnlyRequest,
    PasswordResetConfirmRequest,
    TokenOnlyRequest,
)
from app.schemas.auth_2fa import LoginResponse
from app.schemas.token import LogoutRequest, RefreshRequest, TokenPair
from app.schemas.user import UserCreate, UserRead
from app.services.auth_email import (
    create_password_reset_token,
    create_verification_token,
    redeem_password_reset,
    redeem_verification_token,
    send_password_reset_email,
    send_verification_email,
)
from app.services.auth_tokens import issue_token_pair, revoke_refresh_raw, rotate_refresh

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: UserCreate, session: SessionDep) -> User:
    del request
    existing = await session.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email ya registrado")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.alumno,
        email_verified=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    await send_verification_email(session, user)
    return user


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
) -> LoginResponse:
    del request
    settings = get_settings()
    user = await session.scalar(select(User).where(User.email == form_data.username))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    if not verify_password(form_data.password, password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Usuario deshabilitado")
    if settings.require_email_verified and not user.email_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Verificá tu email antes de iniciar sesión.",
        )

    user.last_login_at = datetime.now(tz=UTC)
    await session.commit()

    if user.twofa_enabled:
        return LoginResponse(
            requires_2fa=True,
            challenge_token=create_2fa_challenge_token(user_id=user.id),
        )

    tokens = await issue_token_pair(session, user)
    return LoginResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
    )


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("30/minute")
async def refresh_tokens(
    request: Request,
    body: RefreshRequest,
    session: SessionDep,
) -> TokenPair:
    del request
    return await rotate_refresh(session, body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutRequest, session: SessionDep) -> None:
    if body.refresh_token:
        await revoke_refresh_raw(session, body.refresh_token)


@router.post("/verify-email/request", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/hour")
async def request_email_verification(
    request: Request,
    body: EmailOnlyRequest,
    session: SessionDep,
) -> None:
    del request
    user = await session.scalar(select(User).where(User.email == body.email))
    if user is not None and not user.email_verified:
        await send_verification_email(session, user)


@router.post("/verify-email/confirm")
async def confirm_email(body: TokenOnlyRequest, session: SessionDep) -> dict[str, bool]:
    ok = await redeem_verification_token(session, body.token)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token inválido o expirado")
    return {"verified": True}


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/hour")
async def request_password_reset(
    request: Request,
    body: EmailOnlyRequest,
    session: SessionDep,
) -> None:
    del request
    user = await session.scalar(select(User).where(User.email == body.email))
    if user is not None:
        raw = await create_password_reset_token(session, user)
        await send_password_reset_email(user, raw)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_password_reset(
    body: PasswordResetConfirmRequest,
    session: SessionDep,
) -> None:
    from app.core.password_policy import validate_password_strength

    error = validate_password_strength(body.new_password)
    if error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, error)
    ok = await redeem_password_reset(session, body.token, body.new_password)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token inválido o expirado")

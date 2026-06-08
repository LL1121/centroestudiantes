from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, SessionDep, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserAdminUpdate, UserRead
from app.services.auth_email import create_password_reset_token, send_password_reset_email

router = APIRouter(prefix="/users", tags=["users"])

AdminUser = Annotated[User, Depends(require_role(UserRole.admin))]


@router.get("/me", response_model=UserRead)
async def read_me(user: CurrentUser) -> User:
    return user


@router.get("", response_model=list[UserRead])
async def list_users(
    _admin: AdminUser,
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[User]:
    stmt = select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(User.email.ilike(pattern), User.full_name.ilike(pattern)),
        )
    return list((await session.scalars(stmt)).all())


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    admin: AdminUser,
    session: SessionDep,
    user_id: Annotated[uuid.UUID, Path()],
    payload: UserAdminUpdate,
) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No podés desactivarte a vos mismo.")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def admin_trigger_password_reset(
    _admin: AdminUser,
    session: SessionDep,
    user_id: Annotated[uuid.UUID, Path()],
) -> None:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    raw = await create_password_reset_token(session, user)
    await send_password_reset_email(user, raw)

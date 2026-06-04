from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import auth, chat, materials, moderation, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(materials.router)
api_router.include_router(chat.router)
api_router.include_router(moderation.router)

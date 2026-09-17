from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import SessionDep
from app.models.profesor import Profesor
from app.models.voto import Voto
from app.schemas.voting import (
    LeaderboardEntry,
    ProfesorRead,
    VoteCreate,
    VoteCreateResponse,
    nombre_apellido_key,
)

router = APIRouter(prefix="/voting", tags=["voting"])

# Misma expresión que el índice único uq_votos_nombre_norm (migración 0011).
_NOMBRE_NORM = func.lower(
    func.regexp_replace(func.btrim(Voto.nombre_apellido), r"\s+", " ", "g")
)


@router.get("/professors", response_model=list[ProfesorRead])
async def list_professors(session: SessionDep) -> list[Profesor]:
    """Lista de docentes activos para el buscador de votación."""
    result = await session.execute(
        select(Profesor)
        .where(Profesor.activo.is_(True))
        .order_by(Profesor.nombre.asc())
    )
    return list(result.scalars().all())


@router.post(
    "/votes",
    response_model=VoteCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def cast_vote(payload: VoteCreate, session: SessionDep) -> VoteCreateResponse:
    """Registra un voto. Un DNI o nombre solo puede votar una vez (409)."""
    profesor = await session.get(Profesor, payload.profesor_id)
    if profesor is None or not profesor.activo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profesor no encontrado")

    nombre_key = nombre_apellido_key(payload.nombre_apellido)

    existing_dni = await session.scalar(
        select(Voto.id).where(Voto.dni == payload.dni).limit(1)
    )
    if existing_dni is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este DNI ya emitió un voto",
        )

    existing_nombre = await session.scalar(
        select(Voto.id).where(_NOMBRE_NORM == nombre_key).limit(1)
    )
    if existing_nombre is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este nombre ya emitió un voto",
        )

    voto = Voto(
        profesor_id=profesor.id,
        nombre_apellido=payload.nombre_apellido,
        carrera=payload.carrera,
        dni=payload.dni,
    )
    session.add(voto)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        detail = str(getattr(exc, "orig", exc)).lower()
        if "uq_votos_nombre_norm" in detail or "nombre" in detail:
            message = "Este nombre ya emitió un voto"
        else:
            message = "Este DNI ya emitió un voto"
        raise HTTPException(status.HTTP_409_CONFLICT, message) from None

    return VoteCreateResponse()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(session: SessionDep) -> list[LeaderboardEntry]:
    """Top 10 profesores ordenados por cantidad de votos (desc)."""
    result = await session.execute(
        select(
            Profesor.id,
            Profesor.nombre,
            func.count(Voto.id).label("votos"),
        )
        .join(Voto, Voto.profesor_id == Profesor.id)
        .where(Profesor.activo.is_(True))
        .group_by(Profesor.id, Profesor.nombre)
        .order_by(func.count(Voto.id).desc(), Profesor.nombre.asc())
        .limit(10)
    )
    rows = result.all()
    return [
        LeaderboardEntry(
            profesor_id=row.id,
            nombre=row.nombre,
            votos=int(row.votos),
            puesto=index,
        )
        for index, row in enumerate(rows, start=1)
    ]

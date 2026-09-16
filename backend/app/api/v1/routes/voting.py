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
)

router = APIRouter(prefix="/voting", tags=["voting"])


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
    """Registra un voto. Un DNI solo puede votar una vez (409 si ya votó)."""
    profesor = await session.get(Profesor, payload.profesor_id)
    if profesor is None or not profesor.activo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profesor no encontrado")

    voto = Voto(
        profesor_id=profesor.id,
        nombre_apellido=payload.nombre_apellido,
        carrera=payload.carrera,
        dni=payload.dni,
    )
    session.add(voto)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este DNI ya emitió un voto",
        ) from None

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

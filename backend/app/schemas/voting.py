from __future__ import annotations

import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_nombre_apellido(value: str) -> str:
    """Colapsa espacios y deja el texto listo para guardar/comparar."""
    return _WHITESPACE_RE.sub(" ", value.strip())


def nombre_apellido_key(value: str) -> str:
    """Clave case-insensitive para detectar votos duplicados por nombre."""
    return normalize_nombre_apellido(value).lower()


class ProfesorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str


class VoteCreate(BaseModel):
    profesor_id: UUID
    nombre_apellido: str = Field(min_length=2, max_length=255)
    carrera: str = Field(min_length=2, max_length=120)
    dni: str = Field(min_length=7, max_length=8)

    @field_validator("nombre_apellido")
    @classmethod
    def normalize_nombre(cls, value: str) -> str:
        cleaned = normalize_nombre_apellido(value)
        if len(cleaned) < 2:
            raise ValueError("Debe tener al menos 2 caracteres")
        return cleaned

    @field_validator("carrera")
    @classmethod
    def strip_carrera(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Debe tener al menos 2 caracteres")
        return cleaned

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, value: str) -> str:
        digits = value.strip()
        if not digits.isdigit() or not (7 <= len(digits) <= 8):
            raise ValueError("El DNI debe ser numérico y tener 7 u 8 dígitos")
        return digits


class VoteCreateResponse(BaseModel):
    ok: bool = True
    message: str = "Voto registrado"


class LeaderboardEntry(BaseModel):
    profesor_id: UUID
    nombre: str
    votos: int
    puesto: int

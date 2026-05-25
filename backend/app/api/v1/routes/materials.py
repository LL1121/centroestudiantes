from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Path, Query, UploadFile, status
from sqlalchemy import select, text

from app.api.deps import CurrentUser, OptionalCurrentUser, SessionDep
from app.models.material import Material, MaterialStatus
from app.models.user import UserRole
from app.schemas.material import MaterialRead, MaterialSearchRead, MaterialUploadResponse
from app.services.file_validation import MIME_TO_EXT, MIME_TO_TIPO, validate_file_bytes
from app.services.material_search import search_materials
from app.services.rag_processor import process_material_pipeline
from app.services.storage import get_storage
from app.services.tags import parse_tags

router = APIRouter(prefix="/materials", tags=["materials"])

_LIST_LIMIT_MAX = 100

_TITULO_MIN = 2
_TITULO_MAX = 255
_CARRERA_MIN = 2
_CARRERA_MAX = 120


@router.get("/tags", response_model=list[str])
async def list_material_tags(
    _user: OptionalCurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 30,
) -> list[str]:
    """Tags más usados en la biblioteca (para sugerencias en el buscador)."""
    result = await session.execute(
        text(
            """
            SELECT tag, COUNT(*) AS cnt
            FROM materiales, unnest(tags) AS tag
            WHERE cardinality(tags) > 0
              AND status != 'failed'
            GROUP BY tag
            ORDER BY cnt DESC, tag ASC
            LIMIT :lim
            """
        ),
        {"lim": limit},
    )
    return [row[0] for row in result.all()]


@router.get("", response_model=list[MaterialSearchRead])
async def list_materials(
    _user: OptionalCurrentUser,
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    carrera: Annotated[str | None, Query(max_length=_CARRERA_MAX)] = None,
    tag: Annotated[
        str | None,
        Query(max_length=50, description="Tema / etiqueta (coincidencia exacta)"),
    ] = None,
    tema: Annotated[str | None, Query(max_length=50, description="Alias de `tag`")] = None,
    semantic: Annotated[bool, Query(description="Incluir similitud semántica (pgvector)")] = True,
    limit: Annotated[int, Query(ge=1, le=_LIST_LIMIT_MAX)] = 50,
) -> list[MaterialSearchRead]:
    """
    Lista o busca materiales. Acceso público (guest OK).

    - `q`: nombre, descripción, materia o texto dentro de tags.
    - `carrera` / `tag` / `tema`: filtros adicionales.
    - `semantic`: si hay `q`, también rankea por embeddings (similitud).
    """
    tema_tag = (tag or tema or "").strip() or None
    hits = await search_materials(
        session,
        q=q,
        carrera=carrera,
        tag=tema_tag,
        semantic=semantic,
        limit=limit,
    )
    out: list[MaterialSearchRead] = []
    for hit in hits:
        base = MaterialRead.model_validate(hit.material)
        out.append(
            MaterialSearchRead(
                **base.model_dump(),
                relevance=hit.relevance if hit.relevance > 0 else None,
                match_kind=hit.match_kind if hit.match_kind != "recent" else None,
            )
        )
    return out


@router.post(
    "/upload",
    response_model=MaterialUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_material(
    user: CurrentUser,
    session: SessionDep,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File()],
    titulo: Annotated[str, Form(min_length=_TITULO_MIN, max_length=_TITULO_MAX)],
    carrera: Annotated[str, Form(min_length=_CARRERA_MIN, max_length=_CARRERA_MAX)],
    descripcion: Annotated[str | None, Form(max_length=2000)] = None,
    tags: Annotated[str | None, Form(max_length=500, description="Tags separados por coma")] = None,
) -> MaterialUploadResponse:
    """
    Sube un material académico. Flujo estricto:
    1. Valida los primeros 4 bytes (magic numbers).
    2. Persiste el archivo en streaming sobre el RAID, calculando sha256.
    3. Deduplica por sha256 (si ya existe un material activo, se borra la copia
       recién subida y se devuelve el original).
    4. Crea el registro `Material(status=pending)` para que la Etapa 3 lo indexe.
    """
    if file.filename is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Archivo sin nombre.")

    mime_type = await validate_file_bytes(file)
    tipo_archivo = MIME_TO_TIPO[mime_type]
    ext = MIME_TO_EXT[mime_type]

    storage = get_storage()
    material_id = uuid.uuid4()
    storage_key = f"materiales/{material_id}.{ext}"

    try:
        stored = await storage.upload(file=file, key=storage_key, mime_type=mime_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "No pudimos guardar el archivo en el servidor.",
        ) from exc

    # Deduplicación: cualquier material no-fallido con el mismo hash.
    existing = await session.scalar(
        select(Material)
        .where(
            Material.sha256 == stored.sha256,
            Material.status != MaterialStatus.failed,
        )
        .limit(1)
    )
    if existing is not None:
        await storage.delete(stored.key)
        return MaterialUploadResponse(material=existing, deduplicated=True)  # type: ignore[arg-type]

    material = Material(
        id=material_id,
        titulo=titulo,
        descripcion=descripcion,
        carrera=carrera,
        tags=parse_tags(tags),
        storage_key=stored.key,
        tipo_archivo=tipo_archivo,
        mime_type=mime_type,
        size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        status=MaterialStatus.pending,
        uploader_id=user.id,
    )
    session.add(material)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        await storage.delete(stored.key)
        raise

    await session.refresh(material)

    # Dispara el pipeline RAG (extracción → chunks → embeddings → pgvector)
    # en background; la respuesta vuelve enseguida con el material en `pending`.
    background_tasks.add_task(process_material_pipeline, material.id)

    return MaterialUploadResponse(material=material, deduplicated=False)  # type: ignore[arg-type]


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    user: CurrentUser,
    session: SessionDep,
    material_id: Annotated[uuid.UUID, Path()],
) -> None:
    """
    Borra un material y, por cascade, sus embeddings.

    Solo el uploader original o un admin pueden borrarlo.
    El archivo físico se elimina del storage en best-effort: si falla, el
    registro de DB igual se elimina (consistencia → no quedan colgados los
    embeddings ni la fila huérfana). Un job de limpieza puede recoger restos.
    """
    material = await session.get(Material, material_id)
    if material is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Material no encontrado.")

    is_owner = material.uploader_id is not None and material.uploader_id == user.id
    is_admin = user.role == UserRole.admin
    if not (is_owner or is_admin):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo el autor original o un admin pueden eliminar este material.",
        )

    storage_key = material.storage_key

    await session.delete(material)
    await session.commit()

    storage = get_storage()
    try:
        await storage.delete(storage_key)
    except Exception:  # noqa: BLE001
        pass

    return None

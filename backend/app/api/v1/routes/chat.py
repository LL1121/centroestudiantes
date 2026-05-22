from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.chat import ChatAskRequest, ChatAskResponse, ChunkSource
from app.services.embeddings import get_embedding_client
from app.services.llm_chat import (
    STANDARD_REJECT_MESSAGE,
    SYSTEM_PROMPT,
    build_user_prompt,
    evaluate_guardrail,
    get_llm_client,
    search_context,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

_SNIPPET_LEN = 220


@router.post("/ask", response_model=ChatAskResponse)
async def ask(
    user: CurrentUser,
    session: SessionDep,
    payload: ChatAskRequest,
) -> ChatAskResponse:
    """
    Endpoint del asistente. Flujo:
    1. Guardián anti-abuso (regex). Si rechaza, ni se embede ni se busca.
    2. Embed de la query.
    3. Búsqueda semántica según `focus`.
    4. System prompt estricto + contexto → LLM.
    """
    del user  # CurrentUser solo se usa para autorización del endpoint.

    if payload.focus == "local" and payload.material_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "El modo 'local' requiere un material_id.",
        )

    decision = evaluate_guardrail(payload.content)
    if not decision.allowed:
        return ChatAskResponse(
            answer=STANDARD_REJECT_MESSAGE,
            blocked=True,
            blocked_reason=decision.reason,
            focus=payload.focus,
        )

    settings = get_settings()
    embed_client = get_embedding_client()
    try:
        vectors = await embed_client.embed_batch([payload.content])
    except Exception as exc:  # noqa: BLE001
        logger.exception("Embedding de la query falló")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "No pudimos generar el embedding de tu consulta.",
        ) from exc
    if not vectors:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Sin vector de query.")
    query_vector = vectors[0]

    chunks = await search_context(
        query_vector=query_vector,
        session=session,
        focus=payload.focus,
        material_id=payload.material_id,
        top_k=settings.llm_top_k,
    )

    prompt = build_user_prompt(payload.content, chunks, payload.focus)

    llm = get_llm_client()
    try:
        answer = await llm.complete(
            system=SYSTEM_PROMPT,
            user=prompt,
            max_tokens=settings.llm_max_tokens,
            temperature=settings.llm_temperature,
        )
    except httpx.HTTPError as exc:
        logger.exception("LLM upstream falló")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "El asistente no respondió a tiempo. Intentá de nuevo en un momento.",
        ) from exc

    sources = [
        ChunkSource(
            material_id=chunk.material_id,
            titulo=chunk.titulo,
            chunk_idx=chunk.chunk_idx,
            snippet=_truncate(chunk.content, _SNIPPET_LEN),
            distance=chunk.distance,
        )
        for chunk in chunks
    ]

    return ChatAskResponse(
        answer=answer,
        sources=sources,
        focus=payload.focus,
    )


def _truncate(text: str, limit: int) -> str:
    text = text.strip().replace("\n", " ")
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"

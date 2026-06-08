from __future__ import annotations

import json
import logging

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, SessionDep
from app.core.limiter import chat_rate_limit_key, limiter
from app.schemas.chat import ChatAskRequest, ChatAskResponse, ChunkSource
from app.services.embeddings import get_embedding_client
from app.services.llm_chat import (
    OFF_TOPIC_MESSAGE,
    STANDARD_REJECT_MESSAGE,
    SYSTEM_PROMPT,
    build_user_prompt,
    evaluate_guardrail,
    get_llm_client,
    search_context,
)
from app.core.config import get_settings
from app.core.user_errors import embedding_error_message, llm_error_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

_SNIPPET_LEN = 220


def _chat_limit() -> str:
    return get_settings().chat_rate_limit


@router.post("/ask", response_model=ChatAskResponse)
@limiter.limit(_chat_limit, key_func=chat_rate_limit_key)
async def ask(
    request: Request,
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
    del request
    prepared = await _prepare_ask(user, session, payload)
    if isinstance(prepared, ChatAskResponse):
        return prepared

    prompt, chunks, focus = prepared
    settings = get_settings()
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
            llm_error_message(),
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
        focus=focus,
    )


def _truncate(text: str, limit: int) -> str:
    text = text.strip().replace("\n", " ")
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


async def _prepare_ask(
    user: CurrentUser,
    session: SessionDep,
    payload: ChatAskRequest,
) -> tuple[str, list, str] | ChatAskResponse:
    """Devuelve (prompt, chunks, focus) o respuesta bloqueada."""
    del user

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
            embedding_error_message(exc),
        ) from exc
    if not vectors:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "No pudimos procesar tu consulta. Intentá de nuevo.",
        )

    chunks = await search_context(
        query_vector=vectors[0],
        session=session,
        focus=payload.focus,
        material_id=payload.material_id,
        top_k=settings.llm_top_k,
    )

    # Compuerta de relevancia: si el contexto recuperado está demasiado lejos
    # (consulta off-topic), cortamos sin gastar tokens del LLM.
    if settings.chat_relevance_enabled:
        best = min((c.distance for c in chunks), default=None)
        if best is None or best > settings.chat_relevance_max_distance:
            logger.info(
                "Consulta off-topic descartada (best_distance=%s, focus=%s)",
                best,
                payload.focus,
            )
            return ChatAskResponse(
                answer=OFF_TOPIC_MESSAGE,
                blocked=True,
                blocked_reason="off_topic",
                focus=payload.focus,
            )

    prompt = build_user_prompt(payload.content, chunks, payload.focus)
    return prompt, chunks, payload.focus


@router.post("/ask/stream")
@limiter.limit(_chat_limit, key_func=chat_rate_limit_key)
async def ask_stream(
    request: Request,
    user: CurrentUser,
    session: SessionDep,
    payload: ChatAskRequest,
) -> StreamingResponse:
    del request
    prepared = await _prepare_ask(user, session, payload)
    if isinstance(prepared, ChatAskResponse):
        async def blocked_gen():
            yield f"event: done\ndata: {json.dumps(prepared.model_dump(mode='json'))}\n\n"

        return StreamingResponse(blocked_gen(), media_type="text/event-stream")

    prompt, chunks, focus = prepared
    settings = get_settings()
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
    llm = get_llm_client()

    async def event_gen():
        try:
            async for delta in llm.stream(
                system=SYSTEM_PROMPT,
                user=prompt,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
            ):
                yield f"event: token\ndata: {json.dumps({'delta': delta})}\n\n"
            done = ChatAskResponse(answer="", sources=sources, focus=focus)
            yield f"event: done\ndata: {json.dumps(done.model_dump(mode='json'))}\n\n"
        except httpx.HTTPError:
            logger.exception("LLM stream falló")
            err = {"detail": llm_error_message()}
            yield f"event: error\ndata: {json.dumps(err)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

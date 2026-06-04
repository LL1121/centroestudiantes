from __future__ import annotations

import base64
import io
import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_URL_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)

# Categorías OpenAI relevantes para contenido adulto / explícito.
_NSFW_CATEGORIES = frozenset(
    {
        "sexual",
        "sexual/minors",
        "violence/graphic",
        "harassment/threatening",
    }
)


@dataclass(slots=True, frozen=True)
class ModerationVerdict:
    flagged: bool
    reason: str | None = None
    categories: tuple[str, ...] = ()


def _openai_configured() -> bool:
    return bool(get_settings().openai_api_key)


async def _call_moderation(input_payload: list[dict[str, object]]) -> ModerationVerdict:
    settings = get_settings()
    if not settings.moderation_enabled:
        return ModerationVerdict(False)
    if not _openai_configured():
        logger.warning("MODERATION_ENABLED pero sin OPENAI_API_KEY; se omite moderación")
        return ModerationVerdict(False)

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.post(
            "https://api.openai.com/v1/moderations",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": "omni-moderation-latest", "input": input_payload},
        )
        response.raise_for_status()
        data = response.json()

    results = data.get("results") or []
    if not results:
        return ModerationVerdict(False)

    flagged_cats: list[str] = []
    for result in results:
        cats = result.get("categories") or {}
        for name, is_flagged in cats.items():
            if is_flagged and name in _NSFW_CATEGORIES:
                flagged_cats.append(name)

    if flagged_cats:
        return ModerationVerdict(
            True,
            reason="contenido_explicito",
            categories=tuple(sorted(set(flagged_cats))),
        )
    return ModerationVerdict(False)


async def moderate_text(text: str) -> ModerationVerdict:
    snippet = text.strip()[:8000]
    if len(snippet) < 3:
        return ModerationVerdict(False)
    return await _call_moderation([{"type": "text", "text": snippet}])


async def moderate_image_bytes(image_bytes: bytes, mime: str = "image/jpeg") -> ModerationVerdict:
    if not image_bytes:
        return ModerationVerdict(False)
    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"
    return await _call_moderation([{"type": "image_url", "image_url": {"url": data_url}}])


async def moderate_pil_image(image) -> ModerationVerdict:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return await moderate_image_bytes(buf.getvalue(), "image/jpeg")


def check_blocked_links(text: str) -> ModerationVerdict:
    settings = get_settings()
    blocklist = set(settings.moderation_blocklist_domains)
    if not blocklist:
        return ModerationVerdict(False)
    for match in _URL_RE.finditer(text):
        host = (urlparse(match.group(0)).hostname or "").lower()
        if host in blocklist or any(host.endswith(f".{d}") for d in blocklist):
            return ModerationVerdict(True, reason="enlace_bloqueado", categories=("link",))
    return ModerationVerdict(False)


async def moderate_extracted_content(*, text: str, images: list) -> ModerationVerdict:
    """Texto + imágenes PIL opcionales (páginas PDF / uploads)."""
    link_verdict = check_blocked_links(text)
    if link_verdict.flagged:
        return link_verdict

    if text.strip():
        text_verdict = await moderate_text(text)
        if text_verdict.flagged:
            return text_verdict

    for image in images:
        img_verdict = await moderate_pil_image(image)
        if img_verdict.flagged:
            return img_verdict

    return ModerationVerdict(False)


async def moderate_file_at_path(path: str, mime_type: str) -> ModerationVerdict:
    """Moderación completa de un archivo en disco antes de indexar."""
    import asyncio

    from app.services.rag_processor import _extract_epub, _extract_ocr, _extract_pdf_native

    settings = get_settings()
    images: list = []
    text = ""

    if mime_type in ("image/jpeg", "image/png"):
        from PIL import Image

        with Image.open(path) as img:
            images = [img.copy()]
        text = await asyncio.to_thread(_extract_ocr, path)
    elif mime_type == "application/pdf":
        from pdf2image import convert_from_path

        max_pages = min(settings.moderation_max_pages, settings.ocr_max_pages)
        page_images = await asyncio.to_thread(
            convert_from_path,
            path,
            dpi=settings.ocr_dpi,
            first_page=1,
            last_page=max_pages,
        )
        images = page_images
        text = await asyncio.to_thread(_extract_pdf_native, path, max_pages=max_pages)
    elif mime_type == "application/epub+zip":
        text = await asyncio.to_thread(_extract_epub, path)
    else:
        return ModerationVerdict(False)

    return await moderate_extracted_content(text=text, images=images)

"""Public routes for anonymous onboarding sessions (parse, preview, PDF download)."""

from __future__ import annotations

import time
from threading import Lock
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile

from back.api.routes.export import generate_cv_filename
from back.engine.importer import (
    extract_text_from_pdf,
    parse_profile_from_text,
)
from back.engine.profile_assistant import clean_and_deduplicate_profile
from back.engine.llm import LLMClient
from back.engine.models import (
    AnonymousExportPdfRequest,
    AnonymousParseResponse,
    AnonymousPreviewRequest,
    AnonymousPreviewResponse,
    DesignKnobs,
    LangCode,
)
from back.engine.renderer import render_cv

router = APIRouter()

MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
SourceLangOption = Literal["auto", "es", "en"]


class IPRateLimiter:
    """In-memory sliding window rate limiter per client IP."""

    def __init__(self, max_requests: int = 3, window_seconds: float = 86400.0) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = {}
        self._lock = Lock()

    def check_and_record(self, ip: str) -> tuple[bool, int, float]:
        """Check if request is allowed for IP and record timestamp if so.

        Returns: (allowed, remaining, retry_after_seconds)
        """
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            timestamps = self._history.get(ip, [])
            valid_timestamps = [t for t in timestamps if t > cutoff]
            if len(valid_timestamps) >= self.max_requests:
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1.0, (oldest_in_window + self.window_seconds) - now)
                self._history[ip] = valid_timestamps
                return False, 0, retry_after

            valid_timestamps.append(now)
            self._history[ip] = valid_timestamps
            remaining = self.max_requests - len(valid_timestamps)
            if len(self._history) > 10000:
                self._history = {
                    k: v for k, v in self._history.items() if v and v[-1] > cutoff
                }
            return True, remaining, 0.0

    def reset(self) -> None:
        """Clear all recorded history (useful for test isolation)."""
        with self._lock:
            self._history.clear()


anonymous_rate_limiter = IPRateLimiter(max_requests=3, window_seconds=86400.0)


def get_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For header or direct client host."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.post("/parse", response_model=AnonymousParseResponse)
async def parse_anonymous(
    request: Request,
    file: UploadFile = File(...),
    source_lang: SourceLangOption = Form(default="auto"),
) -> AnonymousParseResponse:
    """Extract structured Profile from uploaded PDF/TXT for anonymous users.

    Rate-limited to 3 requests per IP per 24 hours.
    """
    client_ip = get_client_ip(request)
    allowed, _remaining, retry_after = anonymous_rate_limiter.check_and_record(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                "Límite de 3 parseos de CV por día alcanzado para sesiones anónimas. "
                "Iniciá sesión para continuar sin límites."
            ),
            headers={"Retry-After": str(int(retry_after))},
        )

    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Debe ser un archivo .pdf o .txt",
        )

    content = await file.read()
    if len(content) > MAX_IMPORT_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="El archivo excede el tamaño máximo permitido de 5 MB.",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="El archivo enviado está vacío.",
        )

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(content)
        else:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1")
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Error al procesar el archivo: {exc}",
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No se pudo extraer texto legible del archivo (verificá que no sea un PDF escaneado).",
        )

    try:
        llm = LLMClient()
        active_llm = llm if llm.is_configured else None
        forced_lang: LangCode | None = None if source_lang == "auto" else source_lang
        extracted = parse_profile_from_text(text, llm=active_llm, default_lang=forced_lang)
        if forced_lang is not None:
            extracted.base_lang = forced_lang
        detected_lang = extracted.base_lang
        extracted = clean_and_deduplicate_profile(extracted)

        return AnonymousParseResponse(
            profile=extracted,
            source_lang=source_lang,
            detected_lang=detected_lang,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al estructurar el perfil: {exc}",
        ) from exc


@router.post("/preview", response_model=AnonymousPreviewResponse)
def preview_anonymous(payload: AnonymousPreviewRequest) -> AnonymousPreviewResponse:
    """Render a RenderModel to SVG with fit telemetry for anonymous sessions."""
    try:
        active_model = payload.render_model

        # Ensure physical typography matches requested density
        active_model.design = DesignKnobs.from_density(
            active_model.design.density,
            font_family=active_model.design.font_family,
        )

        render_result = render_cv(
            active_model,
            include_svg=True,
            enforce_fit=False,
        )

        svg_str = ""
        if render_result.svg_pages:
            svg_str = render_result.svg_pages[0].decode("utf-8", errors="replace")

        return AnonymousPreviewResponse(
            svg=svg_str,
            fit_report=render_result.fit_report,
            render_model=active_model,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/pdf")
def export_anonymous_pdf(payload: AnonymousExportPdfRequest) -> Response:
    """Compile RenderModel to binary PDF for anonymous download."""
    try:
        model = payload.render_model

        model.design = DesignKnobs.from_density(
            model.design.density,
            font_family=model.design.font_family,
        )

        render_result = render_cv(
            model,
            include_svg=False,
            enforce_fit=False,
        )

        filename = generate_cv_filename(model, payload.role)

        return Response(
            content=render_result.pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Pdf-Sha256": render_result.pdf_sha256,
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

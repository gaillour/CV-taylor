"""Routes for managing the master profile."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from back.engine.importer import (
    extract_text_from_pdf,
    merge_profiles,
    parse_profile_from_text,
)
from back.engine.llm import LLMClient
from back.engine.models import Profile
from back.engine.profile_assistant import EnhanceProfileResponse, enhance_profile
from back.engine.profile_store import load_profile, save_profile

router = APIRouter()
MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("", response_model=Profile)
def get_master_profile() -> Profile:
    """Get the active Master Profile. Returns an empty Profile if missing."""
    try:
        return load_profile()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al cargar el perfil maestro: {exc}",
        ) from exc


@router.put("", response_model=Profile)
def update_master_profile(profile: Profile) -> Profile:
    """Update and persist the Master Profile to disk."""
    try:
        return save_profile(profile)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar el perfil maestro: {exc}",
        ) from exc


@router.post("/import", response_model=Profile)
async def import_master_profile(
    file: UploadFile = File(...),  # noqa: B008
    base_profile: str | None = Form(default=None),  # noqa: B008
) -> Profile:
    """Extract structured Profile from uploaded PDF/TXT and merge into Master Profile."""
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
            detail=(
                "No se pudo extraer texto legible del archivo "
                "(verificá que no sea un PDF escaneado)."
            ),
        )

    try:
        llm = LLMClient()
        active_llm = llm if llm.is_configured else None
        extracted = parse_profile_from_text(text, llm=active_llm)
        current_profile = (
            Profile.model_validate_json(base_profile) if base_profile else load_profile()
        )
        return merge_profiles(current_profile, extracted)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al estructurar el perfil: {exc}",
        ) from exc


@router.post("/enhance", response_model=EnhanceProfileResponse)
def enhance_master_profile(profile: Profile) -> EnhanceProfileResponse:
    """Run AI + heuristic enrichment pass on the provided Profile without persisting to disk."""
    try:
        llm = LLMClient()
        active_llm = llm if llm.is_configured else None
        return enhance_profile(profile, llm=active_llm)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al enriquecer el perfil con IA: {exc}",
        ) from exc

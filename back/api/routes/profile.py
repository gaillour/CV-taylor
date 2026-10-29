"""Routes for managing the master profile."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from back.api.auth import UserContext, get_current_user
from back.engine.importer import (
    extract_text_from_pdf,
    merge_profiles,
    parse_profile_from_text,
)
from back.engine.llm import LLMClient
from back.engine.models import Fact, LangCode, Profile
from back.engine.profile_assistant import EnhanceProfileResponse, enhance_profile
from back.engine.storage import StorageRepository, get_repo_for_user

router = APIRouter()
MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("", response_model=Profile)
def get_master_profile(
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> Profile:
    """Get the active Master Profile. Returns an empty Profile if missing."""
    try:
        return repo.get_profile()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al cargar el perfil maestro: {exc}",
        ) from exc


@router.put("", response_model=Profile)
def update_master_profile(
    profile: Profile,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> Profile:
    """Update and persist the Master Profile to storage."""
    try:
        return repo.save_profile(profile)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar el perfil maestro: {exc}",
        ) from exc


class UpsertBulletFactRequest(BaseModel):
    """Payload to save an edited bullet back to the master profile."""

    model_config = ConfigDict(extra="forbid")

    entry_id: str
    fact_id: str | None = None
    text: str = Field(min_length=1)
    lang: LangCode = "es"
    skill_ids: list[str] = Field(default_factory=list)


class UpsertBulletFactResponse(BaseModel):
    """Response returned when a bullet is saved back to master profile."""

    fact: Fact
    created: bool
    profile: Profile


@router.post("/facts/upsert", response_model=UpsertBulletFactResponse)
def upsert_bullet_fact(
    payload: UpsertBulletFactRequest,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> UpsertBulletFactResponse:
    """Upsert a bullet point fact back into the master profile."""
    try:
        updated_profile, fact, created = repo.upsert_fact(
            entry_id=payload.entry_id,
            text=payload.text,
            lang=payload.lang,
            fact_id=payload.fact_id,
            skill_ids=payload.skill_ids,
        )
        return UpsertBulletFactResponse(
            fact=fact,
            created=created,
            profile=updated_profile,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Entrada no encontrada en el perfil maestro: {payload.entry_id}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar viñeta en el perfil: {exc}",
        ) from exc


@router.post("/import", response_model=Profile)
async def import_master_profile(
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
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
            Profile.model_validate_json(base_profile) if base_profile else repo.get_profile()
        )
        return merge_profiles(current_profile, extracted)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al estructurar el perfil: {exc}",
        ) from exc


@router.post("/enhance", response_model=EnhanceProfileResponse)
def enhance_master_profile(
    profile: Profile,
    _user: Annotated[UserContext, Depends(get_current_user)],
) -> EnhanceProfileResponse:
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

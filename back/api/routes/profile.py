"""Routes for managing the master profile."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from back.engine.models import Profile
from back.engine.profile_store import load_profile, save_profile

router = APIRouter()


@router.get("", response_model=Profile)
def get_master_profile() -> Profile:
    """Get the active Master Profile, automatically seeded if missing."""
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

"""Supabase authentication and JWT verification for FastAPI."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_env_if_needed() -> None:
    """Populate os.environ from .env or front/.env.local outside of pytest runs."""
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    candidates = (
        PROJECT_ROOT / ".env",
        PROJECT_ROOT / "front" / ".env.local",
        PROJECT_ROOT / "front" / ".env",
        Path(".env"),
        Path("front/.env.local"),
    )
    for candidate in candidates:
        if not candidate.is_file():
            continue
        try:
            for raw_line in candidate.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                k = key.strip()
                v = val.strip().strip("'").strip('"')
                if k and k not in os.environ:
                    os.environ[k] = v
        except Exception:
            continue


def get_supabase_config() -> tuple[str, str] | None:
    """Return (supabase_url, supabase_anon_key) if configured, or None for local mode."""
    _load_env_if_needed()
    url = (
        os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    ).strip()
    anon_key = (
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
        or ""
    ).strip()
    if url and anon_key:
        return url.rstrip("/"), anon_key
    return None


def is_supabase_configured() -> bool:
    """Check whether Supabase Cloud persistence is active."""
    return get_supabase_config() is not None


class AuthConfigResponse(BaseModel):
    """Public Supabase configuration for the frontend client."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool
    supabase_url: str = ""
    supabase_anon_key: str = ""


@router.get("/config", response_model=AuthConfigResponse)
def get_auth_config() -> AuthConfigResponse:
    """Return public Supabase URL and anon key so the frontend can initialize without rebuilds."""
    cfg = get_supabase_config()
    if cfg is None:
        return AuthConfigResponse(enabled=False)
    url, anon_key = cfg
    return AuthConfigResponse(
        enabled=True,
        supabase_url=url,
        supabase_anon_key=anon_key,
    )


class UserContext(BaseModel):
    """Authenticated user context resolved per request."""

    model_config = ConfigDict(extra="forbid")

    user_id: str
    email: str | None = None
    access_token: str | None = None
    is_cloud: bool = False


def verify_supabase_token(
    url: str,
    anon_key: str,
    token: str,
    *,
    transport: httpx.BaseTransport | None = None,
) -> UserContext:
    """Validate Bearer JWT against Supabase Auth (/auth/v1/user)."""
    if not token:
        raise HTTPException(status_code=401, detail="Token de acceso vacío.")

    try:
        with httpx.Client(timeout=10.0, transport=transport) as client:
            res = client.get(
                f"{url}/auth/v1/user",
                headers={
                    "apikey": anon_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo verificar la sesión con Supabase Auth: {exc}",
        ) from exc

    if res.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Sesión inválida o expirada.",
        )

    data = res.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Respuesta de Supabase Auth sin identificador de usuario.",
        )

    return UserContext(
        user_id=str(user_id),
        email=data.get("email"),
        access_token=token,
        is_cloud=True,
    )


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> UserContext:
    """FastAPI dependency that resolves the authenticated user or falls back to local mode."""
    cfg = get_supabase_config()
    if cfg is None:
        return UserContext(user_id="local", email=None, access_token=None, is_cloud=False)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida (Bearer token ausente).",
        )

    token = authorization.split(" ", 1)[1].strip()
    url, anon_key = cfg
    return verify_supabase_token(url, anon_key, token)


class SyncLocalResponse(BaseModel):
    """Summary of local-to-cloud data migration."""

    model_config = ConfigDict(extra="forbid")

    profile_synced: bool
    snapshots_synced: int


@router.post("/sync-local", response_model=SyncLocalResponse)
def sync_local_to_cloud(
    user: Annotated[UserContext, Depends(get_current_user)],
) -> SyncLocalResponse:
    """Push local out/profile.json and out/snapshots/*.json into the authenticated Supabase user."""
    if not user.is_cloud or not user.access_token:
        raise HTTPException(
            status_code=400,
            detail="Sincronización disponible únicamente con sesión activa en modo Cloud.",
        )

    cfg = get_supabase_config()
    if cfg is None:
        raise HTTPException(status_code=400, detail="Supabase no está configurado.")

    from back.engine.profile_store import is_profile_empty
    from back.engine.storage import LocalStorageRepository, SupabaseStorageRepository

    url, anon_key = cfg
    local_repo = LocalStorageRepository()
    cloud_repo = SupabaseStorageRepository(
        url=url,
        anon_key=anon_key,
        user_id=user.user_id,
        access_token=user.access_token,
    )

    profile_synced = False
    local_profile = local_repo.get_profile()
    if not is_profile_empty(local_profile):
        cloud_repo.save_profile(local_profile)
        profile_synced = True

    existing_cloud_ids = {
        s.id for s in cloud_repo.list_snapshots(include_deleted=True)
    }
    local_snapshots = local_repo.list_snapshots(include_deleted=True)
    # Ordenar de más antiguo a más reciente para respetar FK parent_id
    local_snapshots.sort(key=lambda s: s.created_at)

    snapshots_synced = 0
    for snap in local_snapshots:
        if snap.id in existing_cloud_ids:
            continue
        if snap.parent_id and snap.parent_id not in existing_cloud_ids:
            snap = snap.model_copy(update={"parent_id": None})
        cloud_repo.save_snapshot(snap)
        existing_cloud_ids.add(snap.id)
        snapshots_synced += 1

    return SyncLocalResponse(
        profile_synced=profile_synced,
        snapshots_synced=snapshots_synced,
    )


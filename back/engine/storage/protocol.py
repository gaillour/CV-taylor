"""Storage repository interface and user repo resolution."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Protocol

from fastapi import Depends

from back.api.auth import UserContext, get_current_user, get_supabase_config
from back.engine.mirror import ProfileMirror
from back.engine.models import Fact, Profile, TailorQuotaResponse
from back.engine.snapshot import Snapshot


class StorageRepository(Protocol):
    """Abstract repository for persisting profiles and immutable snapshots."""

    def get_profile(self) -> Profile: ...

    def save_profile(self, profile: Profile) -> Profile: ...

    def get_mirror(self) -> ProfileMirror | None: ...

    def save_mirror(self, mirror: ProfileMirror) -> None: ...

    def upsert_fact(
        self,
        *,
        entry_id: str,
        text: str,
        fact_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> tuple[Profile, Fact, bool]: ...

    def list_snapshots(self, *, include_deleted: bool = False) -> list[Snapshot]: ...

    def get_snapshot(self, snapshot_id: str) -> Snapshot: ...

    def save_snapshot(
        self, snapshot: Snapshot, *, pdf_bytes: bytes | None = None
    ) -> Path | str: ...

    def soft_delete_snapshot(self, snapshot_id: str) -> str: ...

    def save_avatar(self, content: bytes, extension: str = "jpg") -> str: ...

    def delete_avatar(self) -> None: ...

    def get_tailor_quota(self) -> TailorQuotaResponse: ...

    def increment_tailor_usage(self) -> TailorQuotaResponse: ...


def get_repo_for_user(
    user: Annotated[UserContext, Depends(get_current_user)],
) -> StorageRepository:
    """Resolve user-scoped SupabaseStorageRepository or fallback to LocalStorageRepository."""
    from back.engine.storage.local import LocalStorageRepository
    from back.engine.storage.supabase import SupabaseStorageRepository

    if user.is_cloud:
        cfg = get_supabase_config()
        if cfg and user.access_token:
            url, anon_key = cfg
            return SupabaseStorageRepository(
                url=url,
                anon_key=anon_key,
                user_id=user.user_id,
                access_token=user.access_token,
            )
    return LocalStorageRepository()

"""Storage repository abstractions for CV Tailor (Local / Supabase dual mode)."""

from __future__ import annotations

from back.engine.storage.local import (
    DEFAULT_OUT_DIR,
    DEFAULT_PROFILE_FILENAME,
    DEFAULT_SEED_PATH,
    LocalStorageRepository,
    create_empty_profile,
    get_avatars_dir,
    get_default_profile_path,
    get_out_dir,
    get_profile_path,
    is_profile_empty,
    load_or_create_profile,
    load_profile,
    save_profile,
    seed_profile_if_missing,
    upsert_fact_in_profile,
    upsert_fact_on_disk,
)
from back.engine.storage.protocol import StorageRepository, get_repo_for_user
from back.engine.storage.supabase import SupabaseStorageRepository

__all__ = [
    "DEFAULT_OUT_DIR",
    "DEFAULT_PROFILE_FILENAME",
    "DEFAULT_SEED_PATH",
    "LocalStorageRepository",
    "StorageRepository",
    "SupabaseStorageRepository",
    "create_empty_profile",
    "get_avatars_dir",
    "get_default_profile_path",
    "get_out_dir",
    "get_profile_path",
    "get_repo_for_user",
    "is_profile_empty",
    "load_or_create_profile",
    "load_profile",
    "save_profile",
    "seed_profile_if_missing",
    "upsert_fact_in_profile",
    "upsert_fact_on_disk",
]

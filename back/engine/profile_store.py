"""Shim module re-exporting disk profile helpers from back.engine.storage.local."""

from __future__ import annotations

from back.engine.storage.local import (
    DEFAULT_OUT_DIR,
    DEFAULT_PROFILE_FILENAME,
    DEFAULT_SEED_PATH,
    create_empty_profile,
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

__all__ = [
    "DEFAULT_OUT_DIR",
    "DEFAULT_PROFILE_FILENAME",
    "DEFAULT_SEED_PATH",
    "create_empty_profile",
    "get_default_profile_path",
    "get_out_dir",
    "get_profile_path",
    "is_profile_empty",
    "load_or_create_profile",
    "load_profile",
    "save_profile",
    "seed_profile_if_missing",
    "upsert_fact_in_profile",
    "upsert_fact_on_disk",
]

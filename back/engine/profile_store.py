from __future__ import annotations

import os
import shutil
from pathlib import Path

from back.engine.models import ContactInfo, Profile

DEFAULT_SEED_PATH = Path("fixtures/profile_juan.json")
DEFAULT_OUT_DIR = Path("out")
DEFAULT_PROFILE_FILENAME = "profile.json"


def create_empty_profile() -> Profile:
    """Return a valid empty Profile without persisting to disk."""
    return Profile(
        id="default",
        full_name="",
        contact=ContactInfo(email="", phone="", location=""),
        default_lang="es",
        skills=[],
        entries=[],
    )


def is_profile_empty(profile: Profile) -> bool:
    """Check if a profile is completely blank (no name, entries or skills)."""
    return not profile.full_name.strip() and len(profile.entries) == 0 and len(profile.skills) == 0


def get_profile_path() -> Path:
    """Return the active master profile path, respecting ENV override if provided."""
    custom_path = os.getenv("CVT_PROFILE_PATH")
    if custom_path:
        return Path(custom_path)
    return DEFAULT_OUT_DIR / DEFAULT_PROFILE_FILENAME


def seed_profile_if_missing(
    profile_path: Path | None = None, seed_path: Path = DEFAULT_SEED_PATH
) -> Path:
    """Ensure the target profile file exists, copying from seed fixture if missing."""
    target = profile_path or get_profile_path()
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        if seed_path.exists():
            shutil.copyfile(seed_path, target)
        else:
            raise FileNotFoundError(f"Neither profile nor seed found: {target}, {seed_path}")
    return target


def load_profile(profile_path: Path | None = None) -> Profile:
    """Load and validate the master profile. Returns an empty Profile if missing."""
    target = profile_path or get_profile_path()
    if not target.exists():
        return create_empty_profile()
    return Profile.from_json(target)


def save_profile(profile: Profile, profile_path: Path | None = None) -> Profile:
    """Save and validate the master profile to disk."""
    target = profile_path or get_profile_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    profile.to_json(target)
    return profile

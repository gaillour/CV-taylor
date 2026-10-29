from __future__ import annotations

import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from back.engine.models import ContactInfo, Fact, LangCode, Profile

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


def upsert_fact_in_profile(
    profile: Profile,
    *,
    entry_id: str,
    text: str,
    lang: LangCode = "es",
    fact_id: str | None = None,
    skill_ids: list[str] | None = None,
) -> tuple[Profile, Fact, bool]:
    """Upsert a bullet point fact back into the master profile.

    - If fact_id matches an existing fact: updates text, marks approved=True, source='user'.
    - If fact_id is None or missing: appends a new Fact with approved=True, source='user'.
    - Returns (updated_profile, saved_fact, created_boolean).
    - Raises KeyError if entry_id is not found in the profile.
    """
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("El texto de la viñeta no puede estar vacío.")

    target_entry = None
    for entry in profile.entries:
        if entry.id == entry_id:
            target_entry = entry
            break

    if target_entry is None:
        raise KeyError(f"Entrada no encontrada en el perfil: {entry_id}")

    now_iso = datetime.now(UTC).isoformat()
    matched_fact: Fact | None = None

    if fact_id:
        for f in target_entry.facts:
            if f.id == fact_id:
                matched_fact = f
                break

    if matched_fact is not None:
        matched_fact.text = clean_text
        matched_fact.lang = lang
        matched_fact.approved = True
        matched_fact.approved_at = now_iso
        matched_fact.source = "user"
        matched_fact.proposed_text = None
        if skill_ids is not None:
            matched_fact.skill_ids = skill_ids
        return profile, matched_fact, False

    new_fact_id = fact_id or f"fact_{uuid.uuid4().hex[:8]}"
    new_position = len(target_entry.facts)
    new_fact = Fact(
        id=new_fact_id,
        entry_id=entry_id,
        text=clean_text,
        lang=lang,
        tags=[],
        skill_ids=skill_ids or [],
        position=new_position,
        pinned=False,
        weight=100,
        default_selected=True,
        source="user",
        approved=True,
        approved_at=now_iso,
    )
    target_entry.facts.append(new_fact)
    return profile, new_fact, True

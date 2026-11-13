"""Local filesystem repository and profile persistence (absorbed from profile_store)."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from back.engine.mirror import ProfileMirror
from back.engine.models import ContactInfo, Fact, Profile, TailorQuotaResponse
from back.engine.snapshot import Snapshot

DEFAULT_SEED_PATH = Path("fixtures/profile_juan.json")
DEFAULT_OUT_DIR = Path("out")
DEFAULT_PROFILE_FILENAME = "profile.json"
DELETED_REGISTRY_FILENAME = "_deleted.json"
DEFAULT_AVATARS_DIR = Path("out/avatars")


def create_empty_profile() -> Profile:
    """Return a valid empty Profile without persisting to disk."""
    return Profile(
        id="default",
        full_name="",
        contact=ContactInfo(email="", phone="", location=""),
        base_lang="es",
        skills=[],
        entries=[],
    )


def is_profile_empty(profile: Profile) -> bool:
    """Check if a profile is completely blank (no name, entries or skills)."""
    return not profile.full_name.strip() and len(profile.entries) == 0 and len(profile.skills) == 0


def get_out_dir() -> Path:
    """Return the active output directory, falling back to /tmp if unwritable."""
    custom_dir = os.getenv("CVT_OUT_DIR")
    if custom_dir:
        p = Path(custom_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    default_dir = DEFAULT_OUT_DIR
    try:
        default_dir.mkdir(parents=True, exist_ok=True)
        test_file = default_dir / ".write_test"
        test_file.touch(exist_ok=True)
        test_file.unlink(missing_ok=True)
        return default_dir
    except (OSError, PermissionError):
        fallback = Path("/tmp/cv-tailor/out")
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def get_profile_path() -> Path:
    """Return the active master profile path, respecting ENV override if provided."""
    custom_path = os.getenv("CVT_PROFILE_PATH")
    if custom_path:
        return Path(custom_path)
    return get_out_dir() / DEFAULT_PROFILE_FILENAME


get_default_profile_path = get_profile_path


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


load_or_create_profile = load_profile


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
    fact_id: str | None = None,
    skill_ids: list[str] | None = None,
) -> tuple[Profile, Fact, bool]:
    """Upsert a bullet point fact back into the master profile."""
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


def upsert_fact_on_disk(
    *,
    entry_id: str,
    text: str,
    fact_id: str | None = None,
    skill_ids: list[str] | None = None,
    profile_path: Path | None = None,
) -> tuple[Profile, Fact, bool]:
    """Convenience disk helper wrapping LocalStorageRepository.upsert_fact."""
    repo = LocalStorageRepository(profile_path=profile_path)
    return repo.upsert_fact(
        entry_id=entry_id,
        text=text,
        fact_id=fact_id,
        skill_ids=skill_ids,
    )


def get_avatars_dir() -> Path:
    custom = os.getenv("CVT_AVATARS_DIR")
    if custom:
        return Path(custom)
    return get_out_dir() / "avatars"


class LocalStorageRepository:
    """Local filesystem repository.

    Maintains strict snapshot immutability:
    Exported snapshot files (snap_*.json) are never altered or deleted.
    Soft deletion is recorded in out/snapshots/_deleted.json.
    """

    @property
    def snapshots_dir(self) -> Path:
        if self._snapshots_dir:
            return self._snapshots_dir
        custom = os.getenv("CVT_SNAPSHOTS_DIR")
        return Path(custom) if custom else get_out_dir() / "snapshots"

    @snapshots_dir.setter
    def snapshots_dir(self, val: Path | None) -> None:
        self._snapshots_dir = val

    def __init__(self, snapshots_dir: Path | None = None, profile_path: Path | None = None):
        self._snapshots_dir = snapshots_dir
        self.profile_path = profile_path

    def _deleted_registry_path(self) -> Path:
        return self.snapshots_dir / DELETED_REGISTRY_FILENAME

    def _get_deleted_map(self) -> dict[str, str]:
        path = self._deleted_registry_path()
        if not path.is_file():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_deleted_map(self, data: dict[str, str]) -> None:
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self._deleted_registry_path().write_text(
            json.dumps(data, indent=2),
            encoding="utf-8",
        )

    def get_profile(self) -> Profile:
        return load_profile(self.profile_path)

    def save_profile(self, profile: Profile) -> Profile:
        return save_profile(profile, self.profile_path)

    def _mirror_path(self) -> Path:
        target = self.profile_path or get_profile_path()
        return target.with_name(f"{target.stem}.mirror.json")

    def get_mirror(self) -> ProfileMirror | None:
        path = self._mirror_path()
        if not path.is_file():
            return None
        try:
            return ProfileMirror.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def save_mirror(self, mirror: ProfileMirror) -> None:
        path = self._mirror_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(mirror.model_dump_json(indent=2, exclude_none=True), encoding="utf-8")

    def upsert_fact(
        self,
        *,
        entry_id: str,
        text: str,
        fact_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> tuple[Profile, Fact, bool]:
        prof = self.get_profile()
        updated_prof, fact, created = upsert_fact_in_profile(
            prof,
            entry_id=entry_id,
            text=text,
            fact_id=fact_id,
            skill_ids=skill_ids,
        )
        self.save_profile(updated_prof)
        return updated_prof, fact, created

    def list_snapshots(self, *, include_deleted: bool = False) -> list[Snapshot]:
        if not self.snapshots_dir.is_dir():
            return []

        deleted_map = self._get_deleted_map()
        results: list[Snapshot] = []

        for path in self.snapshots_dir.glob("snap_*.json"):
            try:
                snap = Snapshot.load(path)
            except Exception:
                continue

            del_timestamp = deleted_map.get(snap.id)
            if del_timestamp:
                snap.deleted_at = del_timestamp

            if not include_deleted and snap.deleted_at is not None:
                continue

            results.append(snap)

        results.sort(key=lambda s: s.created_at, reverse=True)
        return results

    def get_snapshot(self, snapshot_id: str) -> Snapshot:
        path = self.snapshots_dir / f"{snapshot_id}.json"
        if not path.is_file():
            raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")

        snap = Snapshot.load(path)
        deleted_map = self._get_deleted_map()
        if snap.id in deleted_map:
            snap.deleted_at = deleted_map[snap.id]
        return snap

    def save_snapshot(
        self, snapshot: Snapshot, *, pdf_bytes: bytes | None = None
    ) -> Path | str:
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        out_file = self.snapshots_dir / f"{snapshot.id}.json"
        snapshot.save(out_file)
        return out_file

    def soft_delete_snapshot(self, snapshot_id: str) -> str:
        path = self.snapshots_dir / f"{snapshot_id}.json"
        if not path.is_file():
            raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")

        deleted_map = self._get_deleted_map()
        now_iso = datetime.now(UTC).isoformat()
        deleted_map[snapshot_id] = now_iso
        self._save_deleted_map(deleted_map)
        return now_iso

    def save_avatar(self, content: bytes, extension: str = "jpg") -> str:
        avatars_dir = get_avatars_dir()
        avatars_dir.mkdir(parents=True, exist_ok=True)
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        ext = extension.lstrip(".") or "jpg"
        filename = f"{content_hash}.{ext}"
        target = avatars_dir / filename
        target.write_bytes(content)
        return f"/api/avatars/{filename}"

    def delete_avatar(self) -> None:
        prof = self.get_profile()
        prof.contact.photo_url = None
        self.save_profile(prof)

    def _tailor_quota_path(self) -> Path:
        target = self.profile_path or get_profile_path()
        return target.parent / "tailor_quota.json"

    def get_tailor_quota(self) -> TailorQuotaResponse:
        path = self._tailor_quota_path()
        if not path.is_file():
            return TailorQuotaResponse(
                used_count=0,
                limit=2,
                has_active_pass=False,
                can_tailor=True,
            )
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            used = int(raw.get("used_count", 0))
            has_pass = bool(raw.get("has_active_pass", False))
            return TailorQuotaResponse(
                used_count=used,
                limit=2,
                has_active_pass=has_pass,
                can_tailor=has_pass or (used < 2),
            )
        except Exception:
            return TailorQuotaResponse(
                used_count=0,
                limit=2,
                has_active_pass=False,
                can_tailor=True,
            )

    def increment_tailor_usage(self) -> TailorQuotaResponse:
        quota = self.get_tailor_quota()
        new_count = quota.used_count + 1
        path = self._tailor_quota_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "used_count": new_count,
            "has_active_pass": quota.has_active_pass,
        }
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return TailorQuotaResponse(
            used_count=new_count,
            limit=quota.limit,
            has_active_pass=quota.has_active_pass,
            can_tailor=quota.has_active_pass or (new_count < quota.limit),
        )

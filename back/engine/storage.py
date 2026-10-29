"""Storage repository abstractions for CV Tailor (Local / Supabase dual mode)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Protocol

import httpx
from fastapi import Depends

from back.api.auth import UserContext, get_current_user, get_supabase_config
from back.api.routes import export as export_routes
from back.engine.models import Fact, LangCode, Profile
from back.engine.profile_store import (
    create_empty_profile,
    load_profile,
    save_profile,
    upsert_fact_in_profile,
)
from back.engine.snapshot import Snapshot

DELETED_REGISTRY_FILENAME = "_deleted.json"
DEFAULT_SNAPSHOTS_BUCKET = "cv-snapshots"


class SnapshotSummaryDict(dict):
    """Dictionary representation of a SnapshotSummary."""


class StorageRepository(Protocol):
    """Abstract repository for persisting profiles and immutable snapshots."""

    def get_profile(self) -> Profile: ...

    def save_profile(self, profile: Profile) -> Profile: ...

    def upsert_fact(
        self,
        *,
        entry_id: str,
        text: str,
        lang: LangCode,
        fact_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> tuple[Profile, Fact, bool]: ...

    def list_snapshots(self, *, include_deleted: bool = False) -> list[Snapshot]: ...

    def get_snapshot(self, snapshot_id: str) -> Snapshot: ...

    def save_snapshot(
        self, snapshot: Snapshot, *, pdf_bytes: bytes | None = None
    ) -> Path | str: ...

    def soft_delete_snapshot(self, snapshot_id: str) -> str: ...


class LocalStorageRepository:
    """Local filesystem repository.

    Maintains strict snapshot immutability:
    Exported snapshot files (snap_*.json) are never altered or deleted.
    Soft deletion is recorded in out/snapshots/_deleted.json.
    """

    @property
    def snapshots_dir(self) -> Path:
        return self._snapshots_dir or export_routes.SNAPSHOTS_DIR

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

    def upsert_fact(
        self,
        *,
        entry_id: str,
        text: str,
        lang: LangCode,
        fact_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> tuple[Profile, Fact, bool]:
        prof = self.get_profile()
        updated_prof, fact, created = upsert_fact_in_profile(
            prof,
            entry_id=entry_id,
            text=text,
            lang=lang,
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


class SupabaseStorageRepository:
    """Supabase Postgres + Storage repository respecting user RLS via Bearer JWT."""

    def __init__(
        self,
        url: str,
        anon_key: str,
        user_id: str,
        access_token: str,
        *,
        bucket: str = DEFAULT_SNAPSHOTS_BUCKET,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.url = url.rstrip("/")
        self.anon_key = anon_key
        self.user_id = user_id
        self.access_token = access_token
        self.bucket = bucket
        self.transport = transport

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        if extra:
            headers.update(extra)
        return headers

    def get_profile(self) -> Profile:
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.get(
                f"{self.url}/rest/v1/profiles",
                params={"user_id": f"eq.{self.user_id}", "select": "data"},
                headers=self._headers(),
            )
        if res.status_code != 200:
            raise RuntimeError(
                f"Error al cargar perfil de Supabase ({res.status_code}): {res.text}"
            )
        rows = res.json()
        if not rows:
            return create_empty_profile()
        return Profile.model_validate(rows[0]["data"])

    def save_profile(self, profile: Profile) -> Profile:
        payload = {
            "user_id": self.user_id,
            "data": profile.model_dump(mode="json"),
            "updated_at": datetime.now(UTC).isoformat(),
        }
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.post(
                f"{self.url}/rest/v1/profiles",
                params={"on_conflict": "user_id"},
                headers=self._headers(
                    {"Prefer": "resolution=merge-duplicates,return=representation"}
                ),
                json=payload,
            )
        if res.status_code not in (200, 201):
            raise RuntimeError(
                f"Error al guardar perfil en Supabase ({res.status_code}): {res.text}"
            )
        return profile

    def upsert_fact(
        self,
        *,
        entry_id: str,
        text: str,
        lang: LangCode,
        fact_id: str | None = None,
        skill_ids: list[str] | None = None,
    ) -> tuple[Profile, Fact, bool]:
        prof = self.get_profile()
        updated_prof, fact, created = upsert_fact_in_profile(
            prof,
            entry_id=entry_id,
            text=text,
            lang=lang,
            fact_id=fact_id,
            skill_ids=skill_ids,
        )
        self.save_profile(updated_prof)
        return updated_prof, fact, created

    def list_snapshots(self, *, include_deleted: bool = False) -> list[Snapshot]:
        params: dict[str, str] = {
            "user_id": f"eq.{self.user_id}",
            "select": "snapshot_data,deleted_at",
            "order": "created_at.desc",
        }
        if not include_deleted:
            params["deleted_at"] = "is.null"

        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.get(
                f"{self.url}/rest/v1/snapshots",
                params=params,
                headers=self._headers(),
            )
        if res.status_code != 200:
            raise RuntimeError(
                f"Error al listar snapshots en Supabase ({res.status_code}): {res.text}"
            )

        results: list[Snapshot] = []
        for row in res.json():
            try:
                snap = Snapshot.model_validate(row["snapshot_data"])
                if row.get("deleted_at"):
                    snap.deleted_at = row["deleted_at"]
                if not include_deleted and snap.deleted_at is not None:
                    continue
                results.append(snap)
            except Exception:
                continue

        results.sort(key=lambda s: s.created_at, reverse=True)
        return results

    def get_snapshot(self, snapshot_id: str) -> Snapshot:
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.get(
                f"{self.url}/rest/v1/snapshots",
                params={
                    "id": f"eq.{snapshot_id}",
                    "user_id": f"eq.{self.user_id}",
                    "select": "snapshot_data,deleted_at",
                },
                headers=self._headers(),
            )
        if res.status_code != 200:
            raise RuntimeError(
                f"Error al obtener snapshot en Supabase ({res.status_code}): {res.text}"
            )
        rows = res.json()
        if not rows:
            raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")

        snap = Snapshot.model_validate(rows[0]["snapshot_data"])
        if rows[0].get("deleted_at"):
            snap.deleted_at = rows[0]["deleted_at"]
        return snap

    def save_snapshot(
        self, snapshot: Snapshot, *, pdf_bytes: bytes | None = None
    ) -> Path | str:
        json_bytes = snapshot.model_dump_json(indent=2).encode("utf-8")
        json_object_path = f"{self.user_id}/{snapshot.id}.json"

        with httpx.Client(timeout=20.0, transport=self.transport) as client:
            # 1. Subir artefacto JSON inmutable al bucket
            storage_res = client.post(
                f"{self.url}/storage/v1/object/{self.bucket}/{json_object_path}",
                headers=self._headers(
                    {
                        "Content-Type": "application/json",
                        "x-upsert": "false",
                    }
                ),
                content=json_bytes,
            )
            if storage_res.status_code not in (200, 201):
                raise RuntimeError(
                    f"Error al subir snapshot JSON a Storage ({storage_res.status_code}): "
                    f"{storage_res.text}"
                )

            # 2. Subir artefacto PDF inmutable al bucket si fue provisto
            if pdf_bytes is not None:
                pdf_object_path = f"{self.user_id}/{snapshot.id}.pdf"
                pdf_res = client.post(
                    f"{self.url}/storage/v1/object/{self.bucket}/{pdf_object_path}",
                    headers=self._headers(
                        {
                            "Content-Type": "application/pdf",
                            "x-upsert": "false",
                        }
                    ),
                    content=pdf_bytes,
                )
                if pdf_res.status_code not in (200, 201):
                    raise RuntimeError(
                        f"Error al subir snapshot PDF a Storage ({pdf_res.status_code}): "
                        f"{pdf_res.text}"
                    )

            # 3. Registrar fila en tabla public.snapshots
            row_payload = {
                "id": snapshot.id,
                "user_id": self.user_id,
                "parent_id": snapshot.parent_id,
                "company": snapshot.company,
                "role": snapshot.role,
                "lang": snapshot.lang,
                "theme": snapshot.theme,
                "pdf_sha256": snapshot.pdf_sha256,
                "ats_score": snapshot.ats_score,
                "snapshot_data": snapshot.model_dump(mode="json"),
                "created_at": snapshot.created_at,
                "deleted_at": snapshot.deleted_at,
            }
            db_res = client.post(
                f"{self.url}/rest/v1/snapshots",
                headers=self._headers({"Prefer": "return=minimal"}),
                json=row_payload,
            )
            if db_res.status_code not in (200, 201):
                raise RuntimeError(
                    f"Error al insertar snapshot en Postgres ({db_res.status_code}): "
                    f"{db_res.text}"
                )

        return f"supabase://{self.bucket}/{json_object_path}"

    def soft_delete_snapshot(self, snapshot_id: str) -> str:
        now_iso = datetime.now(UTC).isoformat()
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.patch(
                f"{self.url}/rest/v1/snapshots",
                params={
                    "id": f"eq.{snapshot_id}",
                    "user_id": f"eq.{self.user_id}",
                },
                headers=self._headers({"Prefer": "return=representation"}),
                json={"deleted_at": now_iso},
            )
        if res.status_code not in (200, 204):
            raise RuntimeError(
                f"Error al archivar snapshot en Supabase ({res.status_code}): {res.text}"
            )
        rows = res.json() if res.content else []
        if not rows:
            raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")
        return str(rows[0].get("deleted_at") or now_iso)


_STORAGE_REPO: StorageRepository | None = None


def get_storage_repo() -> StorageRepository:
    """Get active local storage repository singleton."""
    global _STORAGE_REPO
    if _STORAGE_REPO is None:
        _STORAGE_REPO = LocalStorageRepository()
    return _STORAGE_REPO


def get_repo_for_user(
    user: Annotated[UserContext, Depends(get_current_user)],
) -> StorageRepository:
    """Resolve user-scoped SupabaseStorageRepository or fallback to LocalStorageRepository."""
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
    return get_storage_repo()

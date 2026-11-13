"""Supabase Postgres + Storage repository implementation (REST + Storage Buckets)."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from pathlib import Path

import httpx

from back.engine.mirror import ProfileMirror
from back.engine.models import Fact, Profile, TailorQuotaResponse
from back.engine.snapshot import Snapshot
from back.engine.storage.local import create_empty_profile, upsert_fact_in_profile

DEFAULT_SNAPSHOTS_BUCKET = "cv-snapshots"
DEFAULT_AVATARS_BUCKET = "avatars"


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

    def get_mirror(self) -> ProfileMirror | None:
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.get(
                f"{self.url}/rest/v1/profiles",
                params={"user_id": f"eq.{self.user_id}", "select": "mirror"},
                headers=self._headers(),
            )
        if res.status_code == 400 and "42703" in res.text:
            # Columna mirror no existe aún en la base de datos (migración pendiente)
            return None
        if res.status_code != 200:
            raise RuntimeError(
                f"Error al cargar espejo de Supabase ({res.status_code}): {res.text}"
            )
        rows = res.json()
        if not rows or not rows[0].get("mirror"):
            return None
        try:
            return ProfileMirror.model_validate(rows[0]["mirror"])
        except Exception:
            return None

    def save_mirror(self, mirror: ProfileMirror) -> None:
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.patch(
                f"{self.url}/rest/v1/profiles",
                params={"user_id": f"eq.{self.user_id}"},
                headers=self._headers({"Prefer": "return=minimal"}),
                json={"mirror": mirror.model_dump(mode="json")},
            )
        if res.status_code in (400, 404) and "42703" in res.text:
            # Columna mirror no existe aún en la base de datos (migración pendiente)
            return
        if res.status_code not in (200, 204):
            raise RuntimeError(
                f"Error al guardar espejo en Supabase ({res.status_code}): {res.text}"
            )

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

    def save_avatar(self, content: bytes, extension: str = "jpg") -> str:
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        ext = extension.lstrip(".") or "jpg"
        object_path = f"{self.user_id}/{content_hash}.{ext}"
        content_type = "image/png" if ext.lower() in ("png",) else "image/jpeg"

        with httpx.Client(timeout=20.0, transport=self.transport) as client:
            res = client.post(
                f"{self.url}/storage/v1/object/{DEFAULT_AVATARS_BUCKET}/{object_path}",
                headers=self._headers({
                    "Content-Type": content_type,
                    "x-upsert": "true",
                }),
                content=content,
            )
            if res.status_code not in (200, 201):
                raise RuntimeError(
                    f"Error al subir avatar a Supabase Storage ({res.status_code}): {res.text}"
                )

        return f"{self.url}/storage/v1/object/public/{DEFAULT_AVATARS_BUCKET}/{object_path}"

    def delete_avatar(self) -> None:
        prof = self.get_profile()
        prof.contact.photo_url = None
        self.save_profile(prof)

    def get_tailor_quota(self) -> TailorQuotaResponse:
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.get(
                f"{self.url}/rest/v1/tailor_quotas",
                params={
                    "user_id": f"eq.{self.user_id}",
                    "select": "used_count,has_active_pass,pass_expires_at",
                },
                headers=self._headers(),
            )
        if res.status_code == 400 and ("42P01" in res.text or "PGRST205" in res.text):
            # Tabla tailor_quotas no existe aún en la base de datos (migración pendiente)
            return TailorQuotaResponse(
                used_count=0,
                limit=2,
                has_active_pass=False,
                can_tailor=True,
            )
        if res.status_code != 200:
            raise RuntimeError(
                f"Error al cargar cuota de Supabase ({res.status_code}): {res.text}"
            )
        rows = res.json()
        if not rows:
            return TailorQuotaResponse(
                used_count=0,
                limit=2,
                has_active_pass=False,
                can_tailor=True,
            )
        row = rows[0]
        used = int(row.get("used_count", 0))
        has_pass = bool(row.get("has_active_pass", False))
        pass_expires_at = row.get("pass_expires_at")
        if pass_expires_at and has_pass:
            try:
                exp = datetime.fromisoformat(pass_expires_at)
                if exp < datetime.now(UTC):
                    has_pass = False
            except Exception:
                pass
        return TailorQuotaResponse(
            used_count=used,
            limit=2,
            has_active_pass=has_pass,
            can_tailor=has_pass or (used < 2),
        )

    def increment_tailor_usage(self) -> TailorQuotaResponse:
        current = self.get_tailor_quota()
        new_count = current.used_count + 1
        payload = {
            "user_id": self.user_id,
            "used_count": new_count,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        with httpx.Client(timeout=15.0, transport=self.transport) as client:
            res = client.post(
                f"{self.url}/rest/v1/tailor_quotas",
                params={"on_conflict": "user_id"},
                headers=self._headers(
                    {"Prefer": "resolution=merge-duplicates,return=representation"}
                ),
                json=payload,
            )
        if res.status_code in (400, 404) and ("42P01" in res.text or "PGRST205" in res.text):
            # Fallback tolerante si la tabla aún no se migró
            return TailorQuotaResponse(
                used_count=new_count,
                limit=2,
                has_active_pass=current.has_active_pass,
                can_tailor=current.has_active_pass or (new_count < 2),
            )
        if res.status_code not in (200, 201):
            raise RuntimeError(
                f"Error al actualizar cuota en Supabase ({res.status_code}): {res.text}"
            )
        return TailorQuotaResponse(
            used_count=new_count,
            limit=2,
            has_active_pass=current.has_active_pass,
            can_tailor=current.has_active_pass or (new_count < 2),
        )

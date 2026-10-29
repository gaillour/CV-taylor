"""Tests for Slice 9B: Supabase Auth JWT validation and SupabaseStorageRepository."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from back.api.auth import get_current_user, is_supabase_configured, verify_supabase_token
from back.api.main import app
from back.engine.models import Profile, RenderModel
from back.engine.snapshot import Snapshot
from back.engine.storage import SupabaseStorageRepository

client = TestClient(app)

FAKE_URL = "https://example-project.supabase.co"
FAKE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake_anon"
FAKE_USER_ID = "11111111-2222-3333-4444-555555555555"
FAKE_TOKEN = "valid_user_jwt_token"


def _sample_profile() -> Profile:
    return Profile.model_validate_json(
        Path("fixtures/profile_juan.json").read_text(encoding="utf-8")
    )


def test_local_fallback_when_supabase_env_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", raising=False)

    assert not is_supabase_configured()
    ctx = get_current_user(authorization=None)
    assert ctx.user_id == "local"
    assert not ctx.is_cloud


def test_verify_supabase_token_success_and_failure() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/auth/v1/user"
        assert request.headers.get("apikey") == FAKE_ANON_KEY
        auth = request.headers.get("Authorization")
        if auth == f"Bearer {FAKE_TOKEN}":
            return httpx.Response(
                200,
                json={"id": FAKE_USER_ID, "email": "juan@example.com"},
            )
        return httpx.Response(401, json={"msg": "invalid token"})

    transport = httpx.MockTransport(handler)
    user = verify_supabase_token(
        FAKE_URL, FAKE_ANON_KEY, FAKE_TOKEN, transport=transport
    )
    assert user.user_id == FAKE_USER_ID
    assert user.email == "juan@example.com"
    assert user.is_cloud is True

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(
            FAKE_URL, FAKE_ANON_KEY, "bad_token", transport=transport
        )
    assert exc_info.value.status_code == 401


def test_api_requires_bearer_when_supabase_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", FAKE_URL)
    monkeypatch.setenv("SUPABASE_ANON_KEY", FAKE_ANON_KEY)

    res = client.get("/api/profile")
    assert res.status_code == 401
    assert "Bearer" in res.json()["detail"]


def test_supabase_storage_repository_crud_and_immutability() -> None:
    db_profiles: dict[str, dict] = {}
    db_snapshots: dict[str, dict] = {}
    storage_objects: dict[str, bytes] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method

        # 1. Profile endpoints
        if path == "/rest/v1/profiles":
            if method == "GET":
                row = db_profiles.get(FAKE_USER_ID)
                return httpx.Response(200, json=[row] if row else [])
            if method == "POST":
                body = json.loads(request.content.decode("utf-8"))
                db_profiles[body["user_id"]] = body
                return httpx.Response(201, json=[body])

        # 2. Storage endpoints
        if path.startswith("/storage/v1/object/cv-snapshots/"):
            obj_key = path.removeprefix("/storage/v1/object/cv-snapshots/")
            assert request.headers.get("x-upsert") == "false"
            storage_objects[obj_key] = request.content
            return httpx.Response(200, json={"Key": f"cv-snapshots/{obj_key}"})

        # 3. Snapshots endpoints
        if path == "/rest/v1/snapshots":
            if method == "POST":
                body = json.loads(request.content.decode("utf-8"))
                db_snapshots[body["id"]] = body
                return httpx.Response(201, content=b"")
            if method == "GET":
                snap_id_filter = request.url.params.get("id")
                deleted_filter = request.url.params.get("deleted_at")
                rows = list(db_snapshots.values())
                if snap_id_filter and snap_id_filter.startswith("eq."):
                    target_id = snap_id_filter.removeprefix("eq.")
                    rows = [r for r in rows if r["id"] == target_id]
                if deleted_filter == "is.null":
                    rows = [r for r in rows if r.get("deleted_at") is None]
                return httpx.Response(200, json=rows)
            if method == "PATCH":
                snap_id_filter = request.url.params.get("id", "")
                target_id = snap_id_filter.removeprefix("eq.")
                if target_id not in db_snapshots:
                    return httpx.Response(200, json=[])
                body = json.loads(request.content.decode("utf-8"))
                db_snapshots[target_id]["deleted_at"] = body["deleted_at"]
                return httpx.Response(200, json=[db_snapshots[target_id]])

        return httpx.Response(404, json={"error": f"Unhandled {method} {path}"})

    repo = SupabaseStorageRepository(
        url=FAKE_URL,
        anon_key=FAKE_ANON_KEY,
        user_id=FAKE_USER_ID,
        access_token=FAKE_TOKEN,
        transport=httpx.MockTransport(handler),
    )

    # Empty profile when user is new
    empty_prof = repo.get_profile()
    assert empty_prof.full_name == ""

    # Save master profile
    sample = _sample_profile()
    repo.save_profile(sample)
    loaded_prof = repo.get_profile()
    assert loaded_prof.full_name == sample.full_name

    # Upsert fact back to profile
    first_entry_id = sample.entries[0].id
    updated_prof, fact, created = repo.upsert_fact(
        entry_id=first_entry_id,
        text="Nueva viñeta persistida en Supabase Cloud.",
        lang="es",
    )
    assert created is True
    assert any(
        f.id == fact.id for f in repo.get_profile().entries[0].facts
    )

    # Save snapshot (JSON + PDF in Storage + row in Postgres)
    render_model = RenderModel.from_profile(updated_prof, theme="classic", lang="es")
    snap = Snapshot.create(
        render_model=render_model,
        pdf_sha256="a" * 64,
        ats_score=91.0,
    )
    uri = repo.save_snapshot(snap, pdf_bytes=b"%PDF-1.7 fake pdf bytes")
    assert uri == f"supabase://cv-snapshots/{FAKE_USER_ID}/{snap.id}.json"
    assert f"{FAKE_USER_ID}/{snap.id}.json" in storage_objects
    assert f"{FAKE_USER_ID}/{snap.id}.pdf" in storage_objects

    # List & Get snapshot
    listed = repo.list_snapshots()
    assert len(listed) == 1
    assert listed[0].id == snap.id

    fetched = repo.get_snapshot(snap.id)
    assert fetched.id == snap.id
    assert fetched.pdf_sha256 == "a" * 64

    # Soft delete snapshot preserves Storage objects
    deleted_ts = repo.soft_delete_snapshot(snap.id)
    assert deleted_ts
    assert repo.list_snapshots(include_deleted=False) == []
    assert len(repo.list_snapshots(include_deleted=True)) == 1
    assert f"{FAKE_USER_ID}/{snap.id}.json" in storage_objects
    assert f"{FAKE_USER_ID}/{snap.id}.pdf" in storage_objects

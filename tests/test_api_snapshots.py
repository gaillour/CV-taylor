"""Tests for snapshot browsing and fork lineage (Slice 5)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import Profile, RenderModel

client = TestClient(app)


@pytest.fixture
def snapshots_dir(tmp_path: Path, monkeypatch) -> Path:
    target = tmp_path / "snapshots"
    monkeypatch.setattr("back.api.routes.export.SNAPSHOTS_DIR", target)
    return target


def _model_payload() -> dict:
    profile = Profile.model_validate_json(
        Path("fixtures/profile_juan.json").read_text(encoding="utf-8")
    )
    return RenderModel.from_profile(profile, theme="classic", lang="es").model_dump(mode="json")


def _save(**extra) -> dict:
    response = client.post("/api/export/snapshot", json={"render_model": _model_payload(), **extra})
    assert response.status_code == 200, response.text
    return response.json()


def test_list_snapshots_empty(snapshots_dir: Path) -> None:
    response = client.get("/api/snapshots")
    assert response.status_code == 200
    assert response.json() == []


def test_fork_creates_new_snapshot_with_parent(snapshots_dir: Path) -> None:
    original = _save()
    fork = _save(parent_id=original["id"])

    assert fork["id"] != original["id"]
    assert fork["snapshot"]["parent_id"] == original["id"]

    # Original stays untouched
    loaded = client.get(f"/api/snapshots/{original['id']}").json()
    assert loaded["parent_id"] is None
    assert loaded["created_at"] == original["created_at"]


def test_fork_with_unknown_parent_is_rejected(snapshots_dir: Path) -> None:
    response = client.post(
        "/api/export/snapshot",
        json={"render_model": _model_payload(), "parent_id": "snap_000000000000"},
    )
    assert response.status_code == 404


def test_list_snapshots_newest_first_and_skips_corrupt(snapshots_dir: Path) -> None:
    first = _save()
    second = _save(parent_id=first["id"])
    (snapshots_dir / "snap_ffffffffffff.json").write_text("{not json", encoding="utf-8")

    data = client.get("/api/snapshots").json()
    assert [s["id"] for s in data] == [second["id"], first["id"]]
    assert data[0]["parent_id"] == first["id"]
    assert data[0]["full_name"] == "Juan Ignacio Gaillour"
    assert "render_model" not in data[0]


def test_get_snapshot_not_found_and_invalid_id(snapshots_dir: Path) -> None:
    assert client.get("/api/snapshots/snap_000000000000").status_code == 404
    assert client.get("/api/snapshots/..%2F..%2Fetc").status_code in (400, 404)
    assert client.get("/api/snapshots/not_a_snapshot").status_code == 400

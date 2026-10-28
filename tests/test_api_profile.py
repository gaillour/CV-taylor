"""Tests for master profile API endpoints (Slice 6)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app

client = TestClient(app)


@pytest.fixture
def isolated_profile(tmp_path: Path, monkeypatch) -> Path:
    """Isolate profile storage into a temporary directory."""
    profile_file = tmp_path / "out" / "profile.json"
    monkeypatch.setenv("CVT_PROFILE_PATH", str(profile_file))
    return profile_file


def test_get_profile_auto_seeds(isolated_profile: Path) -> None:
    assert not isolated_profile.exists()
    response = client.get("/api/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Juan Ignacio Gaillour"
    assert isolated_profile.exists()


def test_update_profile_success(isolated_profile: Path) -> None:
    # First seed it
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    payload = get_res.json()

    # Modify some fields
    payload["full_name"] = "Juan Actualizado"
    payload["contact"]["location"] = "Mar del Plata, Argentina"
    payload["skills"].append(
        {
            "id": "skill_rust",
            "name": "Rust",
            "category": "Lenguajes",
            "category_en": "Languages",
            "aliases": ["rust", "rs"],
            "tags": ["systems"],
        }
    )

    put_res = client.put("/api/profile", json=payload)
    assert put_res.status_code == 200, put_res.text
    updated_data = put_res.json()
    assert updated_data["full_name"] == "Juan Actualizado"
    assert updated_data["contact"]["location"] == "Mar del Plata, Argentina"
    assert any(s["name"] == "Rust" for s in updated_data["skills"])

    # Verify persisted on disk and reflected in subsequent GET
    get_res_2 = client.get("/api/profile")
    assert get_res_2.status_code == 200
    assert get_res_2.json()["full_name"] == "Juan Actualizado"


def test_update_profile_validation_error(isolated_profile: Path) -> None:
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    payload = get_res.json()

    # Extra forbid validation
    payload["invalid_extra_field"] = "bad"
    put_res = client.put("/api/profile", json=payload)
    assert put_res.status_code == 422


def test_render_and_tailor_use_active_profile(isolated_profile: Path) -> None:
    # 1. Update profile with custom distinctive name
    get_res = client.get("/api/profile")
    payload = get_res.json()
    payload["full_name"] = "Carlos Master Tester"
    client.put("/api/profile", json=payload)

    # 2. Preview endpoint without render_model should pick up the active profile
    preview_res = client.post("/api/render/preview", json={})
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["render_model"]["full_name"] == "Carlos Master Tester"

    # 3. Tailor endpoint without profile should pick up the active profile
    offer = "Buscamos desarrollador Full-Stack con experiencia en Python y TypeScript."
    tailor_res = client.post("/api/tailor", json={"offer_text": offer, "no_llm": True})
    assert tailor_res.status_code == 200
    tailor_data = tailor_res.json()
    assert tailor_data["render_model"]["full_name"] == "Carlos Master Tester"

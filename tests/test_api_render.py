"""Tests for CV preview and rendering API routes."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import Profile, RenderModel

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_fixture_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CVT_PROFILE_PATH", "fixtures/profile_juan.json")


def test_health_check() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_preview_default_profile() -> None:
    response = client.post("/api/render/preview", json={})
    assert response.status_code == 200
    data = response.json()

    assert "svg" in data
    assert data["svg"].startswith("<svg")
    assert data["svg"].endswith("</svg>")
    assert len(data["svg"]) > 10_000

    assert "fit_report" in data
    fit = data["fit_report"]
    assert fit["pages"] == 1
    assert 85.0 <= fit["fill_pct"] <= 100.0

    assert "render_model" in data
    assert data["render_model"]["full_name"] == "Juan Ignacio Gaillour"


def test_preview_custom_render_model() -> None:
    sample_path = Path("fixtures/profile_juan.json")
    profile = Profile.model_validate(json.loads(sample_path.read_text(encoding="utf-8")))
    render_model = RenderModel.from_profile(profile, theme="modern", lang="en")

    payload = {"render_model": render_model.model_dump(mode="json")}
    response = client.post("/api/render/preview", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "<svg" in data["svg"]
    assert data["render_model"]["theme"] == "modern"
    assert data["render_model"]["lang"] == "en"


def test_preview_toggle_bullet_selection() -> None:
    # 1. Base preview with all bullets selected
    res_base = client.post("/api/render/preview", json={})
    assert res_base.status_code == 200
    base_data = res_base.json()
    base_model = base_data["render_model"]
    base_fill = base_data["fit_report"]["fill_pct"]
    base_len = len(base_data["svg"])

    # 2. Deselect the first bullet
    modified_model = json.loads(json.dumps(base_model))
    modified_model["experience"][0]["bullets"][0]["selected"] = False

    res_modified = client.post("/api/render/preview", json={"render_model": modified_model})
    assert res_modified.status_code == 200
    mod_data = res_modified.json()

    # The SVG size and fill percentage must strictly decrease
    assert mod_data["fit_report"]["fill_pct"] < base_fill
    assert len(mod_data["svg"]) < base_len
    # But the returned render_model still preserves the unselected bullet for UI state
    assert mod_data["render_model"]["experience"][0]["bullets"][0]["selected"] is False


def test_preview_toggle_entry_selection() -> None:
    res_base = client.post("/api/render/preview", json={})
    base_data = res_base.json()
    base_model = base_data["render_model"]
    base_fill = base_data["fit_report"]["fill_pct"]

    # Deselect the entire first experience entry
    modified_model = json.loads(json.dumps(base_model))
    modified_model["experience"][0]["selected"] = False

    res_modified = client.post("/api/render/preview", json={"render_model": modified_model})
    assert res_modified.status_code == 200
    mod_data = res_modified.json()

    # The fill percentage must decrease significantly
    assert mod_data["fit_report"]["fill_pct"] < base_fill - 5.0
    assert mod_data["render_model"]["experience"][0]["selected"] is False


def test_preview_density_adjustment() -> None:
    res_base = client.post("/api/render/preview", json={})
    assert res_base.status_code == 200
    base_data = res_base.json()
    base_fill = base_data["fit_report"]["fill_pct"]
    base_model = base_data["render_model"]

    # Increase density to 0.35 (comfortable limit)
    modified_model = json.loads(json.dumps(base_model))
    modified_model["design"]["density"] = 0.35

    res_modified = client.post("/api/render/preview", json={"render_model": modified_model})
    assert res_modified.status_code == 200
    mod_data = res_modified.json()

    # Compacting typography physically reduces page fill
    assert mod_data["fit_report"]["fill_pct"] < base_fill
    # Verify knobs are physically updated
    assert mod_data["render_model"]["design"]["font_size_pt"] < base_model["design"]["font_size_pt"]
    assert (
        mod_data["render_model"]["design"]["entry_spacing_pt"]
        < base_model["design"]["entry_spacing_pt"]
    )


def test_preview_custom_section_order() -> None:
    res_base = client.post("/api/render/preview", json={})
    assert res_base.status_code == 200
    base_data = res_base.json()
    base_model = base_data["render_model"]

    reordered_model = json.loads(json.dumps(base_model))
    custom_order = ["projects", "skills", "experience", "education", "summary"]
    reordered_model["section_order"] = custom_order

    res = client.post("/api/render/preview", json={"render_model": reordered_model})
    assert res.status_code == 200
    data = res.json()
    assert data["render_model"]["section_order"] == custom_order
    assert "<svg" in data["svg"]
    assert data["fit_report"]["pages"] == 1

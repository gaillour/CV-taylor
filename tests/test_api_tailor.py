"""Tests for CV tailoring API routes."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import Profile
from back.engine.storage import LocalStorageRepository, get_repo_for_user

client = TestClient(app)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
OFFER_PATH = FIXTURES_DIR / "offer_backend.txt"
PROFILE_PATH = FIXTURES_DIR / "profile_juan.json"


@pytest.fixture(autouse=True)
def isolate_tailor_storage(tmp_path: Path):
    repo = LocalStorageRepository(profile_path=tmp_path / "profile.json")
    if PROFILE_PATH.is_file():
        raw_prof = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
        repo.save_profile(Profile.model_validate(raw_prof))
    app.dependency_overrides[get_repo_for_user] = lambda: repo
    yield repo
    app.dependency_overrides.pop(get_repo_for_user, None)


def test_tailor_missing_or_short_offer() -> None:
    # Empty body
    res = client.post("/api/tailor", json={})
    assert res.status_code == 422

    # Too short offer text
    res2 = client.post("/api/tailor", json={"offer_text": "short"})
    assert res2.status_code == 422


def test_tailor_heuristic_mode() -> None:
    offer_text = OFFER_PATH.read_text(encoding="utf-8")
    payload = {
        "offer_text": offer_text,
        "theme": "classic",
        "lang": "es",
        "no_llm": True,
    }
    res = client.post("/api/tailor", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Verify RenderModel
    assert "render_model" in data
    model = data["render_model"]
    assert model["theme"] == "classic"
    assert model["lang"] == "es"
    assert len(model["experience"]) <= 3
    assert len(model["projects"]) <= 3

    # Verify SVG
    assert "svg" in data
    assert data["svg"].startswith("<svg")
    assert data["svg"].endswith("</svg>")

    # Verify FitReport (1 page guarantee)
    fit = data["fit_report"]
    assert fit["pages"] == 1
    assert fit["fits_one_page"] is True
    assert 80.0 <= fit["fill_pct"] <= 100.0

    # Verify JobSpec
    spec = data["job_spec"]
    assert spec["lang"] == "es"
    assert len(spec["keywords"]) > 0

    # Verify ATS and Anti-Hallucination
    assert data["ats_score"] > 0
    assert data["validation_valid"] is True
    assert data["checked_bullets"] > 0
    assert data["iterations_performed"] >= 1


def test_tailor_with_custom_profile() -> None:
    offer_text = OFFER_PATH.read_text(encoding="utf-8")
    raw_prof = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    profile = Profile.model_validate(raw_prof)

    payload = {
        "offer_text": offer_text,
        "theme": "modern",
        "lang": "en",
        "no_llm": True,
        "profile": profile.model_dump(mode="json"),
    }
    res = client.post("/api/tailor", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["render_model"]["theme"] == "modern"
    assert data["render_model"]["lang"] == "en"
    assert data["fit_report"]["pages"] == 1


def test_get_tailor_quota_endpoint(isolate_tailor_storage: LocalStorageRepository) -> None:
    res = client.get("/api/tailor/quota")
    assert res.status_code == 200
    data = res.json()
    assert data["used_count"] == 0
    assert data["limit"] == 2
    assert data["has_active_pass"] is False
    assert data["can_tailor"] is True


def test_tailor_quota_blocks_third_adaptation(isolate_tailor_storage: LocalStorageRepository) -> None:
    repo = isolate_tailor_storage
    offer_text = OFFER_PATH.read_text(encoding="utf-8")
    payload = {
        "offer_text": offer_text,
        "theme": "classic",
        "lang": "es",
        "no_llm": True,
    }

    # First adaptation: OK, count becomes 1
    res1 = client.post("/api/tailor", json=payload)
    assert res1.status_code == 200
    quota1 = repo.get_tailor_quota()
    assert quota1.used_count == 1
    assert quota1.can_tailor is True

    # Second adaptation: OK, count becomes 2
    res2 = client.post("/api/tailor", json=payload)
    assert res2.status_code == 200
    quota2 = repo.get_tailor_quota()
    assert quota2.used_count == 2
    assert quota2.can_tailor is False

    # Third adaptation: BLOCKED with HTTP 402
    res3 = client.post("/api/tailor", json=payload)
    assert res3.status_code == 402
    err = res3.json()
    assert err["code"] == "QUOTA_EXCEEDED"
    assert err["used_count"] == 2
    assert err["limit"] == 2
    assert "Pase" in err["detail"]


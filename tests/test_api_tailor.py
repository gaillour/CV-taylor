"""Tests for CV tailoring API routes."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import Profile

client = TestClient(app)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
OFFER_PATH = FIXTURES_DIR / "offer_backend.txt"
PROFILE_PATH = FIXTURES_DIR / "profile_juan.json"


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

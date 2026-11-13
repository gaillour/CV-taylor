"""Tests for T5: RenderModel SSOT via /api/anonymous/from-profile and AnonymousParseResponse."""

from __future__ import annotations

from fastapi.testclient import TestClient

from back.api.main import app
from back.api.routes.anonymous import anonymous_rate_limiter
from back.engine.models import (
    ContactInfo,
    Entry,
    EntryTitle,
    Fact,
    Profile,
    RenderModel,
    Skill,
)

client = TestClient(app)


def setup_function() -> None:
    """Reset rate limiter state before each test."""
    anonymous_rate_limiter.reset()


def _make_sample_profile() -> Profile:
    return Profile(
        id="p_t5",
        full_name="Juan Gaillour",
        base_lang="es",
        contact=ContactInfo(
            email="juan@example.com",
            phone="+54 11 1234-5678",
            location="Buenos Aires",
        ),
        summary="Ingeniero de software especializado en sistemas distribuidos.",
        skills=[
            Skill(id="sk1", name="Python", category="Lenguajes"),
            Skill(id="sk2", name="TypeScript", category="Lenguajes"),
        ],
        entries=[
            Entry(
                id="exp_current",
                kind="experience",
                org="Acme Corp",
                start_date="2023-03",
                end_date="present",
                date_precision="month",
                titles=[EntryTitle(id="t1", title="Backend Developer", is_default=True)],
                facts=[
                    Fact(id="f1", text="Desarrollé servicios en FastAPI.", default_selected=True),
                ],
            ),
            Entry(
                id="proj_no_end",
                kind="project",
                org="",
                role="Autor",
                start_date="2026",
                end_date=None,
                date_precision="year",
                titles=[EntryTitle(id="t2", title="CV Tailor", is_default=True)],
                facts=[
                    Fact(id="f2", text="Motor determinístico en Typst.", default_selected=True),
                ],
            ),
            Entry(
                id="proj_same_year",
                kind="project",
                org="",
                start_date="2026",
                end_date="2026",
                date_precision="year",
                titles=[EntryTitle(id="t3", title="Single Year Tool", is_default=True)],
                facts=[
                    Fact(id="f3", text="CLI escrita en Rust.", default_selected=True),
                ],
            ),
        ],
    )


def test_anonymous_from_profile_ssot_dates_and_fields() -> None:
    profile = _make_sample_profile()
    res = client.post(
        "/api/anonymous/from-profile",
        json={"profile": profile.model_dump(mode="json"), "theme": "engineering"},
    )
    assert res.status_code == 200
    rm = RenderModel.model_validate(res.json())

    assert rm.theme == "engineering"
    assert rm.design.font_family == "Liberation Serif"
    assert len(rm.experience) == 1
    assert rm.experience[0].date_label == "03/2023 - Presente"

    proj_by_id = {p.entry_id: p for p in rm.projects}
    # No end_date -> only start_date, never "2026 – Presente"
    assert proj_by_id["proj_no_end"].date_label == "2026"
    # Same start and end -> single year, never "2026 - 2026"
    assert proj_by_id["proj_same_year"].date_label == "2026"


def test_anonymous_from_profile_bypasses_parse_rate_limit() -> None:
    profile = _make_sample_profile()
    headers = {"X-Forwarded-For": "198.51.100.99"}

    # Exhaust the 3/day parse limit first
    sample_text = "Juan Perez\njuan@example.com\nPython Developer\n"
    for _ in range(3):
        files = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
        r = client.post("/api/anonymous/parse", files=files, headers=headers)
        assert r.status_code == 200

    # /from-profile should still succeed multiple times for the same IP
    for _ in range(5):
        res = client.post(
            "/api/anonymous/from-profile",
            json={"profile": profile.model_dump(mode="json"), "theme": "classic"},
            headers=headers,
        )
        assert res.status_code == 200


def test_anonymous_parse_response_includes_render_model() -> None:
    sample_text = (
        "Juan Perez\n"
        "juan@example.com | Buenos Aires, Argentina\n"
        "Desarrollador Backend con experiencia en Python y FastAPI.\n"
        "EXPERIENCIA:\n"
        "Senior Backend Developer en Tech Corp (2022 - Actualidad)\n"
        "- Diseñé arquitecturas escalables basadas en microservicios.\n"
    )
    files = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
    res = client.post("/api/anonymous/parse", files=files, data={"source_lang": "es"})
    assert res.status_code == 200
    data = res.json()

    assert "render_model" in data
    assert data["render_model"] is not None
    rm = RenderModel.model_validate(data["render_model"])
    assert rm.full_name == data["profile"]["full_name"]
    for entry in rm.experience + rm.projects + rm.education:
        assert "–" not in entry.date_label

"""Tests for T8: Additive local draft merge endpoint POST /api/profile/merge."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import ContactInfo, Entry, EntryTitle, Fact, Profile, Skill

client = TestClient(app)


@pytest.fixture
def isolated_profile(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate profile storage into a temporary directory."""
    profile_file = tmp_path / "out" / "profile.json"
    monkeypatch.setenv("CVT_PROFILE_PATH", str(profile_file))
    return profile_file


def test_merge_profile_adds_entries_and_skills_without_data_loss(
    isolated_profile: Path,
) -> None:
    """POST /api/profile/merge merges incoming draft into existing profile and persists it."""
    existing = Profile(
        id="user_prof",
        full_name="Juan Gaillour",
        base_lang="es",
        contact=ContactInfo(
            email="juan@example.com",
            phone="+54 223 111-2222",
            location="Mar del Plata, AR",
            github="github.com/gaillour",
        ),
        summary="Ingeniero de software con experiencia en Python.",
        skills=[
            Skill(id="sk_python", name="Python", category="Lenguajes"),
            Skill(id="sk_fastapi", name="FastAPI", category="Backend"),
        ],
        entries=[
            Entry(
                id="exp_existing",
                kind="experience",
                org="Acme Corp",
                start_date="2023-01",
                end_date="2024-06",
                titles=[EntryTitle(id="t_1", title="Backend Developer", is_default=True)],
                facts=[
                    Fact(
                        id="f_1",
                        entry_id="exp_existing",
                        text="Desarrollé microservicios en Python y FastAPI.",
                        position=0,
                    )
                ],
            )
        ],
    )
    put_res = client.put("/api/profile", json=existing.model_dump(mode="json"))
    assert put_res.status_code == 200

    draft = Profile(
        id="draft_prof",
        full_name="Juan G.",
        base_lang="es",
        contact=ContactInfo(
            email="juan@example.com",
            phone="",
            location="",
            linkedin="linkedin.com/in/juangaillour",
        ),
        summary="Resumen alternativo del borrador.",
        skills=[
            Skill(id="sk_python_dup", name="Python", category="Lenguajes"),
            Skill(id="sk_ts", name="TypeScript", category="Lenguajes"),
            Skill(id="sk_react", name="React", category="Frontend"),
        ],
        entries=[
            Entry(
                id="exp_new",
                kind="experience",
                org="Globant",
                start_date="2024-07",
                titles=[EntryTitle(id="t_new", title="Software Engineer", is_default=True)],
                facts=[
                    Fact(
                        id="f_new_1",
                        entry_id="exp_new",
                        text="Lideré la migración del frontend a Next.js y TypeScript.",
                        position=0,
                    )
                ],
            ),
            Entry(
                id="proj_new",
                kind="project",
                org="",
                start_date="2025",
                titles=[EntryTitle(id="t_proj", title="CV Tailor", is_default=True)],
                facts=[
                    Fact(
                        id="f_proj_1",
                        entry_id="proj_new",
                        text="Motor determinista de adaptación de CVs con Typst.",
                        position=0,
                    )
                ],
            ),
        ],
    )

    merge_res = client.post("/api/profile/merge", json=draft.model_dump(mode="json"))
    assert merge_res.status_code == 200, merge_res.text
    merged = merge_res.json()

    # Existing data is preserved
    assert merged["full_name"] == "Juan Gaillour"
    assert merged["contact"]["email"] == "juan@example.com"
    assert merged["contact"]["github"] == "github.com/gaillour"
    # New contact info from draft is filled in
    assert merged["contact"]["linkedin"] == "linkedin.com/in/juangaillour"

    # Skills are additively merged without duplicates
    skill_names = {s["name"] for s in merged["skills"]}
    assert {"Python", "FastAPI", "TypeScript", "React"}.issubset(skill_names)
    assert sum(1 for s in merged["skills"] if s["name"].lower() == "python") == 1

    # Both existing and new entries are present
    orgs = {e["org"] for e in merged["entries"]}
    titles = {t["title"] for e in merged["entries"] for t in e["titles"]}
    assert "Acme Corp" in orgs
    assert "Globant" in orgs
    assert "CV Tailor" in titles

    # Verify persisted on disk via subsequent GET /api/profile
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    persisted = get_res.json()
    persisted_titles = {t["title"] for e in persisted["entries"] for t in e["titles"]}
    assert {"Backend Developer", "Software Engineer", "CV Tailor"}.issubset(persisted_titles)


def test_merge_profile_when_cloud_profile_is_empty(isolated_profile: Path) -> None:
    """POST /api/profile/merge adopts incoming draft when existing profile is empty."""
    assert not isolated_profile.exists()

    draft = Profile(
        id="draft_only",
        full_name="Ana Gómez",
        base_lang="es",
        contact=ContactInfo(email="ana@example.com", phone="", location=""),
        skills=[Skill(id="sk_go", name="Go", category="Lenguajes")],
        entries=[],
    )

    merge_res = client.post("/api/profile/merge", json=draft.model_dump(mode="json"))
    assert merge_res.status_code == 200
    merged = merge_res.json()
    assert merged["full_name"] == "Ana Gómez"
    assert any(s["name"] == "Go" for s in merged["skills"])
    assert isolated_profile.exists()

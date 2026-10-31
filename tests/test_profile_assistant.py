from __future__ import annotations

import pytest

from back.engine.models import ContactInfo, Entry, EntryTitle, Fact, Profile, Skill
from back.engine.profile_assistant import (
    _enhance_with_llm,
    _is_forbidden_project_title,
    _suggest_titles_deterministic,
    enhance_profile,
)


def test_is_forbidden_project_title() -> None:
    # Prohibited job/employment titles
    assert _is_forbidden_project_title("Software Engineer") is True
    assert _is_forbidden_project_title("Backend Developer") is True
    assert _is_forbidden_project_title("Desarrollador Backend") is True
    assert _is_forbidden_project_title("Programador Full Stack") is True
    assert _is_forbidden_project_title("Lead Architect") is True
    assert _is_forbidden_project_title("Ingeniero de Software") is True
    assert _is_forbidden_project_title("DevOps Specialist") is True

    # Allowed artifact/system titles
    assert _is_forbidden_project_title("Simulador de Físicas 2D") is False
    assert _is_forbidden_project_title("API REST y Servicio Backend") is False
    assert _is_forbidden_project_title("Simulation Engine & Core System") is False
    assert _is_forbidden_project_title("Command Line Interface Tool") is False
    assert _is_forbidden_project_title("Data Processing Pipeline") is False
    assert _is_forbidden_project_title("Aplicación Web Full Stack") is False


def test_suggest_titles_deterministic_distinguishes_project_and_experience() -> None:
    # 1. Experience entry: should suggest employment roles
    exp_entry = Entry(
        id="exp_1",
        kind="experience",
        org="Tech Corp",
        start_date="2024-01",
        context="Desarrollo de microservicios con FastAPI y PostgreSQL",
        titles=[
            EntryTitle(
                id="t_exp",
                entry_id="exp_1",
                title="Programador",
                is_default=True,
                source="user",
                approved=True,
            )
        ],
        facts=[
            Fact(
                id="f_exp",
                entry_id="exp_1",
                text="Desarrollé APIs REST con FastAPI y PostgreSQL para backend.",
                approved=True,
            )
        ],
    )

    exp_titles_es = _suggest_titles_deterministic(exp_entry, "es")
    exp_title_names = [t.title for t in exp_titles_es]
    assert "Desarrollador Backend" in exp_title_names

    # 2. Project entry with same facts: should suggest artifact/product titles, NEVER job roles
    prj_entry = Entry(
        id="prj_1",
        kind="project",
        org="PhysicsEngine",
        start_date="2024-01",
        context="Simulador 2D con FastAPI y PostgreSQL",
        titles=[
            EntryTitle(
                id="t_prj",
                entry_id="prj_1",
                title="Physics 2D",
                is_default=True,
                source="user",
                approved=True,
            )
        ],
        facts=[
            Fact(
                id="f_prj",
                entry_id="prj_1",
                text="Desarrollé APIs REST con FastAPI y PostgreSQL para backend.",
                approved=True,
            )
        ],
    )

    prj_titles_es = _suggest_titles_deterministic(prj_entry, "es")
    prj_title_names = [t.title for t in prj_titles_es]

    assert len(prj_title_names) > 0
    # Prohibit job roles in project
    for t_name in prj_title_names:
        assert not _is_forbidden_project_title(t_name), f"Forbidden job title in project: {t_name}"

    # Should suggest artifact style
    assert "API REST y Servicio Backend" in prj_title_names or any("Backend" in t and "API" in t for t in prj_title_names)


def test_suggest_titles_deterministic_engine_project() -> None:
    prj = Entry(
        id="prj_sim",
        kind="project",
        org="RigidBodySim",
        start_date="2024-01",
        context="Motor y simulador de física con renderizado",
        titles=[
            EntryTitle(
                id="t_sim",
                entry_id="prj_sim",
                title="RigidBodySim",
                is_default=True,
                source="user",
                approved=True,
            )
        ],
        facts=[
            Fact(
                id="f_sim",
                entry_id="prj_sim",
                text="Implementé motor de simulación física en C++.",
                approved=True,
            )
        ],
    )

    titles_es = _suggest_titles_deterministic(prj, "es")
    names_es = [t.title for t in titles_es]
    assert "Motor de Simulación y Sistema Core" in names_es
    for n in names_es:
        assert not _is_forbidden_project_title(n)

    titles_en = _suggest_titles_deterministic(prj, "en")
    names_en = [t.title for t in titles_en]
    assert "Simulation Engine & Core System" in names_en
    for n in names_en:
        assert not _is_forbidden_project_title(n)


class DummyLLM:
    is_configured = True

    def __init__(self, response_data: dict) -> None:
        self.response_data = response_data

    def parse_json_completion(self, messages: list[dict], temperature: float = 0.2) -> dict:
        return self.response_data


def test_enhance_with_llm_filters_forbidden_titles_for_projects() -> None:
    profile = Profile(
        id="p1",
        full_name="Tester",
        contact=ContactInfo(
            email="tester@example.com",
            phone="+54 11 1234 5678",
            location="Buenos Aires, Argentina",
        ),
        base_lang="es",
        skills=[],
        entries=[
            Entry(
                id="prj_1",
                kind="project",
                org="MiApp",
                start_date="2024-01",
                context="App de tareas",
                titles=[
                    EntryTitle(
                        id="t1",
                        entry_id="prj_1",
                        title="MiApp",
                        is_default=True,
                        source="user",
                        approved=True,
                    )
                ],
                facts=[],
            ),
            Entry(
                id="exp_1",
                kind="experience",
                org="Empresa",
                start_date="2024-01",
                context="Trabajo backend",
                titles=[
                    EntryTitle(
                        id="t2",
                        entry_id="exp_1",
                        title="Junior Dev",
                        is_default=True,
                        source="user",
                        approved=True,
                    )
                ],
                facts=[],
            ),
        ],
    )

    llm_payload = {
        "detected_skills": [],
        "redundant_skills": [],
        "redundant_facts": [],
        "entries": [
            {
                "entry_id": "prj_1",
                "distilled_facts": [],
                "improved_facts": [],
                "suggested_titles": [
                    {"title": "Software Developer", "archetype": "dev"},  # Should be BLOCKED
                    {"title": "Desarrollador Backend", "archetype": "backend"},  # Should be BLOCKED
                    {"title": "Sistema de Gestión de Tareas", "archetype": "fullstack"},  # Allowed!
                ],
            },
            {
                "entry_id": "exp_1",
                "distilled_facts": [],
                "improved_facts": [],
                "suggested_titles": [
                    {"title": "Desarrollador Backend", "archetype": "backend"},  # Allowed for experience!
                ],
            },
        ],
    }

    dummy_llm = DummyLLM(llm_payload)
    resp = enhance_profile(profile, llm=dummy_llm)  # type: ignore

    prj_titles = [t.title for t in resp.profile.entries[0].titles if not t.approved]
    exp_titles = [t.title for t in resp.profile.entries[1].titles if not t.approved]

    # Project should ONLY have the allowed artifact title
    assert prj_titles == ["Sistema de Gestión de Tareas"]

    # Experience should have the role title
    assert exp_titles == ["Desarrollador Backend"]

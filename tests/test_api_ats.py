from __future__ import annotations

from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.ats.checker import ATSChecker
from back.engine.models import (
    ContactInfo,
    DesignKnobs,
    RenderBullet,
    RenderEntry,
    RenderModel,
    RenderSkillGroup,
)

client = TestClient(app)


def _build_valid_model() -> RenderModel:
    return RenderModel(
        schema_version="2.0.0",
        theme="engineering",
        lang="es",
        full_name="Juan Perez",
        contact=ContactInfo(
            email="juan@example.com",
            phone="+54 11 1234 5678",
            location="Buenos Aires, Argentina",
        ),
        summary="Ingeniero de Software con experiencia en diseño de microservicios.",
        summary_fact_ids=[],
        skills=[
            RenderSkillGroup(
                category="Backend",
                items="Python, FastAPI, PostgreSQL, Docker",
                skill_ids=["python", "fastapi"],
            )
        ],
        experience=[
            RenderEntry(
                entry_id="exp_1",
                title="Desarrollador Backend",
                org="TechCorp",
                date_label="01/2023 - Presente",
                bullets=[
                    RenderBullet(
                        text="Desarrollé APIs REST de alto rendimiento con FastAPI y PostgreSQL.",
                        selected=True,
                    ),
                    RenderBullet(
                        text="Automaticé pipelines de despliegue usando Docker.",
                        selected=True,
                    ),
                ],
                selected=True,
            ),
            RenderEntry(
                entry_id="exp_2",
                title="Desarrollador Junior",
                org="StartupLab",
                date_label="03/2021 - 12/2022",
                bullets=[
                    RenderBullet(
                        text="Implementé interfaces y servicios web en Python.",
                        selected=True,
                    )
                ],
                selected=True,
            ),
        ],
        projects=[],
        education=[
            RenderEntry(
                entry_id="edu_1",
                title="Ingeniería Informática",
                org="Universidad Nacional",
                date_label="2018 - 2023",
                bullets=[
                    RenderBullet(
                        text="Promedio destacado con enfoque en sistemas distribuidos.",
                        selected=True,
                    )
                ],
                selected=True,
            )
        ],
        design=DesignKnobs(),
    )


def test_evaluate_render_model_full_compliance() -> None:
    model = _build_valid_model()
    checker = ATSChecker()
    report = checker.evaluate_render_model(
        model,
        target_keywords=["FastAPI", "PostgreSQL", "Docker"],
    )

    assert report.total_score >= 85
    assert report.passed is True
    assert report.structure_score == 100
    assert report.experience_score == 100
    assert report.education_score == 100
    assert report.skills_score == 100
    assert set(report.keyword_matches) == {"FastAPI", "PostgreSQL", "Docker"}
    assert report.keyword_gaps == []
    assert report.breakdown["structure"] == 100
    assert report.breakdown["experience"] == 100


def test_evaluate_render_model_deselected_bullet_creates_keyword_gap() -> None:
    model = _build_valid_model()
    # Unselect the bullet containing Docker
    model.experience[0].bullets[1].selected = False

    # Remove Docker from skills line to ensure it is only in the deselected bullet
    model.skills[0].items = "Python, FastAPI, PostgreSQL"

    checker = ATSChecker()
    report = checker.evaluate_render_model(
        model,
        target_keywords=["FastAPI", "PostgreSQL", "Docker"],
    )

    assert "Docker" in report.keyword_gaps
    assert set(report.keyword_matches) == {"FastAPI", "PostgreSQL"}
    assert report.skills_score < 100
    assert any("Docker" in issue for issue in report.issues)


def test_evaluate_render_model_missing_sections() -> None:
    model = _build_valid_model()
    model.summary = None
    model.education = []

    checker = ATSChecker()
    report = checker.evaluate_render_model(model)

    # Missing summary (-25) and education (-25) -> structure_score = 50
    assert report.structure_score == 50
    assert report.breakdown["structure"] == 50
    assert report.breakdown["education"] == 0
    assert report.passed is False
    assert any("summary" in i for i in report.issues)
    assert any("education" in i for i in report.issues)


def test_api_ats_evaluate_endpoint() -> None:
    model = _build_valid_model()
    payload = {
        "render_model": model.model_dump(),
        "target_keywords": ["FastAPI", "Kubernetes"],
    }

    res = client.post("/api/ats/evaluate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_score" in data
    assert "structure_score" in data
    assert "experience_score" in data
    assert "education_score" in data
    assert "skills_score" in data
    assert "breakdown" in data
    assert data["breakdown"]["structure"] == data["structure_score"]
    assert "keyword_matches" in data
    assert "keyword_gaps" in data
    assert "FastAPI" in data["keyword_matches"]
    assert "Kubernetes" in data["keyword_gaps"]

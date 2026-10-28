"""Tests for PDF text extraction and importer engine."""

from pathlib import Path

import pytest
import typst

from back.engine.importer import extract_text_from_pdf, parse_profile_from_text
from back.engine.llm import LLMClient, LLMConfig
from back.engine.models import Profile, RenderModel
from back.engine.renderer import render_cv


def test_extract_text_from_pdf_single_column_existing():
    sample_pdf = Path("out/tailored_cv.pdf")
    assert sample_pdf.is_file(), "Sample PDF out/tailored_cv.pdf should exist"

    text = extract_text_from_pdf(sample_pdf)
    assert isinstance(text, str)
    assert "Juan Ignacio Gaillour" in text
    assert "RESUMEN PROFESIONAL" in text
    assert "EXPERIENCIA PROFESIONAL" in text
    assert "juangaillour.8@gmail.com" in text


def test_extract_text_from_pdf_accepts_bytes_and_str(tmp_path: Path):
    sample_pdf = Path("out/tailored_cv.pdf")
    pdf_bytes = sample_pdf.read_bytes()

    text_from_bytes = extract_text_from_pdf(pdf_bytes)
    text_from_str = extract_text_from_pdf(str(sample_pdf))

    assert "Juan Ignacio Gaillour" in text_from_bytes
    assert text_from_bytes == text_from_str


def test_extract_text_from_pdf_file_not_found():
    with pytest.raises(FileNotFoundError):
        extract_text_from_pdf(Path("non_existent_file.pdf"))


def test_extract_text_from_pdf_invalid_type():
    with pytest.raises(TypeError):
        extract_text_from_pdf(12345)  # type: ignore[arg-type]


def test_extract_text_from_pdf_two_columns():
    """Verify that a 2-column layout extracts columns sequentially rather than interleaving rows."""
    typst_code = """
#set page(paper: "a4", margin: (x: 2cm, y: 2cm))
#set text(font: "Liberation Sans", size: 10pt)

= Candidata Ejemplo
Ingeniera de Software \\| candidata(at)mail.com

#v(1em)
#grid(
  columns: (150pt, 1fr),
  column-gutter: 25pt,
  [
    == HABILIDADES
    - Python y FastAPI
    - PostgreSQL y Docker
    - Linux y Git

    == IDIOMAS
    - Espanol nativo
    - Ingles C1
  ],
  [
    == EXPERIENCIA
    === Senior Backend Engineer - TechCorp
    2022 - Presente
    - Liderazgo de arquitectura de microservicios distribuidos con alta concurrencia.
    - Optimizacion de queries SQL reduciendo latencia p99 en 40%.

    === Full Stack Developer - StartupLab
    2020 - 2022
    - Diseno e implementacion de APIs RESTful y dashboards con Next.js.
  ]
)
"""
    pdf_bytes = typst.compile(typst_code.encode("utf-8"))
    extracted = extract_text_from_pdf(pdf_bytes)

    assert "Candidata Ejemplo" in extracted
    assert "HABILIDADES" in extracted
    assert "EXPERIENCIA" in extracted
    assert "Python y FastAPI" in extracted
    assert "Senior Backend Engineer - TechCorp" in extracted

    # Verify column flow: left column content shouldn't be interleaved with right column
    pos_skills = extracted.find("HABILIDADES")
    pos_idiomas = extracted.find("IDIOMAS")
    pos_exp = extracted.find("EXPERIENCIA")

    assert pos_skills != -1 and pos_idiomas != -1 and pos_exp != -1
    # In 2-column extraction, left col text precedes right col text contiguously
    assert pos_skills < pos_idiomas < pos_exp


def test_parse_profile_from_text_empty_error():
    with pytest.raises(ValueError, match="empty"):
        parse_profile_from_text("   \n\t  ")


def test_parse_profile_from_text_heuristic():
    raw_cv = """
    Esteban Quito
    esteban.quito@email.com | +54 9 11 5555-4444 | Buenos Aires, Argentina
    linkedin.com/in/estebanquito | github.com/estebanquito

    RESUMEN PROFESIONAL
    Ingeniero de Software con 4 años de experiencia en desarrollo backend con Python y FastAPI.

    EXPERIENCIA PROFESIONAL
    Acme Software | 2022-01 - Presente | Buenos Aires
    - Diseñé microservicios distribuidos tolerantes a fallos con FastAPI y Redis.
    - Automaticé pipelines de integración continua con Docker y GitHub Actions.

    Globant | 2020 - 2021 | Remoto
    - Desarrollo de APIs RESTful en Python y mantenimiento de bases de datos PostgreSQL.

    HABILIDADES
    Python, FastAPI, Docker, PostgreSQL, Linux, Git
    """
    profile = parse_profile_from_text(raw_cv)

    assert isinstance(profile, Profile)
    assert profile.full_name == "Esteban Quito"
    assert profile.contact.email == "esteban.quito@email.com"
    assert profile.contact.phone == "+54 9 11 5555-4444"
    assert profile.contact.github == "github.com/estebanquito"
    assert profile.contact.linkedin == "linkedin.com/in/estebanquito"

    assert len(profile.skills) >= 4
    skill_names = [s.name for s in profile.skills]
    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    assert "Docker" in skill_names

    assert len(profile.entries) >= 2
    # Verify semantic IDs and facts
    acme_entry = profile.entries[0]
    assert "acme" in acme_entry.id
    assert acme_entry.position == 0  # Most recent
    assert acme_entry.default_selected is True
    assert len(acme_entry.facts) >= 2
    for fact in acme_entry.facts:
        assert fact.id.startswith(f"fact_{acme_entry.id}")
        assert fact.weight == 100
        assert fact.default_selected is True

    # Check reverse chronological position
    globant_entry = profile.entries[1]
    assert "globant" in globant_entry.id
    assert globant_entry.position == 1

    # Verify that the profile compiles cleanly to Typst
    model = RenderModel.from_profile(profile, lang="es", theme="classic", density=0.0)
    result = render_cv(model)
    assert result.pdf_bytes.startswith(b"%PDF-")


def test_parse_profile_from_text_llm_mock(monkeypatch: pytest.MonkeyPatch):
    mock_llm_output = {
        "full_name": "Ana Clara Gomez",
        "default_lang": "es",
        "summary": "Desarrolladora Full Stack con foco en escalabilidad y cloud.",
        "contact": {
            "email": "ana.gomez@test.com",
            "phone": "+54 223 999 8888",
            "location": "Mar del Plata, Argentina",
            "github": "anagomez",
            "linkedin": "anagomez-dev",
            "website": "https://anagomez.dev",
        },
        "skills": [
            {"name": "Python", "category": "Lenguajes", "level": "Avanzado"},
            {"name": "TypeScript", "category": "Lenguajes", "level": "Avanzado"},
            {"name": "Docker", "category": "DevOps"},
        ],
        "entries": [
            {
                "kind": "experience",
                "org": "TechSolutions",
                "title": "Senior Backend Dev",
                "location": "Remoto",
                "start_date": "Junio 2023",
                "end_date": "Presente",
                "bullets": [
                    "Lideré la migración a arquitectura orientada a eventos.",
                    "Reduje tiempos de build de CI en un 50% con caching eficiente.",
                ],
            },
            {
                "kind": "experience",
                "org": "StartupLabs",
                "title": "Backend Developer",
                "location": "Buenos Aires",
                "start_date": "03/2021",
                "end_date": "05/2023",
                "bullets": [
                    "Diseño e implementación de APIs con FastAPI y PostgreSQL.",
                ],
            },
            {
                "kind": "education",
                "org": "Universidad Nacional de Mar del Plata",
                "title": "Ingeniería en Informática",
                "start_date": "2019",
                "end_date": "2024",
                "bullets": ["Promedio destacado."],
            },
        ],
    }

    client = LLMClient(LLMConfig(api_key="mock-key"))
    monkeypatch.setattr(client, "parse_json_completion", lambda *args, **kwargs: mock_llm_output)

    profile = parse_profile_from_text("Dummy resume text", llm=client)

    assert profile.full_name == "Ana Clara Gomez"
    assert profile.contact.email == "ana.gomez@test.com"
    assert profile.contact.website == "https://anagomez.dev"
    assert profile.summary == "Desarrolladora Full Stack con foco en escalabilidad y cloud."

    # Verify normalized ISO dates
    exp_entries = [e for e in profile.entries if e.kind == "experience"]
    assert len(exp_entries) == 2

    tech_sol = exp_entries[0]
    assert tech_sol.id == "exp_techsolutions"
    assert tech_sol.start_date == "2023-06"
    assert tech_sol.end_date == "Presente"
    assert tech_sol.position == 0
    assert len(tech_sol.facts) == 2
    assert tech_sol.facts[0].id == "fact_exp_techsolutions_1"
    assert tech_sol.facts[0].weight == 100
    assert tech_sol.facts[0].default_selected is True

    startup_lab = exp_entries[1]
    assert startup_lab.id == "exp_startuplabs"
    assert startup_lab.start_date == "2021-03"
    assert startup_lab.end_date == "2023-05"
    assert startup_lab.position == 1

    edu_entries = [e for e in profile.entries if e.kind == "education"]
    assert len(edu_entries) == 1
    assert "universidad" in edu_entries[0].id
    assert edu_entries[0].start_date == "2019"
    assert edu_entries[0].end_date == "2024"
    assert edu_entries[0].date_precision == "year"

    # Verify compilation into Typst
    model = RenderModel.from_profile(profile, lang="es", theme="engineering", density=0.0)
    rendered = render_cv(model)
    assert rendered.pdf_bytes.startswith(b"%PDF-")


def test_parse_profile_from_text_llm_fallback_on_error(monkeypatch: pytest.MonkeyPatch):
    client = LLMClient(LLMConfig(api_key="mock-key"))

    def failing_call(*args, **kwargs):
        raise RuntimeError("LLM rate limit or connection error")

    monkeypatch.setattr(client, "parse_json_completion", failing_call)

    raw_cv = """
    Martin Palermo
    martin@boca.com | +54 11 9999-0000 | Buenos Aires
    EXPERIENCIA
    Club Atletico Boca Juniors | 2020 - Presente
    - Goles decisivos en partidos de alta presion.
    """
    profile = parse_profile_from_text(raw_cv, llm=client)
    assert profile.full_name == "Martin Palermo"
    assert profile.contact.email == "martin@boca.com"
    assert len(profile.entries) >= 1

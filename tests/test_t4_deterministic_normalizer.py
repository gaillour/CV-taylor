"""Tests for T4 deterministic normalizers (links, dates, projects, bullets, and fit >= 1)."""

from __future__ import annotations

from back.engine.fit import (
    _select_next_prune_candidate,
    fit_render_model,
)
from back.engine.importer.text_parser import _build_profile_from_dict
from back.engine.models import (
    ContactInfo,
    Entry,
    EntryTitle,
    Fact,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
)
from back.engine.profile_assistant.deterministic import (
    clean_and_deduplicate_profile,
    normalize_contact_link,
)
from back.engine.renderer import measure_fit


def test_normalize_contact_link_variants() -> None:
    # GitHub variants
    assert normalize_contact_link("gaillour", "github") == "github.com/gaillour"
    assert normalize_contact_link("@gaillour", "github") == "github.com/gaillour"
    assert normalize_contact_link("github.com/gaillour/", "github") == "github.com/gaillour"
    assert (
        normalize_contact_link("https://www.github.com/gaillour/", "github")
        == "github.com/gaillour"
    )
    assert normalize_contact_link("", "github") is None
    assert normalize_contact_link(None, "github") is None
    assert normalize_contact_link("null", "github") is None

    # LinkedIn variants
    assert normalize_contact_link("juan-perez", "linkedin") == "linkedin.com/in/juan-perez"
    assert normalize_contact_link("@juan-perez", "linkedin") == "linkedin.com/in/juan-perez"
    assert (
        normalize_contact_link("linkedin.com/in/juan-perez/", "linkedin")
        == "linkedin.com/in/juan-perez"
    )
    assert (
        normalize_contact_link("https://linkedin.com/in/juan/", "linkedin")
        == "linkedin.com/in/juan"
    )
    assert (
        normalize_contact_link("https://www.linkedin.com/in/juan-perez/", "linkedin")
        == "linkedin.com/in/juan-perez"
    )
    assert (
        normalize_contact_link("https://www.linkedin.com/company/acme-corp/", "linkedin")
        == "linkedin.com/company/acme-corp"
    )
    assert (
        normalize_contact_link("https://linkedin.com/pub/juan-perez/1/2/3/", "linkedin")
        == "linkedin.com/pub/juan-perez/1/2/3"
    )
    assert normalize_contact_link("none", "linkedin") is None

    # Website / Entry link variants
    assert normalize_contact_link("https://miweb.dev/", "website") == "miweb.dev"
    assert normalize_contact_link("http://www.miweb.com/", "website") == "miweb.com"
    assert (
        normalize_contact_link("https://github.com/gaillour/cv-tailor/", "website")
        == "github.com/gaillour/cv-tailor"
    )
    assert normalize_contact_link("", "website") is None


def test_equal_dates_collapse_to_single_date() -> None:
    raw = {
        "full_name": "Juan Ignacio Gaillour",
        "contact": {
            "email": "juan@test.com",
            "github": "gaillour",
            "linkedin": "https://linkedin.com/in/juan/",
            "website": "https://miweb.dev/",
        },
        "entries": [
            {
                "kind": "project",
                "title": "CV Tailor",
                "org": "",
                "start_date": "2026",
                "end_date": "2026",
                "bullets": [
                    "Motor de adaptación determinista de CVs en Typst.",
                    "Validación anti-alucinación sobre métricas y tecnologías.",
                ],
            },
            {
                "kind": "experience",
                "org": "Acme",
                "title": "Backend Engineer",
                "start_date": "2026-03",
                "end_date": "2026-03",
                "bullets": ["Desarrollo de APIs en FastAPI."],
            },
        ],
    }

    profile = _build_profile_from_dict(raw)
    assert profile.contact.github == "github.com/gaillour"
    assert profile.contact.linkedin == "linkedin.com/in/juan"
    assert profile.contact.website == "miweb.dev"

    proj = next(e for e in profile.entries if e.kind == "project")
    assert proj.start_date == "2026"
    assert proj.end_date is None
    assert proj.format_date_range("es") == "2026"
    assert proj.format_date_range("en") == "2026"

    exp = next(e for e in profile.entries if e.kind == "experience")
    assert exp.start_date == "2026-03"
    assert exp.end_date is None
    assert exp.format_date_range("es") == "03/2026"

    # Also test clean_and_deduplicate_profile when Entry was constructed with end_date == start_date
    manual_profile = Profile(
        full_name="Juan",
        contact=ContactInfo(
            email="j@test.com",
            phone="123",
            location="AR",
            github="@gaillour",
            linkedin="https://www.linkedin.com/in/juan/",
            website="https://miweb.dev/",
        ),
        entries=[
            Entry(
                id="proj_1",
                kind="project",
                org="",
                start_date="2026",
                end_date="2026",
                date_precision="year",
                link="https://github.com/gaillour/cv-tailor/",
                titles=[EntryTitle(id="t1", title="CV Tailor", is_default=True)],
                facts=[Fact(id="f1", text="Hecho uno.", default_selected=True)],
            )
        ],
    )
    cleaned = clean_and_deduplicate_profile(manual_profile)
    assert cleaned.contact.github == "github.com/gaillour"
    assert cleaned.contact.linkedin == "linkedin.com/in/juan"
    assert cleaned.contact.website == "miweb.dev"
    assert cleaned.entries[0].end_date is None
    assert cleaned.entries[0].format_date_range() == "2026"
    assert cleaned.entries[0].link == "github.com/gaillour/cv-tailor"


def test_project_role_and_org_swap_and_duplicate_org_cleanup() -> None:
    raw = {
        "full_name": "Juan",
        "contact": {"email": "juan@test.com"},
        "entries": [
            {
                "kind": "project",
                "title": "Desarrollador de software",
                "org": "CV Tailor — Motor de CVs",
                "start_date": "2026",
                "bullets": [
                    "Arquitectura de compilación PDF determinista con Typst.",
                    "Integración con FastAPI y Next.js.",
                ],
            },
            {
                "kind": "project",
                "title": "Simulador de Físicas 2D",
                "org": "Simulador de Físicas 2D",
                "start_date": "2025",
                "bullets": ["Motor de colisiones en C++."],
            },
        ],
    }

    profile = _build_profile_from_dict(raw)
    proj_swapped = next(
        e for e in profile.entries if "CV Tailor" in e.titles[0].title
    )
    assert proj_swapped.titles[0].title == "CV Tailor — Motor de CVs"
    assert proj_swapped.role == "Desarrollador de software"
    assert proj_swapped.org == ""

    proj_dup = next(
        e for e in profile.entries if e.titles[0].title == "Simulador de Físicas 2D"
    )
    assert proj_dup.org == ""

    # Verify same swap in clean_and_deduplicate_profile
    manual = Profile(
        full_name="Juan",
        contact=ContactInfo(email="j@test.com", phone="123", location="AR"),
        entries=[
            Entry(
                id="proj_swap",
                kind="project",
                org="CV Tailor — Motor de CVs",
                role=None,
                start_date="2026",
                titles=[
                    EntryTitle(
                        id="t_swap",
                        title="Desarrollador de software",
                        is_default=True,
                    )
                ],
                facts=[Fact(id="f1", text="Logro técnico.", default_selected=True)],
            )
        ],
    )
    cleaned = clean_and_deduplicate_profile(manual)
    assert cleaned.entries[0].titles[0].title == "CV Tailor — Motor de CVs"
    assert cleaned.entries[0].role == "Desarrollador de software"
    assert cleaned.entries[0].org == ""


def test_bullets_breakdown_from_description_and_single_sentence_preservation() -> None:
    raw = {
        "full_name": "Juan",
        "contact": {"email": "juan@test.com"},
        "entries": [
            {
                "kind": "project",
                "title": "Motor de Búsqueda Académico",
                "start_date": "2025",
                "bullets": [],
                "description": (
                    "Diseñé un pipeline RAG híbrido con embeddings densos y BM25 "
                    "para apuntes universitarios. "
                    "Implementé indexación incremental y caché en PostgreSQL "
                    "reduciendo la latencia de consulta."
                ),
            },
            {
                "kind": "experience",
                "org": "Tech Corp",
                "title": "Backend Developer",
                "start_date": "2024",
                "bullets": [
                    "Desarrollé microservicios de facturación electrónica en Python "
                    "con FastAPI y Celery para alto caudal transaccional. "
                    "Automaticé el despliegue continuo con Docker y GitHub Actions "
                    "reduciendo errores manuales en producción."
                ],
            },
            {
                "kind": "project",
                "title": "CLI Dotfiles Manager",
                "start_date": "2023",
                "bullets": [
                    "Herramienta en Rust para sincronizar configuraciones de Arch Linux y Hyprland."
                ],
            },
        ],
    }

    profile = _build_profile_from_dict(raw)
    entries_by_title = {e.titles[0].title: e for e in profile.entries}

    rag_proj = entries_by_title["Motor de Búsqueda Académico"]
    assert len(rag_proj.facts) == 2
    assert rag_proj.min_bullets == 2

    tech_exp = entries_by_title["Backend Developer"]
    assert len(tech_exp.facts) == 2
    assert tech_exp.min_bullets == 2

    cli_proj = entries_by_title["CLI Dotfiles Manager"]
    assert len(cli_proj.facts) == 1
    assert cli_proj.min_bullets == 1


def test_fit_loop_never_leaves_project_or_experience_with_zero_bullets() -> None:
    # 1. Direct check on _select_next_prune_candidate with respect_min_bullets=False
    single_bullet_model = RenderModel(
        full_name="Juan Perez",
        contact=ContactInfo(email="juan@test.com", phone="123", location="AR"),
        experience=[
            RenderEntry(
                entry_id="exp_1",
                title="Backend Engineer",
                org="Acme",
                date_label="2025 - Presente",
                min_bullets=1,
                bullets=[
                    RenderBullet(
                        text="Única viñeta de experiencia que jamás debe podarse a cero.",
                        fact_ids=["f_exp_1"],
                        priority=50,
                        pinned=False,
                        position=0,
                    )
                ],
            )
        ],
        projects=[
            RenderEntry(
                entry_id="proj_1",
                title="CV Tailor",
                org="",
                date_label="2026",
                min_bullets=1,
                bullets=[
                    RenderBullet(
                        text="Única viñeta de proyecto que jamás debe podarse a cero.",
                        fact_ids=["f_proj_1"],
                        priority=10,
                        pinned=False,
                        position=0,
                    )
                ],
            )
        ],
    )
    assert (
        _select_next_prune_candidate(single_bullet_model, respect_min_bullets=False)
        is None
    )

    # 2. Extreme overflow where 1-bullet entries still exceed 1 page:
    # orchestrator must prune an entire non-pinned entry rather than leaving 0 bullets on any entry
    long_sentence = (
        "Diseño e implementación de arquitectura distribuida de alta disponibilidad con "
        "particionado horizontal, replicación síncrona, observabilidad OpenTelemetry, "
        "colas de mensajería asíncrona, control de concurrencia optimista y pruebas de "
        "carga automatizadas en entornos productivos multi-región. "
    ) * 6

    overflow_model = RenderModel(
        full_name="Juan Perez",
        contact=ContactInfo(email="juan@test.com", phone="123", location="AR"),
        summary=long_sentence,
        experience=[
            RenderEntry(
                entry_id=f"exp_{i}",
                title=f"Senior Engineer {i}",
                org=f"Company {i}",
                date_label="2024 - Presente",
                min_bullets=2,
                bullets=[
                    RenderBullet(
                        text=long_sentence,
                        fact_ids=[f"f_exp_{i}_1"],
                        priority=100 - i,
                        pinned=False,
                        position=0,
                    ),
                    RenderBullet(
                        text=long_sentence,
                        fact_ids=[f"f_exp_{i}_2"],
                        priority=90 - i,
                        pinned=False,
                        position=1,
                    ),
                ],
            )
            for i in range(3)
        ],
        projects=[
            RenderEntry(
                entry_id=f"proj_{i}",
                title=f"System Project {i}",
                org="",
                date_label="2025",
                min_bullets=2,
                bullets=[
                    RenderBullet(
                        text=long_sentence,
                        fact_ids=[f"f_proj_{i}_1"],
                        priority=50 - i,
                        pinned=False,
                        position=0,
                    ),
                    RenderBullet(
                        text=long_sentence,
                        fact_ids=[f"f_proj_{i}_2"],
                        priority=40 - i,
                        pinned=False,
                        position=1,
                    ),
                ],
            )
            for i in range(3)
        ],
    )

    assert measure_fit(overflow_model).pages >= 2

    fitted, report = fit_render_model(overflow_model)
    assert report.fits_one_page is True
    assert report.pages == 1
    assert len(fitted.experience) + len(fitted.projects) >= 1
    for exp_entry in fitted.experience:
        assert len(exp_entry.bullets) >= 1
    for proj_entry in fitted.projects:
        assert len(proj_entry.bullets) >= 1

"""Tests for F0: schemas, Master Profile fixture, density knobs, and Typst FitReport."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from back.engine import (
    DesignKnobs,
    Entry,
    EntryTitle,
    JobSpec,
    Profile,
    RenderModel,
    ThemeName,
    measure_fit,
    render_cv,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
FIXTURE_PATH = ROOT_DIR / "fixtures" / "profile_juan.json"


def test_load_master_profile_fixture() -> None:
    profile = Profile.from_json(FIXTURE_PATH)
    assert profile.full_name == "Juan Ignacio Gaillour"
    assert len(profile.skills) >= 20
    assert len(profile.entries) == 10  # 3 experiences + 6 projects + 1 education

    entries_by_id = {e.id: e for e in profile.entries}
    simple = entries_by_id["exp_simple_mdq"]
    assert simple.start_date == "2025-06"
    assert simple.end_date == "present"
    assert simple.format_date_range("es") == "06/2025 - Presente"
    assert simple.format_date_range("en") == "06/2025 - Present"
    assert len(simple.facts) >= 8

    scania = entries_by_id["exp_scania"]
    assert scania.start_date == "2026-02"
    assert scania.end_date == "2026-02"
    assert scania.format_date_range("es") == "02/2026"
    assert scania.format_date_range("en") == "02/2026"


def test_ai_title_requires_human_approval() -> None:
    with pytest.raises(ValidationError):
        EntryTitle(
            id="t_ai_invalid",
            title="Senior Principal Architect",
            source="ai",
            approved=True,
            approved_at=None,
        )

    profile = Profile.from_json(FIXTURE_PATH)
    simple = next(e for e in profile.entries if e.id == "exp_simple_mdq")
    unapproved = EntryTitle(
        id="t_ai_pending",
        entry_id=simple.id,
        title="Staff Backend Engineer",
        source="ai",
        approved=False,
    )
    simple.titles.append(unapproved)

    with pytest.raises(ValueError, match="not approved"):
        simple.select_title(title_id="t_ai_pending")


@pytest.mark.parametrize("theme", ["classic", "modern", "engineering"])
def test_render_all_single_column_themes_deterministic(theme: ThemeName) -> None:
    profile = Profile.from_json(FIXTURE_PATH)
    model = RenderModel.from_profile(
        profile,
        lang="es",
        archetype="dev",
        theme=theme,
        density=0.0,
        include_summary=True,
    )
    res1 = render_cv(model, include_svg=True)
    res2 = render_cv(model, include_svg=False)

    assert res1.pdf_bytes.startswith(b"%PDF-")
    assert b"/H1" in res1.pdf_bytes
    assert b"/H2" in res1.pdf_bytes
    assert res1.pdf_sha256 == res2.pdf_sha256
    assert res1.render_model.summary is not None
    assert res1.fit_report.summary_pruned is False
    assert res1.fit_report.pages == 1
    assert res1.fit_report.fits_one_page is True
    assert 75.0 <= res1.fit_report.fill_pct <= 100.0
    assert len(res1.svg_pages) == 1
    assert b"<svg" in res1.svg_pages[0]


def test_density_knobs_monotonically_reduce_vertical_fill() -> None:
    profile = Profile.from_json(FIXTURE_PATH)

    model_d0 = RenderModel.from_profile(profile, archetype="dev", density=0.0, include_summary=True)
    model_d05 = RenderModel.from_profile(
        profile, archetype="dev", density=0.5, include_summary=True
    )
    model_d1 = RenderModel.from_profile(profile, archetype="dev", density=1.0, include_summary=True)

    fit_d0 = measure_fit(model_d0)
    fit_d05 = measure_fit(model_d05)
    fit_d1 = measure_fit(model_d1)

    assert fit_d0.end_y_pt > fit_d05.end_y_pt > fit_d1.end_y_pt
    assert fit_d0.fill_pct > fit_d05.fill_pct > fit_d1.fill_pct


def test_overflow_detection_when_all_facts_included() -> None:
    profile = Profile.from_json(FIXTURE_PATH)
    full_model = RenderModel.from_profile(
        profile,
        include_all=True,
        include_summary=True,
        density=0.0,
    )
    fit = measure_fit(full_model)
    assert fit.pages >= 2
    assert fit.fits_one_page is False
    assert fit.fill_pct > 100.0


def test_job_spec_and_design_knobs_validation() -> None:
    spec = JobSpec(
        company="Acme",
        role="Backend Python Developer",
        lang="es",
        keywords=["Python", "FastAPI", "PostgreSQL"],
    )
    assert spec.company == "Acme"

    with pytest.raises(ValueError, match="density must be in"):
        DesignKnobs.from_density(1.5)


@pytest.mark.parametrize("theme", ["classic", "modern", "engineering"])
def test_ats_linear_reading_order_and_canonical_headers(
    theme: ThemeName,
    tmp_path: Path,
) -> None:
    profile = Profile.from_json(FIXTURE_PATH)
    model = RenderModel.from_profile(profile, lang="es", archetype="dev", theme=theme)
    pdf_path = tmp_path / f"cv_{theme}.pdf"
    res = render_cv(model, output_pdf=pdf_path)

    assert b"/H1" in res.pdf_bytes
    assert b"/H2" in res.pdf_bytes
    assert res.render_model.summary is not None

    if shutil.which("pdftotext"):
        proc = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            check=True,
        )
        extracted = proc.stdout
        assert "Desarrollador Full Stack / Backend — Simple MDQ | 06/2025 - Presente" in extracted
        assert "02/2026" in extracted
        assert "02/2026 - 02/2026" not in extracted
        assert (
            "Ingeniería Informática — Universidad Nacional de Mar del Plata | 03/2022 - Presente"
            in extracted
        )
        upper_text = extracted.upper()
        for header in (
            "RESUMEN PROFESIONAL",
            "EXPERIENCIA PROFESIONAL",
            "PROYECTOS",
            "EDUCACIÓN",
            "HABILIDADES",
        ):
            assert header in upper_text


def test_identical_date_range_formats_as_single_point() -> None:
    entry = Entry(
        id="test_exp",
        kind="experience",
        org="Acme Corp",
        start_date="2024-05",
        end_date="2024-05",
        date_precision="month",
        titles=[EntryTitle(id="t1", title="Eng", approved=True)],
    )
    assert entry.format_date_range("es") == "05/2024"
    assert entry.format_date_range("en") == "05/2024"

    entry_year = Entry(
        id="test_exp_yr",
        kind="experience",
        org="Acme Corp",
        start_date="2023-01",
        end_date="2023-11",
        date_precision="year",
        titles=[EntryTitle(id="t2", title="Eng", approved=True)],
    )
    assert entry_year.format_date_range("es") == "2023"


def test_from_profile_with_many_projects_never_leaves_empty_titles() -> None:
    profile = Profile.model_validate_json(Path("out/profile.json").read_text(encoding="utf-8"))
    # Ensure profile has >= 3 projects
    proj_count = len([e for e in profile.entries if e.kind == "project"])
    assert proj_count >= 3

    model = RenderModel.from_profile(profile, theme="classic")
    assert len(model.projects) <= 3
    assert len(model.projects) > 0
    for p in model.projects:
        # Every project must have at least 1 bullet point (never an isolated title)
        assert len(p.bullets) >= 1


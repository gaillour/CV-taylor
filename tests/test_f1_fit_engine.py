"""Tests for F1: deterministic 1-page A4 fit engine (density search, pruning, underfill)."""

from __future__ import annotations

from pathlib import Path

import pytest

from back.engine import (
    MAX_COMFORTABLE_DENSITY,
    MAX_EDUCATION_ENTRIES,
    MAX_EXPERIENCE_ENTRIES,
    MAX_PROJECT_ENTRIES,
    DesignKnobs,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
    ThemeName,
    fit_render_model,
    measure_fit,
    render_cv,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
JUAN_FIXTURE = ROOT_DIR / "fixtures" / "profile_juan.json"
OVERFLOW_FIXTURE = ROOT_DIR / "fixtures" / "profile_overflow_extreme.json"
UNDERFILL_FIXTURE = ROOT_DIR / "fixtures" / "profile_underfill_sparse.json"


def test_density_and_relaxed_interpolation_bounds() -> None:
    d0 = DesignKnobs.from_density(0.0)
    d05 = DesignKnobs.from_density(0.5)
    d1 = DesignKnobs.from_density(1.0)

    assert d0.font_size_pt > d05.font_size_pt > d1.font_size_pt
    assert d0.leading_em > d05.leading_em > d1.leading_em
    assert d0.section_spacing_pt > d05.section_spacing_pt > d1.section_spacing_pt
    assert d0.entry_spacing_pt > d05.entry_spacing_pt > d1.entry_spacing_pt
    assert d0.bullet_spacing_pt > d05.bullet_spacing_pt > d1.bullet_spacing_pt
    assert d0.margin_x_cm > d05.margin_x_cm > d1.margin_x_cm
    assert d0.margin_y_cm > d05.margin_y_cm > d1.margin_y_cm

    r0 = DesignKnobs.from_relaxed(0.0)
    r1 = DesignKnobs.from_relaxed(1.0)
    assert r0 == d0
    assert r1.font_size_pt == 10.9
    assert r1.leading_em == 0.74

    with pytest.raises(ValueError, match="relax must be in"):
        DesignKnobs.from_relaxed(-0.1)


def test_binary_search_density_resolves_moderate_overflow_without_pruning() -> None:
    profile = Profile.from_json(JUAN_FIXTURE)
    model = RenderModel.from_profile(
        profile,
        lang="es",
        archetype="soporte",
        theme="classic",
        density=0.0,
        include_summary=True,
    )
    raw_fit = measure_fit(model)
    assert raw_fit.pages == 2
    assert raw_fit.fits_one_page is False

    fitted_model, fit_report = fit_render_model(model)
    assert fit_report.pages == 1
    assert fit_report.fits_one_page is True
    assert fit_report.fill_pct >= 85.0
    assert fit_report.underfilled is False
    assert 0.0 < fitted_model.design.density <= 1.0
    assert fit_report.pruned_fact_ids == []
    assert fit_report.summary_pruned is False


def test_priority_pruning_tie_breaks_by_bullet_position_and_respects_pinned() -> None:
    profile = Profile.from_json(OVERFLOW_FIXTURE)
    base_model = RenderModel.from_profile(
        profile,
        include_all=True,
        include_summary=True,
        density=1.0,
    )
    # Inject synthetic entry with equal-priority bullets to verify deterministic position tie-break
    synthetic_entry = RenderEntry(
        entry_id="exp_tie_test",
        title="Backend Engineer",
        org="TieBreak Corp",
        date_label="01/2025 - Presente",
        min_bullets=1,
        bullets=[
            RenderBullet(
                text="Viñeta anclada principal que jamás debe ser podada en ningún caso.",
                fact_ids=["fact_tie_pinned"],
                priority=50,
                pinned=True,
                position=1,
            ),
            RenderBullet(
                text=(
                    "Viñeta secundaria con prioridad empatada en posición 2 "
                    "que debe sobrevivir antes que la posición 3."
                ),
                fact_ids=["fact_tie_pos2"],
                priority=30,
                pinned=False,
                position=2,
            ),
            RenderBullet(
                text=(
                    "Viñeta secundaria con prioridad empatada en posición 3 "
                    "que debe podarse primero por desempate de posición."
                ),
                fact_ids=["fact_tie_pos3"],
                priority=30,
                pinned=False,
                position=3,
            ),
        ],
    )
    overflow_model = base_model.model_copy(
        update={"experience": [synthetic_entry, *base_model.experience]}
    )

    fitted_model, fit_report = fit_render_model(overflow_model)
    assert fit_report.pages == 1
    assert fit_report.fits_one_page is True
    assert fit_report.fill_pct >= 85.0
    assert fit_report.summary_pruned is False
    assert fitted_model.summary is not None

    # Pinned bullet is never pruned even though its priority (50) is lower than other bullets
    assert "fact_tie_pinned" not in fit_report.pruned_fact_ids

    # Tie-break bullets share priority 30 (lowest), so pos3 must be pruned before pos2
    idx_pos3 = fit_report.pruned_fact_ids.index("fact_tie_pos3")
    idx_pos2 = fit_report.pruned_fact_ids.index("fact_tie_pos2")
    assert idx_pos3 < idx_pos2


def test_readding_shorter_pruned_bullet_compensates_post_pruning_underfill() -> None:
    profile = Profile.from_json(JUAN_FIXTURE)
    base_model = RenderModel.from_profile(
        profile,
        archetype="dev",
        theme="classic",
        density=1.0,
        include_summary=False,
    )
    # Add two non-pinned bullets to first experience:
    # 1. A short 1-line bullet with lower priority (10) at position 10 -> pruned FIRST
    # 2. A massive multi-line bullet with higher priority (20) at position 11 -> pruned SECOND
    short_bullet = RenderBullet(
        text="Optimización de consultas SQL e índices parciales en PostgreSQL.",
        fact_ids=["fact_short_readd"],
        priority=10,
        pinned=False,
        position=10,
    )
    huge_paragraph = " ".join(
        [
            "Implementación exhaustiva de pipelines distribuidos de validación transaccional,",
            "auditoría criptográfica, replicación multi-región, telemetría continua y control",
            "de concurrencia optimista sobre motores relacionales de misión crítica.",
        ]
        * 35
    )
    huge_bullet = RenderBullet(
        text=huge_paragraph,
        fact_ids=["fact_huge_overflow"],
        priority=20,
        pinned=False,
        position=11,
    )

    exp0 = base_model.experience[0]
    modified_exp0 = exp0.model_copy(
        update={"bullets": [*exp0.bullets[:2], short_bullet, huge_bullet]}
    )
    test_model = base_model.model_copy(
        update={"experience": [modified_exp0, *base_model.experience[1:]]}
    )

    assert measure_fit(test_model).pages >= 2
    fitted_model, fit_report = fit_render_model(test_model)

    assert fit_report.pages == 1
    assert fit_report.fill_pct >= 85.0
    # The massive bullet remains pruned, while the short bullet was re-added after space opened up
    assert "fact_huge_overflow" in fit_report.pruned_fact_ids
    assert "fact_short_readd" not in fit_report.pruned_fact_ids


@pytest.mark.parametrize("theme", ["classic", "modern", "engineering"])
def test_extreme_overflow_fixture_compiles_to_one_page_across_all_themes(
    theme: ThemeName,
) -> None:
    profile = Profile.from_json(OVERFLOW_FIXTURE)
    raw_model = RenderModel.from_profile(
        profile,
        theme=theme,
        include_all=True,
        include_summary=True,
        density=0.0,
    )
    raw_fit = measure_fit(raw_model)
    assert raw_fit.pages >= 2
    assert raw_fit.fill_pct > 130.0

    res1 = render_cv(raw_model, include_svg=True)
    res2 = render_cv(raw_model, include_svg=False)

    assert res1.pdf_sha256 == res2.pdf_sha256
    assert b"/H1" in res1.pdf_bytes
    assert b"/H2" in res1.pdf_bytes
    assert res1.fit_report.pages == 1
    assert res1.fit_report.fits_one_page is True
    assert res1.fit_report.fill_pct >= 85.0
    assert res1.fit_report.underfilled is False
    assert res1.fit_report.summary_pruned is False
    assert res1.render_model.summary is not None
    assert len(res1.render_model.experience) <= MAX_EXPERIENCE_ENTRIES
    assert len(res1.render_model.projects) <= MAX_PROJECT_ENTRIES
    assert len(res1.render_model.education) <= MAX_EDUCATION_ENTRIES

    assert len(res1.fit_report.pruned_fact_ids) >= 3
    assert len(res1.svg_pages) == 1

    # Verify all pinned facts in retained entries survived pruning
    retained_entry_ids = {
        e.entry_id
        for e in [
            *res1.render_model.experience,
            *res1.render_model.projects,
            *res1.render_model.education,
        ]
    }
    pinned_ids = {
        f.id
        for entry in profile.entries
        if entry.id in retained_entry_ids
        for f in entry.facts
        if f.pinned
    }
    assert pinned_ids.isdisjoint(set(res1.fit_report.pruned_fact_ids))

    # Verify min_bullets and max_bullets respected on every retained experience and project entry
    for entry in [*res1.render_model.experience, *res1.render_model.projects]:
        assert entry.min_bullets <= len(entry.bullets) <= entry.max_bullets


@pytest.mark.parametrize("theme", ["classic", "modern", "engineering"])
def test_underfill_sparse_fixture_compensates_with_and_without_profile_pool(
    theme: ThemeName,
) -> None:
    profile = Profile.from_json(UNDERFILL_FIXTURE)
    sparse_model = RenderModel.from_profile(
        profile,
        theme=theme,
        density=0.8,
        include_summary=False,
        include_all=False,
    )
    raw_fit = measure_fit(sparse_model)
    assert raw_fit.pages == 1
    assert raw_fit.fill_pct < 75.0
    assert raw_fit.underfilled is True

    # 1. With candidate_pool=profile (re-adds unselected facts/entries + relaxes density)
    res_pool_1 = render_cv(sparse_model, candidate_pool=profile)
    res_pool_2 = render_cv(sparse_model, candidate_pool=profile)
    assert res_pool_1.pdf_sha256 == res_pool_2.pdf_sha256
    assert res_pool_1.fit_report.pages == 1
    assert res_pool_1.fit_report.fits_one_page is True
    assert res_pool_1.fit_report.fill_pct >= 85.0
    assert res_pool_1.fit_report.underfilled is False

    # 2. Without candidate_pool (relaxes density and typographic knobs alone)
    res_solo_1 = render_cv(sparse_model, candidate_pool=None)
    res_solo_2 = render_cv(sparse_model, candidate_pool=None)
    assert res_solo_1.pdf_sha256 == res_solo_2.pdf_sha256
    assert res_solo_1.fit_report.pages == 1
    assert res_solo_1.fit_report.fits_one_page is True
    assert res_solo_1.fit_report.fill_pct >= 85.0
    assert res_solo_1.fit_report.underfilled is False


@pytest.mark.parametrize("theme", ["classic", "modern", "engineering"])
def test_juan_master_profile_all_facts_fits_one_page_deterministically(
    theme: ThemeName,
) -> None:
    profile = Profile.from_json(JUAN_FIXTURE)
    full_model = RenderModel.from_profile(
        profile,
        theme=theme,
        include_all=True,
        include_summary=True,
        density=0.0,
    )
    res1 = render_cv(full_model)
    res2 = render_cv(full_model)

    assert res1.pdf_sha256 == res2.pdf_sha256
    assert b"/H1" in res1.pdf_bytes
    assert b"/H2" in res1.pdf_bytes
    assert res1.fit_report.pages == 1
    assert res1.fit_report.fits_one_page is True
    assert res1.fit_report.fill_pct >= 85.0
    assert res1.fit_report.underfilled is False
    assert res1.fit_report.summary_pruned is False
    assert res1.render_model.summary is not None
    assert len(res1.render_model.experience) <= MAX_EXPERIENCE_ENTRIES
    assert len(res1.render_model.projects) <= MAX_PROJECT_ENTRIES
    assert len(res1.render_model.education) <= MAX_EDUCATION_ENTRIES


def test_overflow_converges_to_comfortable_density_cap() -> None:
    profile = Profile.from_json(OVERFLOW_FIXTURE)
    overflow_model = RenderModel.from_profile(
        profile,
        include_all=True,
        include_summary=True,
        density=0.0,
    )
    raw_fit = measure_fit(overflow_model)
    assert raw_fit.pages >= 2
    assert not raw_fit.fits_one_page

    fitted_model, fit_report = fit_render_model(overflow_model)
    assert fit_report.pages == 1
    assert fit_report.fits_one_page is True
    # The resulting density MUST NEVER exceed MAX_COMFORTABLE_DENSITY (0.35)
    assert fitted_model.design.density <= MAX_COMFORTABLE_DENSITY
    assert fit_report.density <= MAX_COMFORTABLE_DENSITY
    assert fit_report.fill_pct >= 85.0


def test_bottom_up_pruning_drops_last_project_before_recent_experience() -> None:
    profile = Profile.from_json(JUAN_FIXTURE)
    base_model = RenderModel.from_profile(
        profile,
        archetype="dev",
        theme="classic",
        density=0.0,
        include_summary=True,
    )

    # Construct two projects and two experiences with equal bullet priorities
    exp_recent = RenderEntry(
        entry_id="exp_recent",
        title="Senior Backend Engineer",
        org="Alpha Tech",
        date_label="2024 - Presente",
        min_bullets=1,
        bullets=[
            RenderBullet(
                text="Desarrollo de microservicios con FastAPI y PostgreSQL.",
                fact_ids=["fact_exp_rec_1"],
                priority=100,
                pinned=False,
                position=1,
            ),
            RenderBullet(
                text="Optimización de caching distribuido con Redis y pipelines.",
                fact_ids=["fact_exp_rec_2"],
                priority=100,
                pinned=False,
                position=2,
            ),
        ],
    )
    exp_old = RenderEntry(
        entry_id="exp_old",
        title="Junior Developer",
        org="Beta Solutions",
        date_label="2022 - 2024",
        min_bullets=1,
        bullets=[
            RenderBullet(
                text="Mantenimiento de bases de datos relacionales y queries.",
                fact_ids=["fact_exp_old_1"],
                priority=100,
                pinned=False,
                position=1,
            ),
            RenderBullet(
                text="Testing de endpoints REST y documentación técnica.",
                fact_ids=["fact_exp_old_2"],
                priority=100,
                pinned=False,
                position=2,
            ),
        ],
    )
    proj_first = RenderEntry(
        entry_id="proj_first",
        title="Sistema de Turnos SaaS",
        org="Freelance",
        date_label="2024",
        min_bullets=1,
        bullets=[
            RenderBullet(
                text="Arquitectura multi-inquilino con FastAPI y frontend Next.js.",
                fact_ids=["fact_proj1_1"],
                priority=100,
                pinned=False,
                position=1,
            ),
            RenderBullet(
                text="Integración de pasarela de pagos con Stripe y webhooks.",
                fact_ids=["fact_proj1_2"],
                priority=100,
                pinned=False,
                position=2,
            ),
        ],
    )
    proj_last = RenderEntry(
        entry_id="proj_last",
        title="Simulador de CPU 32 Bits",
        org="Facultad",
        date_label="2023",
        min_bullets=1,
        bullets=[
            RenderBullet(
                text="Emulación de ciclo fetch-decode-execute en lenguaje C.",
                fact_ids=["fact_proj_last_1"],
                priority=100,
                pinned=False,
                position=1,
            ),
            RenderBullet(
                text="Decodificación de instrucciones ISA y pipeline superescalar.",
                fact_ids=["fact_proj_last_2"],
                priority=100,
                pinned=False,
                position=2,
            ),
        ],
    )

    # Force overflow by duplicating bulky bullet paragraphs into entries
    overflow_experience = [exp_recent, exp_old]
    overflow_projects = [proj_first, proj_last]

    test_model = base_model.model_copy(
        update={
            "experience": overflow_experience,
            "projects": overflow_projects,
        }
    )

    fitted_model, fit_report = fit_render_model(test_model)
    assert fit_report.fits_one_page is True
    assert fit_report.pages == 1
    assert fit_report.density <= MAX_COMFORTABLE_DENSITY

    # If bullets were pruned, the last project's final bullet must be pruned FIRST,
    # and recent experience bullets must not be pruned before the projects are pruned.
    if fit_report.pruned_fact_ids:
        # Check that fact_proj_last_2 was pruned before any recent experience bullets
        if "fact_exp_rec_2" in fit_report.pruned_fact_ids:
            idx_proj_last = fit_report.pruned_fact_ids.index("fact_proj_last_2")
            idx_exp_recent = fit_report.pruned_fact_ids.index("fact_exp_rec_2")
            assert idx_proj_last < idx_exp_recent
        else:
            # Recent experience bullet was not even touched while project bullet was pruned
            assert "fact_proj_last_2" in fit_report.pruned_fact_ids


def test_fit_engine_guarantees_85_to_100_percent_fill_and_avoids_aggressive_pruning() -> None:
    profile = Profile.from_json(JUAN_FIXTURE)
    base_model = RenderModel.from_profile(
        profile,
        archetype="dev",
        theme="classic",
        density=0.0,
        include_summary=True,
    )

    # Artificially expand base model to force overflow to 2 pages
    extra_bullets = [
        RenderBullet(
            text=f"Viñeta sintética adicional de gran longitud #{i} para forzar overflow controlado.",
            fact_ids=[f"fact_overflow_synthetic_{i}"],
            priority=10 + i,
            pinned=False,
            position=90 + i,
        )
        for i in range(5)
    ]
    exp0 = base_model.experience[0]
    modified_exp = exp0.model_copy(update={"bullets": [*exp0.bullets, *extra_bullets]})
    overflow_model = base_model.model_copy(
        update={"experience": [modified_exp, *base_model.experience[1:]]}
    )

    assert measure_fit(overflow_model).pages >= 2

    fitted_model, fit_report = fit_render_model(overflow_model, candidate_pool=profile)

    assert fit_report.fits_one_page is True
    assert fit_report.pages == 1
    assert 85.0 <= fit_report.fill_pct <= 98.0
    assert fit_report.underfilled is False
    # Ensure projects weren't gutted to 1 bullet each
    for proj in fitted_model.projects:
        assert len(proj.bullets) >= 1


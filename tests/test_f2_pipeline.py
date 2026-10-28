"""Comprehensive tests for F2: LLM Adapter, JobSpec, Anti-Hallucination, Tailor, ATS, CLI."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from back.cli import main as cli_main
from back.engine import (
    AntiHallucinationValidator,
    JobSpec,
    LLMClient,
    LLMConfig,
    Profile,
    RenderBullet,
    RenderModel,
    Snapshot,
    TailorEngine,
    TailoringPipeline,
    extract_job_spec,
    extract_job_spec_heuristic,
)

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
PROFILE_PATH = FIXTURES_DIR / "profile_juan.json"
OFFER_PATH = FIXTURES_DIR / "offer_backend.txt"


def test_llm_config_env_priority(monkeypatch: pytest.MonkeyPatch) -> None:
    # 1. Gemini default model
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    cfg = LLMConfig.from_env()
    assert cfg.api_key == "test-gemini-key"
    assert "googleapis" in cfg.base_url
    assert cfg.model == "gemini-flash-lite-latest"

    # 1b. Gemini model override
    monkeypatch.setenv("LLM_MODEL", "custom-lite-model")
    assert LLMConfig.from_env().model == "custom-lite-model"
    monkeypatch.setenv("GEMINI_MODEL", "custom-gemini-model")
    assert LLMConfig.from_env().model == "custom-gemini-model"
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)

    # 2. OpenRouter
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    cfg2 = LLMConfig.from_env()
    assert cfg2.api_key == "test-openrouter-key"
    assert "openrouter" in cfg2.base_url

    # 3. Fallback unconfigured
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    cfg3 = LLMConfig.from_env()
    client = LLMClient(cfg3)
    assert not client.is_configured


def test_jobspec_extractor_heuristic() -> None:
    text = OFFER_PATH.read_text(encoding="utf-8")
    spec = extract_job_spec_heuristic(text)

    assert spec.lang == "es"
    assert spec.role is not None
    assert "Python" in spec.keywords
    assert "FastAPI" in spec.keywords
    assert "PostgreSQL" in spec.keywords
    assert "Docker" in spec.keywords
    assert len(spec.must_have) >= 3


def test_anti_hallucination_detects_invented_metrics() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    validator = AntiHallucinationValidator(profile)

    simple = next(e for e in profile.entries if e.id == "exp_simple_mdq")
    real_fact = simple.facts[0]

    # Valid bullet matching fact
    valid_bullet = RenderBullet(
        text=real_fact.text,
        fact_ids=[real_fact.id],
        skill_ids=list(real_fact.skill_ids),
    )
    assert len(validator.validate_bullet(valid_bullet)) == 0

    # Bullet with an invented percentage not in source fact
    hallucinated_bullet = RenderBullet(
        text=f"{real_fact.text} logrando una mejora del 99.5% de performance y 10x throughput.",
        fact_ids=[real_fact.id],
        skill_ids=list(real_fact.skill_ids),
    )
    violations = validator.validate_bullet(hallucinated_bullet)
    assert len(violations) > 0
    assert any(v.kind == "invented_metric" for v in violations)


def test_anti_hallucination_detects_unauthorized_skills() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    validator = AntiHallucinationValidator(profile)

    simple = next(e for e in profile.entries if e.id == "exp_simple_mdq")
    real_fact = simple.facts[0]

    # Bullet introducing Rust and Kubernetes which the candidate does not have
    hallucinated_bullet = RenderBullet(
        text="Diseñé microservicios distribuidos usando Rust y Kubernetes en clústeres bare-metal.",
        fact_ids=[real_fact.id],
        skill_ids=list(real_fact.skill_ids),
    )
    violations = validator.validate_bullet(hallucinated_bullet)
    assert len(violations) > 0
    assert any(v.kind == "unauthorized_skill" for v in violations)


def test_anti_hallucination_requires_valid_fact_citation() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    validator = AntiHallucinationValidator(profile)

    # Bullet with missing fact citations
    uncited_bullet = RenderBullet(
        text="Implementé endpoints REST con FastAPI.",
        fact_ids=[],
        skill_ids=["fastapi"],
    )
    violations = validator.validate_bullet(uncited_bullet)
    assert any(v.kind == "uncited_fact" for v in violations)

    # Bullet citing a non-existent fact ID
    fake_id_bullet = RenderBullet(
        text="Implementé endpoints REST con FastAPI.",
        fact_ids=["fact_totally_invented_999"],
        skill_ids=["fastapi"],
    )
    violations2 = validator.validate_bullet(fake_id_bullet)
    assert any(v.kind == "uncited_fact" for v in violations2)


def test_tailor_engine_prioritizes_relevant_skills_and_entries() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    spec = extract_job_spec(OFFER_PATH.read_text(encoding="utf-8"))

    engine = TailorEngine(profile)
    model = engine.tailor(spec, theme="modern", lang="es", use_llm=False)

    assert model.lang == "es"
    assert model.theme == "modern"
    assert len(model.experience) <= 3
    assert len(model.projects) <= 3
    assert len(model.education) <= 2

    # Check that skills prioritized Python and FastAPI
    backend_skills = next(
        g
        for g in model.skills
        if "backend" in g.category.lower() or "lenguajes" in g.category.lower()
    )
    assert "FastAPI" in backend_skills.items or "Python" in backend_skills.items


def test_feedback_loop_pipeline_end_to_end(tmp_path: Path) -> None:
    profile = Profile.from_json(PROFILE_PATH)
    offer_text = OFFER_PATH.read_text(encoding="utf-8")
    job_spec = extract_job_spec(offer_text)

    pipeline = TailoringPipeline(profile)
    result = pipeline.run(job_spec, theme="classic", lang="es", use_llm=False)

    # PDF Assertions
    assert result.pdf_bytes.startswith(b"%PDF-")
    assert len(result.pdf_sha256) == 64

    # 1-Page Guarantee
    assert result.fit_report.pages == 1
    assert result.fit_report.fits_one_page is True
    assert 70.0 <= result.fit_report.fill_pct <= 100.0

    # ATS Score
    assert result.ats_report.total_score >= 80.0
    assert len(result.ats_report.keyword_matches) >= 3

    # Anti-Hallucination
    assert result.validation_report.is_valid is True

    # Snapshot integrity
    snap = result.snapshot
    assert snap.pdf_sha256 == result.pdf_sha256
    assert snap.role == job_spec.role
    snap_path = tmp_path / "snapshot_test.json"
    snap.save(snap_path)
    loaded_snap = Snapshot.load(snap_path)
    assert loaded_snap.pdf_sha256 == snap.pdf_sha256
    assert loaded_snap.render_model.full_name == profile.full_name


def test_cli_tailor_execution(tmp_path: Path) -> None:
    out_pdf = tmp_path / "test_out.pdf"
    out_snap = tmp_path / "test_out.json"

    exit_code = cli_main(
        [
            "tailor",
            str(OFFER_PATH),
            "--profile",
            str(PROFILE_PATH),
            "--theme",
            "engineering",
            "--lang",
            "es",
            "--out",
            str(out_pdf),
            "--snapshot",
            str(out_snap),
            "--no-llm",
        ]
    )

    assert exit_code == 0
    assert out_pdf.exists()
    assert out_pdf.read_bytes().startswith(b"%PDF-")
    assert out_snap.exists()

    snap_data = json.loads(out_snap.read_text(encoding="utf-8"))
    assert snap_data["theme"] == "engineering"
    assert snap_data["lang"] == "es"
    assert snap_data["ats_score"] is not None


def test_cli_check_ats(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = cli_main(
        [
            "check-ats",
            str(OFFER_PATH),
            "--keywords",
            "Python,FastAPI,Docker,PostgreSQL",
        ]
    )
    assert exit_code == 0
    captured = capsys.readouterr()
    assert "Reporte de Compatibilidad ATS" in captured.out
    assert "Puntaje Total" in captured.out


def test_anti_hallucination_suggests_safe_alternatives() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    validator = AntiHallucinationValidator(profile)

    # Bullet with an invented metric (+99% improvement)
    hallucinated_bullet = RenderBullet(
        text="Desarrollo de plataforma SaaS con FastAPI logrando un 99% de optimización inventada.",
        fact_ids=["fact_turniate_saas"],
    )

    violations = validator.validate_bullet(hallucinated_bullet)
    assert len(violations) > 0
    assert any(v.kind == "invented_metric" for v in violations)

    # Check that safe alternatives are provided
    safe_opts = violations[0].safe_alternatives
    assert len(safe_opts) >= 2
    # Option 1 is the exact truth from source fact
    assert "FastAPI y Next.js" in safe_opts[0]
    # No unverified 99% metric appears in the source alternative
    assert "99%" not in safe_opts[0]


def test_anti_hallucination_allows_parent_entry_numbers() -> None:
    profile = Profile.from_json(PROFILE_PATH)
    validator = AntiHallucinationValidator(profile)

    # Bullet mentioning 32 bits from "Máquina Virtual de 32 Bits"
    bullet_vm32 = RenderBullet(
        text="Built a 32-bit CPU emulator in Java executing compiled binaries.",
        fact_ids=["fact_vm32_emulador"],
    )

    violations = validator.validate_bullet(bullet_vm32)
    # "32" is traceable from the entry title / source fact
    metric_violations = [v for v in violations if v.kind == "invented_metric"]
    assert len(metric_violations) == 0


def test_harmonize_resume_preserves_anti_hallucination_invariants(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    profile = Profile.from_json(PROFILE_PATH)
    client = LLMClient(LLMConfig(api_key="test-key", base_url="https://api.openai.com/v1"))
    engine = TailorEngine(profile, client=client)

    job_spec = JobSpec(
        company="TechCorp",
        role="Backend Engineer",
        keywords=["Python", "FastAPI", "PostgreSQL"],
    )

    base_model = RenderModel.from_profile(profile, lang="es", theme="classic")
    exp_entry = base_model.experience[0]
    first_bullet = exp_entry.bullets[0]

    # Valid editorial polish (no hallucinations, action verb, same fact_id)
    polished_text = (
        "Lideré el diseño e implementación de endpoints de "
        "alta concurrencia con FastAPI y PostgreSQL."
    )
    mock_response = {
        "summary": "Desarrollador Backend con experiencia en Python y FastAPI.",
        "experience": [
            {
                "entry_id": exp_entry.entry_id,
                "bullets": [
                    {
                        "fact_ids": first_bullet.fact_ids,
                        "text": polished_text,
                        "skill_ids": ["python", "fastapi", "postgresql"],
                    }
                ],
            }
        ],
        "projects": [],
        "education": [],
    }

    monkeypatch.setattr(client, "parse_json_completion", lambda *args, **kwargs: mock_response)

    harmonized = engine.harmonize_resume(base_model, job_spec)
    assert harmonized.experience[0].bullets[0].text == polished_text
    assert harmonized.experience[0].bullets[0].fact_ids == first_bullet.fact_ids
    val_report = engine.validator.validate_model(harmonized)
    assert val_report.is_valid is True


def test_harmonize_resume_rejects_hallucinated_metrics_and_skills(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    profile = Profile.from_json(PROFILE_PATH)
    client = LLMClient(LLMConfig(api_key="test-key", base_url="https://api.openai.com/v1"))
    engine = TailorEngine(profile, client=client)

    job_spec = JobSpec(
        company="TechCorp",
        role="Backend Engineer",
        keywords=["Python", "FastAPI"],
    )

    base_model = RenderModel.from_profile(profile, lang="es", theme="classic")
    exp_entry = base_model.experience[0]
    orig_bullet = exp_entry.bullets[0]

    # Mock response containing an invented metric (+95%) and unauthorized skill ("Kubernetes")
    hallucinated_text = (
        "Optimicé un 95% el rendimiento del sistema orquestando contenedores en Kubernetes."
    )
    mock_hallucinated_response = {
        "summary": "Resumen alterado",
        "experience": [
            {
                "entry_id": exp_entry.entry_id,
                "bullets": [
                    {
                        "fact_ids": orig_bullet.fact_ids,
                        "text": hallucinated_text,
                        "skill_ids": ["kubernetes"],
                    }
                ],
            }
        ],
        "projects": [],
        "education": [],
    }

    monkeypatch.setattr(
        client, "parse_json_completion", lambda *args, **kwargs: mock_hallucinated_response
    )

    harmonized = engine.harmonize_resume(base_model, job_spec)
    # The hallucinated bullet must be rejected and reverted to the original bullet
    assert harmonized.experience[0].bullets[0].text == orig_bullet.text
    assert harmonized.experience[0].bullets[0].fact_ids == orig_bullet.fact_ids


def test_tailor_curation_excludes_secondary_and_irrelevant_jobs_deterministic() -> None:
    """Deterministic selection excludes secondary school with university and irrelevant jobs."""
    profile_data = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    # Add a secondary education entry
    profile_data["entries"].append(
        {
            "id": "edu_secundario_test",
            "kind": "education",
            "org": "Colegio Nacional (Secundario)",
            "start_date": "2016",
            "end_date": "2021",
            "position": 5,
            "archived": False,
            "default_selected": True,
            "archetypes": [],
            "titles": [
                {
                    "id": "title_sec_test",
                    "title": "Bachiller",
                    "approved": True,
                }
            ],
            "facts": [],
        }
    )
    # Add an irrelevant experience entry
    profile_data["entries"].append(
        {
            "id": "exp_retail_test",
            "kind": "experience",
            "org": "Retail Store",
            "start_date": "2020",
            "end_date": "2021",
            "position": 6,
            "archived": False,
            "default_selected": True,
            "archetypes": ["temporada"],
            "titles": [
                {
                    "id": "title_retail_test",
                    "title": "Cajero y Atención al Público",
                    "approved": True,
                }
            ],
            "facts": [],
        }
    )
    custom_profile = Profile.model_validate(profile_data)
    engine = TailorEngine(custom_profile, client=None)

    job_spec = JobSpec(
        role="Backend Developer",
        archetype="backend",
        keywords=["Python", "FastAPI", "PostgreSQL"],
    )

    tailored = engine.tailor(job_spec, use_llm=False)
    edu_ids = [e.entry_id for e in tailored.education]
    exp_ids = [e.entry_id for e in tailored.experience]

    assert "edu_secundario_test" not in edu_ids
    assert "exp_retail_test" not in exp_ids


def test_tailor_curation_with_llm_curator(monkeypatch: pytest.MonkeyPatch) -> None:
    """LLM curator directly dictates entries and facts, enforcing editorial relevance."""
    profile = Profile.from_json(PROFILE_PATH)
    client = LLMClient(LLMConfig(api_key="test-key", base_url="https://api.openai.com/v1"))
    engine = TailorEngine(profile, client=client)

    job_spec = JobSpec(
        role="Python Backend Developer",
        archetype="dev",
        keywords=["Python", "FastAPI"],
    )

    mock_curation = {
        "selected": [
            {
                "entry_id": "exp_simple_mdq",
                "fact_ids": ["fact_simple_arch", "fact_simple_endpoints"],
            },
            {"entry_id": "proj_turniate", "fact_ids": ["fact_turniate_saas"]},
            {"entry_id": "edu_unmdp", "fact_ids": []},
        ]
    }

    # Intercept parse_json_completion: return mock_curation on first call, fallback on subsequent
    calls = []

    def mock_json(*args, **kwargs):
        calls.append(args)
        if len(calls) == 1:
            return mock_curation
        return []

    monkeypatch.setattr(client, "parse_json_completion", mock_json)

    tailored = engine.tailor(job_spec, use_llm=True)
    exp_ids = [e.entry_id for e in tailored.experience]
    proj_ids = [e.entry_id for e in tailored.projects]
    edu_ids = [e.entry_id for e in tailored.education]

    assert exp_ids == ["exp_simple_mdq"]
    assert proj_ids == ["proj_turniate"]
    assert edu_ids == ["edu_unmdp"]

"""Tests for master profile API endpoints (Slice 6 & 7)."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.cli import main as cli_main
from back.engine.profile_store import seed_profile_if_missing

client = TestClient(app)


@pytest.fixture
def isolated_profile(tmp_path: Path, monkeypatch) -> Path:
    """Isolate profile storage into a temporary directory."""
    profile_file = tmp_path / "out" / "profile.json"
    monkeypatch.setenv("CVT_PROFILE_PATH", str(profile_file))
    return profile_file


def test_get_profile_empty_when_missing(isolated_profile: Path) -> None:
    assert not isolated_profile.exists()
    response = client.get("/api/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == ""
    assert data["entries"] == []
    assert data["skills"] == []
    assert not isolated_profile.exists()


def test_update_profile_success(isolated_profile: Path) -> None:
    seed_profile_if_missing(isolated_profile)
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    payload = get_res.json()

    # Modify some fields
    payload["full_name"] = "Juan Actualizado"
    payload["contact"]["location"] = "Mar del Plata, Argentina"
    payload["skills"].append(
        {
            "id": "skill_rust",
            "name": "Rust",
            "category": "Lenguajes",
            "aliases": ["rust", "rs"],
            "tags": ["systems"],
        }
    )

    put_res = client.put("/api/profile", json=payload)
    assert put_res.status_code == 200, put_res.text
    updated_data = put_res.json()
    assert updated_data["full_name"] == "Juan Actualizado"
    assert updated_data["contact"]["location"] == "Mar del Plata, Argentina"
    assert any(s["name"] == "Rust" for s in updated_data["skills"])

    # Verify persisted on disk and reflected in subsequent GET
    get_res_2 = client.get("/api/profile")
    assert get_res_2.status_code == 200
    assert get_res_2.json()["full_name"] == "Juan Actualizado"


def test_update_profile_validation_error(isolated_profile: Path) -> None:
    seed_profile_if_missing(isolated_profile)
    get_res = client.get("/api/profile")
    assert get_res.status_code == 200
    payload = get_res.json()

    # Extra forbid validation
    payload["invalid_extra_field"] = "bad"
    put_res = client.put("/api/profile", json=payload)
    assert put_res.status_code == 422


def test_render_and_tailor_use_active_profile(isolated_profile: Path) -> None:
    seed_profile_if_missing(isolated_profile)
    # 1. Update profile with custom distinctive name
    get_res = client.get("/api/profile")
    payload = get_res.json()
    payload["full_name"] = "Carlos Master Tester"
    client.put("/api/profile", json=payload)

    # 2. Preview endpoint without render_model should pick up the active profile
    preview_res = client.post("/api/render/preview", json={})
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["render_model"]["full_name"] == "Carlos Master Tester"

    # 3. Tailor endpoint without profile should pick up the active profile
    offer = "Buscamos desarrollador Full-Stack con experiencia en Python y TypeScript."
    tailor_res = client.post("/api/tailor", json={"offer_text": offer, "no_llm": True})
    assert tailor_res.status_code == 200
    tailor_data = tailor_res.json()
    assert tailor_data["render_model"]["full_name"] == "Carlos Master Tester"


def test_import_profile_txt_success(isolated_profile: Path) -> None:
    sample_cv = """Juan Perez
juan.perez@example.com | +54 9 223 555-0199 | Mar del Plata, Argentina
github.com/juanperez | linkedin.com/in/juanperez

RESUMEN
Desarrollador de software con experiencia en Python, FastAPI y React.

EXPERIENCIA
Tech Corp | 2022-01 - Presente
- Desarrolló APIs REST en FastAPI con tiempos de respuesta sub-50ms.
- Implementó pipelines de CI/CD en GitHub Actions.

HABILIDADES
Python, FastAPI, TypeScript, Docker, PostgreSQL
"""
    files = {"file": ("cv.txt", io.BytesIO(sample_cv.encode("utf-8")), "text/plain")}
    res = client.post("/api/profile/import", files=files)
    assert res.status_code == 200, res.text
    data = res.json()["profile"]
    assert data["full_name"] == "Juan Perez"
    assert data["contact"]["email"] == "juan.perez@example.com"
    assert len(data["entries"]) >= 1
    assert any(s["name"] == "Python" for s in data["skills"])
    # Not saved to disk yet
    assert not isolated_profile.exists()


def test_import_profile_merges_with_existing_profile_and_base_profile_form(
    isolated_profile: Path,
) -> None:
    seed_profile_if_missing(isolated_profile)
    existing_res = client.get("/api/profile")
    assert existing_res.status_code == 200
    existing_profile = existing_res.json()
    initial_entry_count = len(existing_profile["entries"])
    first_org = existing_profile["entries"][0]["org"]

    old_cv = f"""Juan Viejo
juan.viejo@oldmail.com | +54 9 223 000-0000 | Remoto

EXPERIENCIA
{first_org} | 2023-01 - Presente | Nuevo Rol Alternativo
- Logro histórico adicional rescatado de un CV viejo para el banco de hechos.

Empresa Histórica S.A. | 2019-03 - 2021-11 | Desarrollador Junior
- Implementación de módulos backend y automatización de reportes en Python.

HABILIDADES
Python, Kubernetes
"""
    files = {"file": ("cv_viejo.txt", io.BytesIO(old_cv.encode("utf-8")), "text/plain")}
    res = client.post("/api/profile/import", files=files)
    assert res.status_code == 200, res.text
    merged = res.json()["profile"]

    # Original name and entries are preserved
    assert merged["full_name"] == existing_profile["full_name"]
    assert len(merged["entries"]) == initial_entry_count + 1

    # Matching org gained the new role title variant and new fact
    matched_entry = next(e for e in merged["entries"] if e["org"] == first_org)
    titles = [t["title"] for t in matched_entry["titles"]]
    assert "Nuevo Rol Alternativo" in titles
    assert any("Logro histórico adicional" in f["text"] for f in matched_entry["facts"])

    # Also verify unsaved in-memory base_profile passed via FormData is respected
    existing_profile["full_name"] = "Juan Editado En Memoria"
    import json

    files_mem = {"file": ("cv_viejo.txt", io.BytesIO(old_cv.encode("utf-8")), "text/plain")}
    res_mem = client.post(
        "/api/profile/import",
        files=files_mem,
        data={"base_profile": json.dumps(existing_profile)},
    )
    assert res_mem.status_code == 200, res_mem.text
    assert res_mem.json()["profile"]["full_name"] == "Juan Editado En Memoria"


def test_import_profile_invalid_extension(isolated_profile: Path) -> None:
    files = {"file": ("cv.docx", io.BytesIO(b"dummy docx content"), "application/octet-stream")}
    res = client.post("/api/profile/import", files=files)
    assert res.status_code == 400
    assert "Formato de archivo no soportado" in res.json()["detail"]


def test_import_profile_empty_file(isolated_profile: Path) -> None:
    files = {"file": ("cv.txt", io.BytesIO(b""), "text/plain")}
    res = client.post("/api/profile/import", files=files)
    assert res.status_code == 400
    assert "vacío" in res.json()["detail"]


def test_cli_import_txt(tmp_path: Path) -> None:
    source_file = tmp_path / "resume.txt"
    source_file.write_text(
        """Ana Gomez
ana@example.com | +54 9 11 4444-1111 | Buenos Aires, Argentina

EXPERIENCIA
Innovatech | 2021-03 - 2023-12
- Lideró equipo de backend con Python y Django.
""",
        encoding="utf-8",
    )
    out_profile = tmp_path / "imported_profile.json"
    exit_code = cli_main(["import", str(source_file), "-o", str(out_profile), "--no-llm"])
    assert exit_code == 0
    assert out_profile.exists()
    assert "Ana Gomez" in out_profile.read_text(encoding="utf-8")


def test_enhance_profile_endpoint_deterministic(isolated_profile: Path, monkeypatch) -> None:
    # Ensure deterministic mode (no LLM keys)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)

    raw_profile = {
        "id": "default",
        "schema_version": "1.0.0",
        "full_name": "Juan Dev",
        "base_lang": "es",
        "contact": {
            "email": "juan@example.com",
            "phone": "+54 223 555",
            "location": "Argentina",
        },
        "skills": [
            {
                "id": "sk_py",
                "name": "Python",
                "category": "Lenguajes",
                "aliases": ["python"],
                "tags": ["dev"],
            }
        ],
        "entries": [
            {
                "id": "exp_1",
                "kind": "experience",
                "org": "Acme Systems",
                "start_date": "2024-01",
                "end_date": "present",
                "context": (
                    "Implementé colas de mensajería con Redis y Docker "
                    "mejorando el throughput un 40%."
                ),
                "titles": [
                    {
                        "id": "t_1",
                        "entry_id": "exp_1",
                        "title": "Programador",
                        "is_default": True,
                        "source": "user",
                        "approved": True,
                    }
                ],
                "facts": [
                    {
                        "id": "f_1",
                        "entry_id": "exp_1",
                        "text": (
                            "Desarrollé servicios web con FastAPI y PostgreSQL para 500 usuarios."
                        ),
                        "weight": 100,
                        "default_selected": True,
                        "source": "user",
                        "approved": True,
                    }
                ],
            }
        ],
    }

    res = client.post("/api/profile/enhance", json=raw_profile)
    assert res.status_code == 200, res.text
    payload = res.json()
    stats = payload["stats"]
    enhanced = payload["profile"]

    assert stats["distilled_facts"] >= 1
    assert stats["improved_facts"] >= 1
    assert stats["suggested_titles"] >= 1
    assert stats["detected_skills"] >= 2

    # Check detected skills have source="ai" and approved=False
    ai_skills = [s for s in enhanced["skills"] if not s["approved"]]
    ai_skill_names = {s["name"] for s in ai_skills}
    assert {"FastAPI", "PostgreSQL", "Redis", "Docker"}.issubset(ai_skill_names)
    assert all(s["source"] == "ai" for s in ai_skills)

    entry = enhanced["entries"][0]
    # Check suggested titles
    ai_titles = [t for t in entry["titles"] if not t["approved"]]
    assert len(ai_titles) >= 1
    assert all(t["source"] == "ai" for t in ai_titles)

    # Check distilled facts from context
    ai_facts = [f for f in entry["facts"] if not f["approved"]]
    assert len(ai_facts) >= 1
    assert any("Redis" in f["text"] and "40%" in f["text"] for f in ai_facts)
    assert all(f["source"] == "ai" for f in ai_facts)

    # Check existing fact kept original text and got proposed_text
    orig_fact = next(f for f in entry["facts"] if f["id"] == "f_1")
    assert orig_fact["approved"] is True
    assert orig_fact["text"].startswith("Desarrollé servicios web")
    assert orig_fact["proposed_text"] is not None
    assert orig_fact["proposed_text"].startswith("Desarrollo e implementación de")


def test_enhance_profile_anti_hallucination_blocks_invented_metrics() -> None:
    from back.engine.models import Profile
    from back.engine.profile_assistant import enhance_profile

    class DummyLLM:
        is_configured = True

        def parse_json_completion(self, messages, temperature=0.2):
            return {
                "detected_skills": [{"name": "FastAPI", "category": "Backend"}],
                "entries": [
                    {
                        "entry_id": "exp_1",
                        "distilled_facts": [
                            # Valid: uses 40% from context
                            (
                                "Optimización de caché con Redis reduciendo "
                                "tiempos de lectura en un 40%."
                            ),
                            # Invalid: invents 99.9% not in context
                            (
                                "Arquitectura de alta disponibilidad con un "
                                "99.9% de uptime en producción."
                            ),
                        ],
                        "improved_facts": [
                            {
                                "fact_id": "f_valid",
                                # Valid: preserves 500 from original fact
                                "proposed_text": (
                                    "Desarrollo de APIs en FastAPI soportando "
                                    "500 usuarios concurrentes."
                                ),
                            },
                            {
                                "fact_id": "f_hallucinated",
                                # Invalid: invents 10000 metric not in original fact
                                "proposed_text": (
                                    "Escalamiento de APIs en FastAPI para 10000 usuarios activos."
                                ),
                            },
                        ],
                        "suggested_titles": [
                            {"title": "Desarrollador Backend", "archetype": "backend"}
                        ],
                    }
                ],
            }

    profile = Profile.model_validate(
        {
            "full_name": "Juan Test",
            "contact": {"email": "a@b.com", "phone": "123", "location": "AR"},
            "skills": [],
            "entries": [
                {
                    "id": "exp_1",
                    "kind": "experience",
                    "org": "Acme",
                    "start_date": "2024-01",
                    "context": "Mejoré la caché con Redis logrando bajar tiempos en 40%.",
                    "titles": [{"id": "t1", "title": "Dev", "is_default": True}],
                    "facts": [
                        {
                            "id": "f_valid",
                            "text": "Hice APIs en FastAPI para 500 usuarios.",
                        },
                        {
                            "id": "f_hallucinated",
                            "text": "Mantuve endpoints internos en FastAPI.",
                        },
                    ],
                }
            ],
        }
    )

    result = enhance_profile(profile, llm=DummyLLM())  # type: ignore[arg-type]
    entry = result.profile.entries[0]

    # Only the valid distilled fact (40%) was accepted; 99.9% was blocked
    distilled = [f for f in entry.facts if not f.approved]
    assert len(distilled) == 1
    assert "40%" in distilled[0].text

    # f_valid got its proposed_text, f_hallucinated had its 10000 metric blocked
    f_val = next(f for f in entry.facts if f.id == "f_valid")
    f_hal = next(f for f in entry.facts if f.id == "f_hallucinated")
    assert f_val.proposed_text is not None
    assert "500" in f_val.proposed_text
    assert f_hal.proposed_text is None


def test_unapproved_items_excluded_from_render_model_and_tailor() -> None:
    from back.engine.models import JobSpec, Profile, RenderModel
    from back.engine.tailor import TailorEngine

    profile = Profile.model_validate(
        {
            "full_name": "Juan Seguro",
            "contact": {"email": "j@s.com", "phone": "123", "location": "AR"},
            "skills": [
                {"id": "sk_ok", "name": "Python", "category": "Lenguajes", "approved": True},
                {
                    "id": "sk_pending",
                    "name": "Rust",
                    "category": "Lenguajes",
                    "source": "ai",
                    "approved": False,
                },
            ],
            "entries": [
                {
                    "id": "exp_1",
                    "kind": "experience",
                    "org": "Core Corp",
                    "start_date": "2024-01",
                    "titles": [
                        {
                            "id": "t_ok",
                            "title": "Backend Dev",
                            "is_default": True,
                            "approved": True,
                        },
                        {
                            "id": "t_pending",
                            "title": "Principal Architect",
                            "archetype": "backend",
                            "source": "ai",
                            "approved": False,
                        },
                    ],
                    "facts": [
                        {
                            "id": "f_ok",
                            "text": "Desarrollo de servicios en Python.",
                            "default_selected": True,
                            "approved": True,
                            "proposed_text": "Propuesta IA aún no aprobada en Python.",
                        },
                        {
                            "id": "f_pending",
                            "text": "Hecho destilado por IA aún no aprobado.",
                            "default_selected": True,
                            "source": "ai",
                            "approved": False,
                        },
                    ],
                }
            ],
        }
    )

    rm = RenderModel.from_profile(profile, include_all=True)
    rendered_skill_ids = [sid for g in rm.skills for sid in g.skill_ids]
    assert "sk_ok" in rendered_skill_ids
    assert "sk_pending" not in rendered_skill_ids

    exp = rm.experience[0]
    assert exp.title == "Backend Dev"
    bullet_texts = [b.text for b in exp.bullets]
    assert bullet_texts == ["Desarrollo de servicios en Python."]

    # Also verify TailorEngine ignores unapproved items
    engine = TailorEngine(profile)
    job = JobSpec(role="Backend Engineer", archetype="backend", keywords=["python", "rust"])
    tailored = engine.tailor(job, use_llm=False)
    t_skills = [sid for g in tailored.skills for sid in g.skill_ids]
    assert "sk_pending" not in t_skills
    assert tailored.experience[0].title == "Backend Dev"
    assert [b.text for b in tailored.experience[0].bullets] == [
        "Desarrollo de servicios en Python."
    ]


def test_upsert_bullet_fact_updates_existing_and_creates_new(isolated_profile: Path) -> None:
    seed_profile_if_missing(isolated_profile)
    current_profile = client.get("/api/profile").json()
    first_entry = current_profile["entries"][0]
    entry_id = first_entry["id"]
    first_fact_id = first_entry["facts"][0]["id"] if first_entry["facts"] else None

    # 1. Update existing fact
    if first_fact_id:
        update_res = client.post(
            "/api/profile/facts/upsert",
            json={
                "entry_id": entry_id,
                "fact_id": first_fact_id,
                "text": "Texto editado desde el CV y sincronizado al perfil maestro.",
            },
        )
        assert update_res.status_code == 200, update_res.text
        data = update_res.json()
        assert data["created"] is False
        assert data["fact"]["id"] == first_fact_id
        assert data["fact"]["text"] == "Texto editado desde el CV y sincronizado al perfil maestro."
        assert data["fact"]["approved"] is True
        assert data["fact"]["source"] == "user"

    # 2. Create new fact when fact_id is None
    create_res = client.post(
        "/api/profile/facts/upsert",
        json={
            "entry_id": entry_id,
            "fact_id": None,
            "text": "Nuevo logro añadido desde el editor de CV.",
            "skill_ids": ["python"],
        },
    )
    assert create_res.status_code == 200, create_res.text
    new_data = create_res.json()
    assert new_data["created"] is True
    assert new_data["fact"]["text"] == "Nuevo logro añadido desde el editor de CV."
    assert new_data["fact"]["approved"] is True
    assert new_data["fact"]["skill_ids"] == ["python"]

    # Verify persistence
    persisted = client.get("/api/profile").json()
    entry = next(e for e in persisted["entries"] if e["id"] == entry_id)
    assert any(f["id"] == new_data["fact"]["id"] for f in entry["facts"])

    # 3. Invalid entry_id returns 404
    bad_res = client.post(
        "/api/profile/facts/upsert",
        json={
            "entry_id": "non_existent_entry_999",
            "text": "Texto cualquiera",
        },
    )
    assert bad_res.status_code == 404

    # 4. Empty text returns 422
    empty_res = client.post(
        "/api/profile/facts/upsert",
        json={
            "entry_id": entry_id,
            "text": "   ",
        },
    )
    assert empty_res.status_code == 422


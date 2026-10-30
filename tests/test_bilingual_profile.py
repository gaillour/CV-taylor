"""Tests for bilingual profile mirroring, deduplication, and English tailoring."""

from __future__ import annotations

from back.engine.models import ContactInfo, Entry, EntryTitle, Fact, JobSpec, Profile, Skill
from back.engine.profile_assistant import (
    clean_and_deduplicate_profile,
    enhance_profile,
    mirror_bilingual_fields,
)
from back.engine.tailor import TailorEngine


def test_clean_and_deduplicate_skills_and_facts() -> None:
    profile = Profile(
        full_name="Juan Perez",
        contact=ContactInfo(email="juan@example.com", phone="+54 9 11 1234", location="Mar del Plata"),
        default_lang="es",
        skills=[
            Skill(id="s1", name="postgres", category="Datos & DB", aliases=[], tags=[]),
            Skill(id="s2", name="PostgreSQL", category="Datos & DB", aliases=[], tags=[]),
            Skill(id="s3", name="react.js", category="Frontend", aliases=[], tags=[]),
        ],
        entries=[
            Entry(
                id="exp_1",
                kind="experience",
                org="Tech Corp",
                start_date="2022-01",
                titles=[EntryTitle(id="t1", title="Desarrollador Backend", lang="es")],
                facts=[
                    Fact(id="f1", text="Desarrollo de microservicios con FastAPI y PostgreSQL.", lang="es"),
                    Fact(id="f2", text="desarrollo de microservicios con fastapi y postgresql.", lang="es"),  # duplicate
                    Fact(id="f3", text="Optimización de latencia en 30% para 10k rps.", lang="es"),
                ],
            )
        ],
    )

    cleaned = clean_and_deduplicate_profile(profile)

    # Verify skills deduplication and canonical names
    skill_names = [s.name for s in cleaned.skills]
    assert "PostgreSQL" in skill_names
    assert "React" in skill_names
    assert skill_names.count("PostgreSQL") == 1
    assert len(cleaned.skills) == 2

    # Verify facts deduplication inside entry
    entry = cleaned.entries[0]
    assert len(entry.facts) == 2
    assert entry.facts[0].id == "f1"
    assert entry.facts[1].id == "f3"


def test_mirror_bilingual_fields_deterministic() -> None:
    profile = Profile(
        full_name="Juan Perez",
        contact=ContactInfo(email="juan@example.com", phone="+54 9 11 1234", location="Mar del Plata"),
        default_lang="es",
        summary="Desarrollador de software especializado en backend.",
        skills=[Skill(id="s1", name="Python", category="Lenguajes", aliases=[], tags=[])],
        entries=[
            Entry(
                id="exp_1",
                kind="experience",
                org="Acme Inc",
                start_date="2022-01",
                titles=[EntryTitle(id="t1", title="Desarrollador Backend", lang="es", is_default=True)],
                facts=[
                    Fact(
                        id="f1",
                        text="Desarrollo de API con FastAPI reduciendo latencia en 25%.",
                        text_en="Developed API using FastAPI reducing latency by 25%.",
                        lang="es",
                    ),
                    Fact(
                        id="f2",
                        text="Implementación de CI/CD con GitHub Actions.",
                        lang="es",
                    ),
                ],
            )
        ],
    )

    mirrored = mirror_bilingual_fields(profile, llm=None)

    # Entry must have an English title
    entry = mirrored.entries[0]
    en_titles = [t for t in entry.titles if t.lang == "en"]
    assert len(en_titles) >= 1
    assert en_titles[0].title == "Backend Developer"

    # Facts must have text_en populated
    assert entry.facts[0].get_text("en") == "Developed API using FastAPI reducing latency by 25%."
    assert entry.facts[1].get_text("en") == "Implementación de CI/CD con GitHub Actions."


def test_tailor_uses_english_titles_and_facts_for_english_offer() -> None:
    profile = Profile(
        full_name="Juan Perez",
        contact=ContactInfo(email="juan@example.com", phone="+54 9 11 1234", location="Mar del Plata"),
        default_lang="es",
        summary="Desarrollador backend enfocado en alto rendimiento.",
        summary_en="Backend developer focused on high performance systems.",
        skills=[
            Skill(id="s1", name="Python", category="Lenguajes", aliases=[], tags=[]),
            Skill(id="s2", name="FastAPI", category="Backend", aliases=[], tags=[]),
        ],
        entries=[
            Entry(
                id="exp_1",
                kind="experience",
                org="Acme Inc",
                start_date="2022-01",
                titles=[
                    EntryTitle(id="t1", title="Desarrollador Backend", lang="es", is_default=True),
                    EntryTitle(id="t2", title="Backend Developer", lang="en", is_default=False),
                ],
                facts=[
                    Fact(
                        id="f1",
                        text="Desarrollo de endpoints REST en FastAPI.",
                        text_en="Development of REST endpoints using FastAPI.",
                        lang="es",
                    )
                ],
            )
        ],
    )

    engine = TailorEngine(profile)
    job_spec = JobSpec(
        role="Backend Developer",
        keywords=["python", "fastapi"],
        lang="en",
    )

    model = engine.tailor(
        job_spec,
        theme="classic",
        lang="en",
        use_llm=False,
    )

    assert model.lang == "en"
    assert model.summary == "Backend developer focused on high performance systems."
    assert model.experience[0].title == "Backend Developer"
    assert model.experience[0].bullets[0].text == "Development of REST endpoints using FastAPI."

"""Tests for monolingual Profile SSOT, incremental mirror derivation, and base_lang swapping."""

from __future__ import annotations

from back.engine.mirror import (
    build_mirror,
    is_mirror_fresh,
    swap_base,
    validate_translation,
)
from back.engine.models import (
    ContactInfo,
    Entry,
    EntryTitle,
    Fact,
    JobSpec,
    LangCode,
    Profile,
    Skill,
    upcast_legacy_profile,
)
from back.engine.profile_assistant import clean_and_deduplicate_profile
from back.engine.tailor import TailorEngine


class FakeTranslator:
    """Deterministic test translator that prefixes translated strings and counts calls."""

    def __init__(self) -> None:
        self.calls: list[tuple[list[str], LangCode, LangCode]] = []

    def translate_batch(self, texts: list[str], src: LangCode, dst: LangCode) -> list[str]:
        self.calls.append((list(texts), src, dst))
        return [f"[{dst.upper()}] {t}" for t in texts]


def _sample_es_profile() -> Profile:
    return Profile(
        full_name="Juan Perez",
        contact=ContactInfo(
            email="juan@example.com",
            phone="+54 9 11 1234",
            location="Mar del Plata",
        ),
        base_lang="es",
        summary="Desarrollador de software enfocado en sistemas backend de baja latencia.",
        skills=[
            Skill(
                id="s1", name="Python", category="Lenguajes", level="Avanzado"
            ),
            Skill(
                id="s2", name="FastAPI", category="Frameworks", level="Intermedio"
            ),
        ],
        entries=[
            Entry(
                id="exp_1",
                kind="experience",
                org="Acme Inc",
                location="Remoto",
                start_date="2022-01",
                titles=[EntryTitle(id="t1", title="Desarrollador Backend", is_default=True)],
                facts=[
                    Fact(
                        id="f1",
                        text="Desarrollo de API con FastAPI reduciendo latencia en 25%.",
                    ),
                    Fact(
                        id="f2",
                        text="Implementación de CI/CD con GitHub Actions para 10 microservicios.",
                    ),
                ],
            )
        ],
    )


def test_clean_and_deduplicate_skills_and_facts() -> None:
    profile = Profile(
        full_name="Juan Perez",
        contact=ContactInfo(
            email="juan@example.com", phone="+54 9 11 1234", location="Mar del Plata"
        ),
        base_lang="es",
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
                titles=[EntryTitle(id="t1", title="Desarrollador Backend")],
                facts=[
                    Fact(id="f1", text="Desarrollo de microservicios con FastAPI y PostgreSQL."),
                    Fact(id="f2", text="desarrollo de microservicios con fastapi y postgresql."),
                    Fact(id="f3", text="Optimización de latencia en 30% para 10k rps."),
                ],
            )
        ],
    )

    cleaned = clean_and_deduplicate_profile(profile)

    skill_names = [s.name for s in cleaned.skills]
    assert "PostgreSQL" in skill_names
    assert "React" in skill_names
    assert skill_names.count("PostgreSQL") == 1
    assert len(cleaned.skills) == 2

    entry = cleaned.entries[0]
    assert len(entry.facts) == 2
    assert entry.facts[0].id == "f1"
    assert entry.facts[1].id == "f3"


def test_build_mirror_translates_only_dirty_fields_and_applies_glossary() -> None:
    base = _sample_es_profile()
    translator = FakeTranslator()

    # 1. Initial mirror build
    mirror_doc, failed = build_mirror(base, previous=None, translator=translator)
    assert failed == []
    assert len(translator.calls) == 1
    assert mirror_doc.profile.base_lang == "en"
    assert is_mirror_fresh(base, mirror_doc)

    # Glossary translated categories and levels deterministically without sending to LLM
    assert mirror_doc.profile.skills[0].category == "Languages"
    assert mirror_doc.profile.skills[0].level == "Advanced"
    assert mirror_doc.profile.skills[1].level == "Intermediate"

    # Free-text fields went through FakeTranslator
    assert mirror_doc.profile.summary == f"[EN] {base.summary}"
    assert mirror_doc.profile.entries[0].titles[0].title == "[EN] Desarrollador Backend"
    assert mirror_doc.profile.entries[0].facts[0].text.startswith("[EN] Desarrollo de API")

    # 2. Second build with no changes -> 0 translator calls
    mirror_doc_2, failed_2 = build_mirror(base, previous=mirror_doc, translator=translator)
    assert failed_2 == []
    assert len(translator.calls) == 1  # No additional call!
    assert mirror_doc_2.profile == mirror_doc.profile

    # 3. Mutate a single fact -> only that fact is sent to translator
    base_edited = base.model_copy(deep=True)
    base_edited.entries[0].facts[1].text = " Despliegue de cluster Kubernetes con 99.9% uptime."
    mirror_doc_3, failed_3 = build_mirror(base_edited, previous=mirror_doc_2, translator=translator)
    assert failed_3 == []
    assert len(translator.calls) == 2
    sent_texts, src, dst = translator.calls[1]
    assert src == "es" and dst == "en"
    assert sent_texts == [" Despliegue de cluster Kubernetes con 99.9% uptime."]
    assert (
        mirror_doc_3.profile.entries[0].facts[0].text
        == mirror_doc.profile.entries[0].facts[0].text
    )
    assert mirror_doc_3.profile.entries[0].facts[1].text.startswith("[EN]")


def test_swap_base_is_involutive_and_preserves_ids() -> None:
    base = _sample_es_profile()
    translator = FakeTranslator()
    mirror_doc, _ = build_mirror(base, previous=None, translator=translator)

    # Swap ES -> EN as new base
    en_base, es_mirror = swap_base(base, mirror_doc)
    assert en_base.base_lang == "en"
    assert es_mirror.profile.base_lang == "es"
    assert is_mirror_fresh(en_base, es_mirror)
    assert [e.id for e in en_base.entries] == [e.id for e in base.entries]
    assert [f.id for f in en_base.entries[0].facts] == [f.id for f in base.entries[0].facts]

    # Swap back EN -> ES
    roundtrip_base, roundtrip_mirror = swap_base(en_base, es_mirror)
    assert roundtrip_base == base
    assert roundtrip_mirror.profile == mirror_doc.profile


def test_validate_translation_checks_numbers() -> None:
    assert validate_translation(
        "Reducción de latencia en 25% para 10k usuarios.",
        "Reduced latency by 25% for 10k users.",
    )
    assert not validate_translation(
        "Reducción de latencia en 25%.",
        "Reduced latency by 40%.",
    )


def test_upcast_legacy_profile_strips_v1_bilingual_fields() -> None:
    legacy = {
        "schema_version": "1.0.0",
        "full_name": "Juan Perez",
        "default_lang": "es",
        "summary": "Resumen ES",
        "summary_en": "Summary EN",
        "contact": {"email": "a@b.com", "phone": "123", "location": "MDQ"},
        "skills": [
            {
                "id": "s1",
                "name": "Python",
                "category": "Lenguajes",
                "category_en": "Languages",
                "level": "Avanzado",
                "level_en": "Advanced",
            }
        ],
        "entries": [
            {
                "id": "e1",
                "kind": "experience",
                "org": "Acme",
                "location": "Remoto",
                "location_en": "Remote",
                "start_date": "2023-01",
                "titles": [
                    {"id": "t_es", "title": "Desarrollador", "lang": "es", "is_default": True},
                    {"id": "t_en", "title": "Developer", "lang": "en", "is_default": False},
                ],
                "facts": [
                    {
                        "id": "f1",
                        "text": "Logro en español.",
                        "text_en": "Achievement in English.",
                        "lang": "es",
                    }
                ],
            }
        ],
    }

    upcasted = upcast_legacy_profile(legacy)
    prof = Profile.model_validate(upcasted)
    assert prof.base_lang == "es"
    assert prof.schema_version == "2.0.0"
    assert len(prof.entries[0].titles) == 1
    assert prof.entries[0].titles[0].id == "t_es"
    assert prof.entries[0].facts[0].text == "Logro en español."


def test_tailor_uses_mirror_profile_for_other_language() -> None:
    base = _sample_es_profile()
    translator = FakeTranslator()
    mirror_doc, _ = build_mirror(base, previous=None, translator=translator)

    engine = TailorEngine(mirror_doc.profile)
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
    assert model.summary == mirror_doc.profile.summary
    assert model.experience[0].title == "[EN] Desarrollador Backend"
    assert model.experience[0].bullets[0].text.startswith("[EN] Desarrollo de API")

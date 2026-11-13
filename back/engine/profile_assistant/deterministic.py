"""Deterministic heuristic enrichers, title suggestions, and context distillers."""

from __future__ import annotations

import re

from back.engine.extractor import COMMON_TECH_KEYWORDS
from back.engine.models import Entry, EntryTitle, Fact, LangCode, Profile, Skill
from back.engine.profile_assistant.taxonomies import (
    FIRST_PERSON_REWRITES_EN,
    FIRST_PERSON_REWRITES_ES,
    FORBIDDEN_PROJECT_TITLE_PATTERN,
    SKILL_CATEGORY_MAP,
    _known_skill_tokens,
    _normalize_skill_token,
    _short_id,
)


def _detect_missing_skills_deterministic(profile: Profile) -> list[Skill]:
    """Scan all entry contexts, titles, and facts for canonical skills absent from profile."""
    known = _known_skill_tokens(profile.skills)
    corpus_parts: list[str] = [profile.summary or ""]
    for entry in profile.entries:
        corpus_parts.append(entry.org)
        corpus_parts.append(entry.context)
        for t in entry.titles:
            corpus_parts.append(t.title)
        for f in entry.facts:
            corpus_parts.append(f.text)

    corpus = "\n".join(corpus_parts)
    new_skills: list[Skill] = []

    for kw in COMMON_TECH_KEYWORDS:
        norm_kw = _normalize_skill_token(kw)
        if norm_kw in known:
            continue
        pattern = re.compile(rf"(?<!\w){re.escape(kw)}(?!\w)", re.IGNORECASE)
        if pattern.search(corpus):
            known.add(norm_kw)
            cat_es, cat_en = SKILL_CATEGORY_MAP.get(kw.lower(), ("Herramientas", "Tools"))
            new_skills.append(
                Skill(
                    id=_short_id("skill_ai"),
                    name=kw,
                    category=cat_en if profile.base_lang == "en" else cat_es,
                    aliases=[kw.lower()],
                    tags=["dev"],
                    source="ai",
                    approved=False,
                    approved_at=None,
                )
            )
    return new_skills


def _polish_fact_deterministic(text: str, lang: LangCode) -> str | None:
    """Apply nominal/action-style improvements deterministically without inventing data."""
    candidate = text.strip()
    if not candidate:
        return None

    rewrites = FIRST_PERSON_REWRITES_EN if lang == "en" else FIRST_PERSON_REWRITES_ES
    changed = False
    for pattern, replacement in rewrites:
        if pattern.search(candidate):
            candidate = pattern.sub(replacement, candidate, count=1)
            changed = True
            break

    if candidate and candidate[0].islower():
        candidate = candidate[0].upper() + candidate[1:]
        changed = True

    if not candidate.endswith("."):
        candidate = candidate + "."
        changed = True

    if changed and candidate != text.strip():
        return candidate
    return None


def _distill_context_deterministic(entry: Entry, lang: LangCode) -> list[Fact]:
    """Deterministically split entry.context into atomic candidate facts if not present."""
    raw_ctx = (entry.context or "").strip()
    if not raw_ctx:
        return []

    existing_lows = {f.text.lower().strip().rstrip(".") for f in entry.facts}
    chunks = re.split(r"(?:\r?\n)+|(?:[•\-*]\s+)|(?<=[.!?])\s+", raw_ctx)
    distilled: list[Fact] = []
    next_pos = max((f.position for f in entry.facts), default=-1) + 1

    for chunk in chunks:
        cleaned = chunk.strip().strip("-•*").strip()
        if len(cleaned) < 18:
            continue
        if not cleaned.endswith("."):
            cleaned += "."
        polished = _polish_fact_deterministic(cleaned, lang) or cleaned
        norm = polished.lower().rstrip(".")
        if norm in existing_lows:
            continue
        existing_lows.add(norm)
        distilled.append(
            Fact(
                id=_short_id("fact_ai"),
                entry_id=entry.id,
                text=polished,
                tags=list(entry.archetypes) or ["dev"],
                skill_ids=[],
                position=next_pos,
                weight=100,
                default_selected=True,
                source="ai",
                approved=False,
                approved_at=None,
            )
        )
        next_pos += 1

    return distilled


def _is_forbidden_project_title(title: str) -> bool:
    """Check if title contains employment/job title terms prohibited for projects."""
    return bool(FORBIDDEN_PROJECT_TITLE_PATTERN.search(title))


def _suggest_titles_for_experience(
    entry: Entry,
    lang: LangCode,
    corpus: str,
    existing_titles: set[str],
    existing_archetypes: set[str],
) -> list[EntryTitle]:
    backend_kws = ["fastapi", "python", "sql", "postgresql", "api", "backend", "docker"]
    frontend_kws = ["react", "next.js", "typescript", "frontend", "tailwind", "ui"]

    candidates: list[tuple[str, str]] = []
    if lang == "en":
        if any(k in corpus for k in backend_kws):
            candidates.append(("Backend Software Developer", "backend"))
        if any(k in corpus for k in frontend_kws):
            candidates.append(("Frontend Developer", "frontend"))
        if len(candidates) >= 2 or "fullstack" in corpus or "full stack" in corpus:
            candidates.insert(0, ("Full Stack Developer", "fullstack"))
        if not candidates:
            candidates.append(("Software Engineer", "dev"))
    else:
        if any(k in corpus for k in backend_kws):
            candidates.append(("Desarrollador Backend", "backend"))
        if any(k in corpus for k in frontend_kws):
            candidates.append(("Desarrollador Frontend", "frontend"))
        if len(candidates) >= 2 or "fullstack" in corpus or "full stack" in corpus:
            candidates.insert(0, ("Desarrollador Full Stack", "fullstack"))
        if not candidates:
            candidates.append(("Desarrollador de Software", "dev"))

    suggested: list[EntryTitle] = []
    for title_str, arch in candidates:
        if title_str.lower() in existing_titles or arch in existing_archetypes:
            continue
        existing_titles.add(title_str.lower())
        existing_archetypes.add(arch)
        suggested.append(
            EntryTitle(
                id=_short_id("title_ai"),
                entry_id=entry.id,
                title=title_str,
                archetype=arch,
                is_default=False,
                source="ai",
                approved=False,
                approved_at=None,
            )
        )
        if len(suggested) >= 2:
            break

    return suggested


def _suggest_titles_for_project(
    entry: Entry,
    lang: LangCode,
    corpus: str,
    existing_titles: set[str],
    existing_archetypes: set[str],
) -> list[EntryTitle]:
    backend_kws = [
        "fastapi",
        "python",
        "sql",
        "postgresql",
        "api",
        "backend",
        "docker",
        "rest",
        "graphql",
        "server",
        "microservice",
        "microservicios",
        "redis",
    ]
    frontend_kws = [
        "react",
        "next.js",
        "typescript",
        "frontend",
        "tailwind",
        "ui",
        "css",
        "vue",
        "web",
        "html",
        "svelte",
    ]
    cli_kws = ["cli", "terminal", "command-line", "command line", "tui", "consola"]
    data_kws = [
        "pipeline",
        "etl",
        "analytics",
        "análisis",
        "datos",
        "data",
        "machine learning",
        "ml",
        "scraper",
        "scraping",
        "pandas",
        "numpy",
    ]
    engine_kws = [
        "engine",
        "motor",
        "simulad",
        "physics",
        "física",
        "físicas",
        "rendering",
        "graphics",
        "game",
        "juego",
        "compilador",
        "compiler",
        "parser",
        "emulador",
        "emulator",
    ]

    has_backend = any(k in corpus for k in backend_kws)
    has_frontend = any(k in corpus for k in frontend_kws)
    has_cli = any(k in corpus for k in cli_kws)
    has_data = any(k in corpus for k in data_kws)
    has_engine = any(k in corpus for k in engine_kws)

    candidates: list[tuple[str, str]] = []
    if lang == "en":
        if has_engine:
            candidates.append(("Simulation Engine & Core System", "dev"))
        if has_cli:
            candidates.append(("Command Line Interface Tool", "tools"))
        if has_data:
            candidates.append(("Data Processing Pipeline", "data"))
        if has_backend and has_frontend:
            candidates.append(("Full Stack Web Application", "fullstack"))
        elif has_backend:
            candidates.append(("REST API & Backend Service", "backend"))
        elif has_frontend:
            candidates.append(("Interactive Web Application", "frontend"))
        if not candidates:
            candidates.append(("Software System & Architecture", "dev"))
    else:
        if has_engine:
            candidates.append(("Motor de Simulación y Sistema Core", "dev"))
        if has_cli:
            candidates.append(("Herramienta de Línea de Comandos (CLI)", "tools"))
        if has_data:
            candidates.append(("Pipeline de Procesamiento de Datos", "data"))
        if has_backend and has_frontend:
            candidates.append(("Aplicación Web Full Stack", "fullstack"))
        elif has_backend:
            candidates.append(("API REST y Servicio Backend", "backend"))
        elif has_frontend:
            candidates.append(("Aplicación Web Interactiva", "frontend"))
        if not candidates:
            candidates.append(("Sistema de Software y Arquitectura", "dev"))

    suggested: list[EntryTitle] = []
    for title_str, arch in candidates:
        if _is_forbidden_project_title(title_str):
            continue
        if title_str.lower() in existing_titles or arch in existing_archetypes:
            continue
        existing_titles.add(title_str.lower())
        existing_archetypes.add(arch)
        suggested.append(
            EntryTitle(
                id=_short_id("title_ai"),
                entry_id=entry.id,
                title=title_str,
                archetype=arch,
                is_default=False,
                source="ai",
                approved=False,
                approved_at=None,
            )
        )
        if len(suggested) >= 2:
            break

    return suggested


def _suggest_titles_deterministic(entry: Entry, lang: LangCode) -> list[EntryTitle]:
    """Suggest archetype-aligned title variants for experience or project entries."""
    if entry.kind not in {"experience", "project"}:
        return []

    existing_titles = {t.title.lower().strip() for t in entry.titles}
    existing_archetypes = {t.archetype.lower().strip() for t in entry.titles if t.archetype}
    corpus = " ".join([entry.org, entry.context] + [f.text for f in entry.facts]).lower()

    if entry.kind == "project":
        return _suggest_titles_for_project(entry, lang, corpus, existing_titles, existing_archetypes)
    return _suggest_titles_for_experience(entry, lang, corpus, existing_titles, existing_archetypes)

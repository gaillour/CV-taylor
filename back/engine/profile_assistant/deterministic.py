"""Deterministic heuristic enrichers, title suggestions, and context distillers."""

from __future__ import annotations

import re
from typing import Literal

from back.engine.extractor import COMMON_TECH_KEYWORDS
from back.engine.models import (
    DatePrecision,
    Entry,
    EntryTitle,
    Fact,
    LangCode,
    Profile,
    Skill,
    _format_iso_date,
)
from back.engine.profile_assistant.taxonomies import (
    CANONICAL_SKILL_MAP,
    FIRST_PERSON_REWRITES_EN,
    FIRST_PERSON_REWRITES_ES,
    FORBIDDEN_PROJECT_TITLE_PATTERN,
    SKILL_CATEGORY_MAP,
    _known_skill_tokens,
    _normalize_skill_token,
    _short_id,
)

ContactLinkKind = Literal["github", "linkedin", "website"]

_INVALID_LINK_PLACEHOLDERS = {
    "null",
    "none",
    "n/a",
    "na",
    "-",
    "undefined",
    "false",
    "placeholder",
    "tu-usuario",
    "username",
    "handle",
    "user",
    "<username>",
    "<handle>",
    "sin web",
    "no tiene",
}

PROJECT_ROLE_TITLE_PATTERN = re.compile(
    r"^(?:"
    r"desarrolladora?|developer|software\s+developer|software\s+engineer|"
    r"backend|frontend|full\s*-?\s*stack|ingeniera?|engineer|pasante|intern|"
    r"analista|analyst|arquitecta?|architect|tech\s+lead|l[ií]der|lead|"
    r"creadora?|creator|autora?|author|programadora?|programmer|"
    r"consultora?|consultant|data\s+scientist|devops"
    r")(?:\b|\s)",
    re.IGNORECASE,
)

_GENERIC_PROJECT_ORGS = {"institución", "institucion", "proyecto", "project"}


def normalize_contact_link(val: str | None, kind: ContactLinkKind) -> str | None:
    """Normalize github, linkedin, and website/project links deterministically."""
    if val is None:
        return None
    raw = str(val).strip()
    if not raw:
        return None
    if (
        raw.lower() in _INVALID_LINK_PLACEHOLDERS
        or "<" in raw
        or ">" in raw
        or " " in raw
    ):
        return None

    cleaned = re.sub(r"^(?:https?://)+", "", raw, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^www\.", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = cleaned.rstrip("/").strip()
    if not cleaned or cleaned.lower() in _INVALID_LINK_PLACEHOLDERS:
        return None

    if kind == "github":
        if cleaned.lower().startswith("github.com"):
            rest = cleaned[len("github.com") :].strip("/")
            if not rest or rest.lower() in _INVALID_LINK_PLACEHOLDERS:
                return None
            return f"github.com/{rest}"
        handle = cleaned.lstrip("@").strip("/")
        if not handle or handle.lower() in _INVALID_LINK_PLACEHOLDERS:
            return None
        return f"github.com/{handle}"

    if kind == "linkedin":
        if cleaned.lower().startswith("linkedin.com"):
            rest = cleaned[len("linkedin.com") :].strip("/")
            if not rest or rest.lower() in _INVALID_LINK_PLACEHOLDERS:
                return None
            if re.match(r"^(?:in|company|pub|school)/", rest, flags=re.IGNORECASE):
                parts = rest.split("/", 1)
                prefix = parts[0].lower()
                tail = parts[1].strip("/") if len(parts) > 1 else ""
                if not tail or tail.lower() in _INVALID_LINK_PLACEHOLDERS:
                    return None
                return f"linkedin.com/{prefix}/{tail}"
            return f"linkedin.com/in/{rest}"
        handle = cleaned.lstrip("@").strip("/")
        if not handle or handle.lower() in _INVALID_LINK_PLACEHOLDERS:
            return None
        if re.match(r"^(?:in|company|pub|school)/", handle, flags=re.IGNORECASE):
            parts = handle.split("/", 1)
            prefix = parts[0].lower()
            tail = parts[1].strip("/") if len(parts) > 1 else ""
            if not tail or tail.lower() in _INVALID_LINK_PLACEHOLDERS:
                return None
            return f"linkedin.com/{prefix}/{tail}"
        return f"linkedin.com/in/{handle}"

    if "." not in cleaned and not cleaned.lower().startswith("localhost"):
        return None
    return cleaned


def normalize_entry_dates(
    start_date: str,
    end_date: str | None,
    date_precision: DatePrecision,
) -> tuple[str, str | None]:
    """Set end_date to None if equal to start_date raw or formatted."""
    s_clean = (start_date or "").strip()
    if not end_date or not str(end_date).strip():
        return s_clean, None
    e_clean = str(end_date).strip()
    if e_clean.lower() in {"presente", "present", "actual", "current", "hoy", "now"}:
        return s_clean, e_clean
    if e_clean == s_clean or _format_iso_date(s_clean, date_precision) == _format_iso_date(
        e_clean, date_precision
    ):
        return s_clean, None
    return s_clean, e_clean


def is_role_like_project_title(title: str) -> bool:
    """Return True when a project title matches a job/role pattern without a system name."""
    cleaned = (title or "").strip()
    if not cleaned:
        return False
    if re.search(r"[:|—–]", cleaned):
        return False
    return bool(PROJECT_ROLE_TITLE_PATTERN.search(cleaned))


def normalize_project_title_org_role(
    title: str,
    org: str | None,
    role: str | None,
) -> tuple[str, str, str | None]:
    """Ensure project title holds the project name while role/org hold role and organization."""
    t_clean = (title or "").strip()
    o_clean = (org or "").strip()
    r_clean = (role or "").strip() or None

    if o_clean and o_clean.lower() == t_clean.lower():
        o_clean = ""
    elif (
        is_role_like_project_title(t_clean)
        and o_clean
        and o_clean.lower() not in _GENERIC_PROJECT_ORGS
    ):
        if not r_clean:
            r_clean = t_clean
        t_clean = o_clean
        o_clean = ""

    return t_clean, o_clean, r_clean


def split_paragraph_into_bullets(text: str) -> list[str]:
    """Split descriptive paragraph or multi-sentence text into atomic bullet strings."""
    raw = (text or "").strip()
    if not raw:
        return []
    parts = re.split(r"(?:\r?\n)+|(?:\s*;\s+)|(?:\s+[•\-*]\s+)|(?<=[.!?])\s+", raw)
    bullets: list[str] = []
    for part in parts:
        cleaned = re.sub(r"^[-•*\d.)]+\s*", "", part.strip()).strip()
        if len(cleaned) < 4:
            continue
        if cleaned[0].islower():
            cleaned = cleaned[0].upper() + cleaned[1:]
        if cleaned[-1] not in ".!?":
            cleaned += "."
        bullets.append(cleaned)
    return bullets


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
        return _suggest_titles_for_project(
            entry, lang, corpus, existing_titles, existing_archetypes
        )
    return _suggest_titles_for_experience(entry, lang, corpus, existing_titles, existing_archetypes)



def clean_and_deduplicate_profile(profile: Profile) -> Profile:
    """Normalize links, dates, project titles, canonical skills, and deduplicate facts."""
    profile.contact.github = normalize_contact_link(profile.contact.github, "github")
    profile.contact.linkedin = normalize_contact_link(profile.contact.linkedin, "linkedin")
    profile.contact.website = normalize_contact_link(profile.contact.website, "website")

    canonical_skills: dict[str, Skill] = {}
    for skill in profile.skills:
        norm_name = skill.name.strip().lower()
        canon_name = CANONICAL_SKILL_MAP.get(norm_name, skill.name.strip())
        key = canon_name.lower().replace(" ", "").replace(".", "")

        if key in canonical_skills:
            target = canonical_skills[key]
            if skill.name != target.name and skill.name not in target.aliases:
                target.aliases.append(skill.name)
            for a in skill.aliases:
                if a not in target.aliases and a != target.name:
                    target.aliases.append(a)
            if skill.approved and not target.approved:
                target.approved = True
                target.source = skill.source
        else:
            updated_skill = skill.model_copy(deep=True, update={"name": canon_name})
            canonical_skills[key] = updated_skill

    profile.skills = list(canonical_skills.values())

    for entry in profile.entries:
        entry.link = normalize_contact_link(entry.link, "website")
        entry.start_date, entry.end_date = normalize_entry_dates(
            entry.start_date,
            entry.end_date,
            entry.date_precision,
        )

        if entry.kind == "project" and entry.titles:
            t_def = next((t for t in entry.titles if t.is_default), entry.titles[0])
            new_title, new_org, new_role = normalize_project_title_org_role(
                t_def.title,
                entry.org,
                entry.role,
            )
            t_def.title = new_title
            entry.org = new_org
            entry.role = new_role

        if (
            entry.kind in {"experience", "project"}
            and len(entry.facts) == 1
            and len(entry.facts[0].text) > 160
        ):
            splits = [
                s
                for s in split_paragraph_into_bullets(entry.facts[0].text)
                if len(s) >= 15 and len(s.split()) >= 3
            ]
            if len(splits) >= 2:
                base_fact = entry.facts[0]
                entry.facts = [
                    Fact(
                        id=f"fact_{entry.id}_{idx + 1}",
                        entry_id=entry.id,
                        text=piece,
                        tags=list(base_fact.tags),
                        skill_ids=list(base_fact.skill_ids),
                        position=idx,
                        pinned=base_fact.pinned if idx == 0 else False,
                        weight=base_fact.weight,
                        default_selected=base_fact.default_selected,
                        source=base_fact.source,
                        approved=base_fact.approved,
                        approved_at=base_fact.approved_at,
                    )
                    for idx, piece in enumerate(splits)
                ]

        seen_facts: list[str] = []
        unique_facts: list[Fact] = []
        for fact in entry.facts:
            norm_fact = fact.text.strip().lower()
            if norm_fact not in seen_facts:
                seen_facts.append(norm_fact)
                unique_facts.append(fact)
        entry.facts = unique_facts

        if entry.kind in {"experience", "project"} and len(entry.facts) < entry.min_bullets:
            entry.min_bullets = 1 if len(entry.facts) == 1 else 0

    return profile

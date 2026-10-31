"""AI-assisted profile enrichment: context distillation, title archetypes, and skills."""

from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict

from .anti_hallucination import TECH_REGEX, AntiHallucinationValidator
from .extractor import COMMON_TECH_KEYWORDS
from .llm import LLMClient
from .models import Entry, EntryTitle, Fact, LangCode, Profile, Skill

SKILL_CATEGORY_MAP: dict[str, tuple[str, str]] = {
    "python": ("Lenguajes", "Languages"),
    "typescript": ("Lenguajes", "Languages"),
    "javascript": ("Lenguajes", "Languages"),
    "c": ("Lenguajes", "Languages"),
    "c++": ("Lenguajes", "Languages"),
    "c#": ("Lenguajes", "Languages"),
    "java": ("Lenguajes", "Languages"),
    "rust": ("Lenguajes", "Languages"),
    "go": ("Lenguajes", "Languages"),
    "golang": ("Lenguajes", "Languages"),
    "sql": ("Lenguajes", "Languages"),
    "fastapi": ("Backend", "Backend"),
    "django": ("Backend", "Backend"),
    "flask": ("Backend", "Backend"),
    "node.js": ("Backend", "Backend"),
    "spring boot": ("Backend", "Backend"),
    ".net": ("Backend", "Backend"),
    "graphql": ("Backend", "Backend"),
    "rest": ("Backend", "Backend"),
    "celery": ("Backend", "Backend"),
    "react": ("Frontend", "Frontend"),
    "next.js": ("Frontend", "Frontend"),
    "vue": ("Frontend", "Frontend"),
    "tailwindcss": ("Frontend", "Frontend"),
    "postgresql": ("Datos & DB", "Data & DB"),
    "mongodb": ("Datos & DB", "Data & DB"),
    "redis": ("Datos & DB", "Data & DB"),
    "supabase": ("Datos & DB", "Data & DB"),
    "kafka": ("Datos & DB", "Data & DB"),
    "rabbitmq": ("Datos & DB", "Data & DB"),
    "docker": ("Cloud & DevOps", "Cloud & DevOps"),
    "kubernetes": ("Cloud & DevOps", "Cloud & DevOps"),
    "aws": ("Cloud & DevOps", "Cloud & DevOps"),
    "gcp": ("Cloud & DevOps", "Cloud & DevOps"),
    "azure": ("Cloud & DevOps", "Cloud & DevOps"),
    "linux": ("Cloud & DevOps", "Cloud & DevOps"),
    "arch linux": ("Cloud & DevOps", "Cloud & DevOps"),
    "git": ("Herramientas", "Tools"),
    "github actions": ("Cloud & DevOps", "Cloud & DevOps"),
    "ci/cd": ("Cloud & DevOps", "Cloud & DevOps"),
    "pytest": ("Herramientas", "Tools"),
    "jest": ("Herramientas", "Tools"),
}

FIRST_PERSON_REWRITES_ES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^desarroll[eé]\s+", re.IGNORECASE), "Desarrollo e implementación de "),
    (re.compile(r"^implement[eé]\s+", re.IGNORECASE), "Implementación y despliegue de "),
    (re.compile(r"^cre[eé]\s+", re.IGNORECASE), "Diseño y construcción de "),
    (re.compile(r"^arm[eé]\s+", re.IGNORECASE), "Estructuración y desarrollo de "),
    (re.compile(r"^hic[eé]\s+", re.IGNORECASE), "Ejecución y desarrollo de "),
    (re.compile(r"^trabaj[eé]\s+en\s+", re.IGNORECASE), "Participación técnica en "),
    (re.compile(r"^optimic[eé]\s+", re.IGNORECASE), "Optimización de rendimiento en "),
    (re.compile(r"^automatiz[eé]\s+", re.IGNORECASE), "Automatización de "),
    (re.compile(r"^automatic[eé]\s+", re.IGNORECASE), "Automatización de "),
    (re.compile(r"^diseñ[eé]\s+", re.IGNORECASE), "Diseño de arquitectura para "),
    (re.compile(r"^mantuv[eé]\s+", re.IGNORECASE), "Mantenimiento evolutivo de "),
]

FIRST_PERSON_REWRITES_EN: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^(?:i\s+)?built\s+", re.IGNORECASE), "Engineered and deployed "),
    (re.compile(r"^(?:i\s+)?created\s+", re.IGNORECASE), "Designed and implemented "),
    (
        re.compile(r"^(?:i\s+)?worked\s+on\s+", re.IGNORECASE),
        "Contributed to the architecture of ",
    ),
    (re.compile(r"^(?:i\s+)?made\s+", re.IGNORECASE), "Developed and delivered "),
    (
        re.compile(r"^(?:i\s+)?helped\s+with\s+", re.IGNORECASE),
        "Collaborated on the execution of ",
    ),
]


class EnhanceStats(BaseModel):
    """Telemetry counters for a single profile enhancement pass."""

    model_config = ConfigDict(extra="forbid")

    distilled_facts: int = 0
    improved_facts: int = 0
    suggested_titles: int = 0
    detected_skills: int = 0
    redundant_facts_marked: int = 0
    redundant_skills_marked: int = 0

    @property
    def total(self) -> int:
        return (
            self.distilled_facts
            + self.improved_facts
            + self.suggested_titles
            + self.detected_skills
            + self.redundant_facts_marked
            + self.redundant_skills_marked
        )


class EnhanceProfileResponse(BaseModel):
    """Payload returned by the profile enhancement engine and endpoint."""

    model_config = ConfigDict(extra="forbid")

    profile: Profile
    stats: EnhanceStats
    used_llm: bool


def _short_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _normalize_skill_token(name: str) -> str:
    return re.sub(r"[\s._-]+", "", name.lower().strip())


def _known_skill_tokens(skills: list[Skill]) -> set[str]:
    known: set[str] = set()
    for sk in skills:
        known.add(_normalize_skill_token(sk.name))
        for alias in sk.aliases:
            known.add(_normalize_skill_token(alias))
    return known


def _allowed_tech_tokens(profile: Profile, entry: Entry, extra_skills: list[str]) -> set[str]:
    allowed: set[str] = _known_skill_tokens(profile.skills)
    for s in extra_skills:
        allowed.add(_normalize_skill_token(s))
    corpus = " ".join([entry.org, entry.context] + [f.text for f in entry.facts])
    for m in TECH_REGEX.finditer(corpus):
        allowed.add(_normalize_skill_token(m.group(0)))
    return allowed


def _is_valid_rewrite(
    proposed: str,
    source_texts: list[str],
    allowed_techs: set[str],
) -> bool:
    """Ensure proposed text invents no numbers and introduces no unauthorized tech."""
    clean = proposed.strip()
    if not clean or len(clean) < 12:
        return False

    proposed_nums = AntiHallucinationValidator.extract_numbers(clean)
    if proposed_nums:
        source_nums: set[str] = set()
        for src in source_texts:
            source_nums.update(AntiHallucinationValidator.extract_numbers(src))
        if not proposed_nums.issubset(source_nums):
            return False

    proposed_techs = {_normalize_skill_token(m.group(0)) for m in TECH_REGEX.finditer(clean)}
    if not proposed_techs.issubset(allowed_techs):
        return False

    return True


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


FORBIDDEN_PROJECT_TITLE_PATTERN = re.compile(
    r"\b("
    r"developer|dev|engineer|programmer|coder|architect|lead|specialist|consultant|intern|manager|analyst|"
    r"desarrollador|desarrolladora|ingeniero|ingeniera|programador|programadora|"
    r"arquitecto|arquitecta|lider|líder|especialista|consultor|consultora|pasante|gerente|analista"
    r")\b",
    re.IGNORECASE,
)


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


def _enhance_with_llm(
    profile: Profile,
    llm: LLMClient,
    stats: EnhanceStats,
) -> bool:
    """Run a single batch LLM call to enrich the profile with anti-hallucination checks."""
    entries_payload = []
    for entry in profile.entries:
        if entry.archived:
            continue
        entries_payload.append(
            {
                "entry_id": entry.id,
                "kind": entry.kind,
                "org": entry.org,
                "context": entry.context,
                "existing_titles": [
                    {"title": t.title, "archetype": t.archetype} for t in entry.titles
                ],
                "facts": [{"fact_id": f.id, "text": f.text} for f in entry.facts if f.approved],
            }
        )

    existing_skills = [s.name for s in profile.skills]
    lang = profile.base_lang

    system_prompt = (
        "You are an elite technical resume editor and ATS specialist.\n"
        "Analyze the Master Profile and return a single JSON object with AI suggestions:\n"
        "1. `detected_skills`: Canonical technical skills mentioned in entries/context/facts "
        "missing from `existing_skills`.\n"
        "2. `redundant_skills`: Technical skills in `existing_skills` that are redundant, "
        "duplicates, or obsolete aliases of other skills (e.g. both 'Postgres' and 'PostgreSQL'). "
        "Include `name` and a concise `reason` in the profile's language.\n"
        "3. `redundant_facts`: Bullets that are duplicates, near-duplicates, or redundant "
        "with another bullet in the candidate's profile. Include `fact_id` and a concise "
        "`reason` in the profile's language explaining why it should be removed.\n"
        "4. `entries`: For each entry:\n"
        "   - `distilled_facts`: If `context` contains achievements not yet in `facts`, "
        "extract 1-3 atomic bullets (16-24 words, nominal/action style).\n"
        "   - `improved_facts`: For existing `facts` that can be phrased with stronger ATS "
        "impact, provide `fact_id` and `proposed_text`.\n"
        "   - `suggested_titles`: Up to 2 alternative titles tailored to "
        "archetypes (`backend`, `frontend`, `fullstack`, `data`, `devops`).\n"
        "     * For `experience` entries: Suggest job/role titles tailored to archetypes (e.g. 'Backend Engineer', 'Desarrollador Full Stack').\n"
        "     * For `project` entries: Suggest concise, descriptive artifact/system/product titles (e.g. 'Simulador de Físicas 2D', 'API Gateway Distribuido'). STRICTLY PROHIBITED: NEVER suggest employment job titles (e.g. 'Software Developer', 'Backend Engineer') for projects.\n"
        "STRICT ANTI-HALLUCINATION RULES:\n"
        "- NEVER invent numbers, percentages, latencies, or metrics not in original text.\n"
        "- NEVER introduce technologies not mentioned in the candidate's profile.\n"
        "- Match the language of the profile (`es` or `en`).\n"
        "Return ONLY valid JSON matching:\n"
        "{\n"
        '  "detected_skills": [{"name": "...", "category": "Backend"}],\n'
        '  "redundant_skills": [{"name": "...", "reason": "..."}],\n'
        '  "redundant_facts": [{"fact_id": "...", "reason": "..."}],\n'
        '  "entries": [\n'
        "    {\n"
        '      "entry_id": "...",\n'
        '      "distilled_facts": ["..."],\n'
        '      "improved_facts": [{"fact_id": "...", "proposed_text": "..."}],\n'
        '      "suggested_titles": [{"title": "...", "archetype": "backend"}]\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        f"Profile Language: {lang}\nExisting Skills: {existing_skills}\nEntries:\n{entries_payload}"
    )

    try:
        data = llm.parse_json_completion(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
    except Exception:
        return False

    if not isinstance(data, dict):
        return False

    known_tokens = _known_skill_tokens(profile.skills)
    raw_skills = data.get("detected_skills", [])
    llm_skill_names: list[str] = []
    if isinstance(raw_skills, list):
        for item in raw_skills:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            cat = str(item.get("category", "Herramientas")).strip() or "Herramientas"
            if not name:
                continue
            norm = _normalize_skill_token(name)
            if norm in known_tokens:
                continue
            known_tokens.add(norm)
            llm_skill_names.append(name)
            profile.skills.append(
                Skill(
                    id=_short_id("skill_ai"),
                    name=name,
                    category=cat,
                    aliases=[name.lower()],
                    tags=["dev"],
                    source="ai",
                    approved=False,
                    approved_at=None,
                )
            )
            stats.detected_skills += 1

    # Mark redundant skills recommended for removal
    raw_redundant_skills = data.get("redundant_skills", [])
    if isinstance(raw_redundant_skills, list):
        skill_reasons = {
            str(item.get("name", "")).strip().lower(): str(item.get("reason", "Habilidad redundante o duplicada")).strip()
            for item in raw_redundant_skills
            if isinstance(item, dict) and item.get("name")
        }
        for skill in profile.skills:
            norm_sk = skill.name.strip().lower()
            if norm_sk in skill_reasons:
                skill.marked_for_removal = True
                skill.removal_reason = skill_reasons[norm_sk]
                stats.redundant_skills_marked += 1

    # Mark redundant facts recommended for removal
    raw_redundant_facts = data.get("redundant_facts", [])
    if isinstance(raw_redundant_facts, list):
        fact_reasons = {
            str(item.get("fact_id", "")): str(item.get("reason", "Viñeta redundante o duplicada")).strip()
            for item in raw_redundant_facts
            if isinstance(item, dict) and item.get("fact_id")
        }
        for entry in profile.entries:
            for fact in entry.facts:
                if fact.id in fact_reasons:
                    fact.marked_for_removal = True
                    fact.removal_reason = fact_reasons[fact.id]
                    stats.redundant_facts_marked += 1

    entries_by_id = {e.id: e for e in profile.entries}
    raw_entries = data.get("entries", [])
    if isinstance(raw_entries, list):
        for e_item in raw_entries:
            if not isinstance(e_item, dict):
                continue
            eid = str(e_item.get("entry_id", ""))
            entry = entries_by_id.get(eid)
            if not entry:
                continue

            allowed_techs = _allowed_tech_tokens(profile, entry, llm_skill_names)
            existing_fact_lows = {f.text.lower().strip().rstrip(".") for f in entry.facts}
            next_pos = max((f.position for f in entry.facts), default=-1) + 1

            if (entry.context or "").strip():
                for d_text in e_item.get("distilled_facts", []) or []:
                    if not isinstance(d_text, str):
                        continue
                    clean_d = d_text.strip()
                    if not _is_valid_rewrite(clean_d, [entry.context, entry.org], allowed_techs):
                        continue
                    if clean_d.lower().rstrip(".") in existing_fact_lows:
                        continue
                    existing_fact_lows.add(clean_d.lower().rstrip("."))
                    entry.facts.append(
                        Fact(
                            id=_short_id("fact_ai"),
                            entry_id=entry.id,
                            text=clean_d,
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
                    stats.distilled_facts += 1

            facts_by_id = {f.id: f for f in entry.facts if f.approved}
            for imp in e_item.get("improved_facts", []) or []:
                if not isinstance(imp, dict):
                    continue
                fid = str(imp.get("fact_id", ""))
                prop_text = str(imp.get("proposed_text", "")).strip()
                target_fact = facts_by_id.get(fid)
                if not target_fact or not prop_text:
                    continue
                if prop_text.lower().rstrip(".") == target_fact.text.lower().strip().rstrip("."):
                    continue
                if _is_valid_rewrite(
                    prop_text,
                    [target_fact.text, entry.context, entry.org],
                    allowed_techs,
                ):
                    target_fact.proposed_text = prop_text
                    stats.improved_facts += 1

            existing_titles = {t.title.lower().strip() for t in entry.titles}
            for t_item in e_item.get("suggested_titles", []) or []:
                if not isinstance(t_item, dict):
                    continue
                t_str = str(t_item.get("title", "")).strip()
                arch = str(t_item.get("archetype", "")).strip() or None
                if not t_str or t_str.lower() in existing_titles:
                    continue
                if entry.kind == "project" and _is_forbidden_project_title(t_str):
                    continue
                existing_titles.add(t_str.lower())
                entry.titles.append(
                    EntryTitle(
                        id=_short_id("title_ai"),
                        entry_id=entry.id,
                        title=t_str,
                        archetype=arch,
                        is_default=False,
                        source="ai",
                        approved=False,
                        approved_at=None,
                    )
                )
                stats.suggested_titles += 1

    return True


CANONICAL_SKILL_MAP: dict[str, str] = {
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "fastapi": "FastAPI",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "docker": "Docker",
    "aws": "AWS",
    "amazon web services": "AWS",
    "git": "Git",
    "github": "GitHub",
    "graphql": "GraphQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "linux": "Linux",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "python": "Python",
    "java": "Java",
    "c": "C",
    "cpp": "C++",
    "c++": "C++",
    "c#": "C#",
    "csharp": "C#",
    "golang": "Go",
    "go": "Go",
    "rust": "Rust",
    "html": "HTML5",
    "html5": "HTML5",
    "css": "CSS3",
    "css3": "CSS3",
    "sql": "SQL",
    "redis": "Redis",
    "django": "Django",
    "flask": "Flask",
    "express": "Express",
    "expressjs": "Express",
    "express.js": "Express",
    "supabase": "Supabase",
}


def clean_and_deduplicate_profile(profile: Profile) -> Profile:
    """Normalize canonical skills, merge duplicates, and deduplicate identical facts."""
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
        seen_facts: list[str] = []
        unique_facts: list[Fact] = []
        for fact in entry.facts:
            norm_fact = fact.text.strip().lower()
            if norm_fact not in seen_facts:
                seen_facts.append(norm_fact)
                unique_facts.append(fact)
        entry.facts = unique_facts

    return profile


def enhance_profile(profile: Profile, llm: LLMClient | None = None) -> EnhanceProfileResponse:
    """Run a unified AI + deterministic enrichment pass on the Master Profile.

    All generated items enter with `source="ai", approved=False` (or `proposed_text` on Facts)
    so the candidate can review, approve, or discard them in one step.
    """
    working = clean_and_deduplicate_profile(profile.model_copy(deep=True))

    working.skills = [s for s in working.skills if s.approved]
    for entry in working.entries:
        entry.titles = [t for t in entry.titles if t.approved]
        entry.facts = [f for f in entry.facts if f.approved]
        for f in entry.facts:
            f.proposed_text = None

    stats = EnhanceStats()
    lang = working.base_lang
    used_llm = False

    if llm is not None and llm.is_configured:
        used_llm = _enhance_with_llm(working, llm, stats)

    # Supplement with deterministic skill detection for known tech tokens
    det_skills = _detect_missing_skills_deterministic(working)
    if det_skills:
        working.skills.extend(det_skills)
        stats.detected_skills += len(det_skills)

    # Fallback deterministic pass if LLM was not used or failed
    if not used_llm:
        for entry in working.entries:
            if entry.archived:
                continue

            allowed_techs = _allowed_tech_tokens(working, entry, [])

            distilled = _distill_context_deterministic(entry, lang)
            if distilled:
                entry.facts.extend(distilled)
                stats.distilled_facts += len(distilled)

            for fact in entry.facts:
                if not fact.approved:
                    continue
                polished = _polish_fact_deterministic(fact.text, lang)
                if polished and _is_valid_rewrite(
                    polished, [fact.text, entry.context, entry.org], allowed_techs
                ):
                    fact.proposed_text = polished
                    stats.improved_facts += 1

            sug_titles = _suggest_titles_deterministic(entry, lang)
            if sug_titles:
                entry.titles.extend(sug_titles)
                stats.suggested_titles += len(sug_titles)

    return EnhanceProfileResponse(
        profile=working,
        stats=stats,
        used_llm=used_llm,
    )

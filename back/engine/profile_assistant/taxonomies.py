"""Taxonomies, keyword categories, and anti-hallucination validation helpers."""

from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict

from back.engine.anti_hallucination import TECH_REGEX, AntiHallucinationValidator
from back.engine.models import Entry, Profile, Skill

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

FORBIDDEN_PROJECT_TITLE_PATTERN = re.compile(
    r"\b("
    r"developer|dev|engineer|programmer|coder|architect|lead|specialist|consultant|intern|manager|analyst|"
    r"desarrollador|desarrolladora|ingeniero|ingeniera|programador|programadora|"
    r"arquitecto|arquitecta|lider|líder|especialista|consultor|consultora|pasante|gerente|analista"
    r")\b",
    re.IGNORECASE,
)

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

"""Master Profile domain models, entries, facts, skills, and legacy migrations."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

LangCode = Literal["es", "en"]
EntryKind = Literal["experience", "project", "education", "certification", "other"]
DatePrecision = Literal["year", "month", "day"]
TitleSource = Literal["user", "ai"]
FactSource = Literal["user", "ai"]

DEFAULT_CATEGORY_TRANSLATIONS: dict[str, dict[LangCode, str]] = {
    "lenguajes": {"en": "Languages", "es": "Lenguajes"},
    "frameworks & librerías": {"en": "Frameworks & Libraries", "es": "Frameworks & Librerías"},
    "frameworks": {"en": "Frameworks", "es": "Frameworks"},
    "bases de datos": {"en": "Databases", "es": "Bases de Datos"},
    "devops & cloud": {"en": "DevOps & Cloud", "es": "DevOps & Cloud"},
    "herramientas": {"en": "Tools", "es": "Herramientas"},
    "herramientas & metodologías": {
        "en": "Tools & Methodologies",
        "es": "Herramientas & Metodologías",
    },
    "metodologías": {"en": "Methodologies", "es": "Metodologías"},
    "arquitectura & diseño": {"en": "Architecture & Design", "es": "Arquitectura & Diseño"},
    "soft skills": {"en": "Soft Skills", "es": "Soft Skills"},
    "idiomas": {"en": "Languages", "es": "Idiomas"},
}

DEFAULT_LEVEL_TRANSLATIONS: dict[str, dict[LangCode, str]] = {
    "avanzado": {"en": "Advanced", "es": "Avanzado"},
    "intermedio": {"en": "Intermediate", "es": "Intermedio"},
    "básico": {"en": "Basic", "es": "Básico"},
    "nativo": {"en": "Native", "es": "Nativo"},
    "bilingüe": {"en": "Bilingual", "es": "Bilingüe"},
    "profesional": {"en": "Professional", "es": "Profesional"},
}


class ContactInfo(BaseModel):
    """Contact metadata for the candidate header."""

    model_config = ConfigDict(extra="forbid")

    email: str
    phone: str
    location: str
    github: str | None = None
    linkedin: str | None = None
    website: str | None = None
    photo_url: str | None = None


class Skill(BaseModel):
    """Canonical skill entry and anti-hallucination alias whitelist."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    category: str
    aliases: list[str] = Field(default_factory=list)
    level: str | None = None
    tags: list[str] = Field(default_factory=list)
    source: TitleSource = "user"
    approved: bool = True
    approved_at: datetime | str | None = None
    marked_for_removal: bool = False
    removal_reason: str | None = None

    def display_label(self) -> str:
        """Format skill name with optional proficiency level."""
        if self.level:
            return f"{self.name} ({self.level})"
        return self.name

    def category_label(self) -> str:
        """Return the category header as stored in the profile language."""
        return self.category


class EntryTitle(BaseModel):
    """Role or project title variant associated with an Entry."""

    model_config = ConfigDict(extra="forbid")

    id: str
    entry_id: str | None = None
    title: str
    archetype: str | None = None
    is_default: bool = False
    source: TitleSource = "user"
    approved: bool = True
    approved_at: datetime | str | None = None

    @model_validator(mode="after")
    def _validate_ai_approval(self) -> EntryTitle:
        if self.source == "ai" and self.approved and self.approved_at is None:
            raise ValueError("AI-generated entry titles require approved_at when approved=True.")
        return self


class Fact(BaseModel):
    """Atomic verifiable bullet belonging to an Entry."""

    model_config = ConfigDict(extra="forbid")

    id: str
    entry_id: str | None = None
    text: str
    tags: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    position: int = 0
    pinned: bool = False
    weight: int = 100
    default_selected: bool = False
    source: TitleSource = "user"
    approved: bool = True
    approved_at: datetime | str | None = None
    proposed_text: str | None = None
    marked_for_removal: bool = False
    removal_reason: str | None = None


def _format_iso_date(raw: str, precision: DatePrecision) -> str:
    """Convert YYYY-MM or YYYY into MM/YYYY or YYYY."""
    parts = raw.strip().split("-")
    if precision == "year" or len(parts) == 1:
        return parts[0]
    if len(parts) >= 2:
        year, month = parts[0], parts[1].zfill(2)
        return f"{month}/{year}"
    return raw


class Entry(BaseModel):
    """Normalized experience, project, or education record in the Master Profile."""

    model_config = ConfigDict(extra="forbid")

    id: str
    kind: EntryKind
    org: str
    location: str | None = None
    start_date: str
    end_date: str | None = None
    date_precision: DatePrecision = "month"
    link: str | None = None
    context: str = ""
    position: int = 0
    archived: bool = False
    default_selected: bool = True
    archetypes: list[str] = Field(default_factory=list)
    min_bullets: int = Field(default=1, ge=0)
    max_bullets: int = Field(default=4, ge=0)
    titles: list[EntryTitle] = Field(default_factory=list)
    facts: list[Fact] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)

    def format_date_range(self, lang: LangCode = "es") -> str:
        """Render ATS-standard date range (MM/YYYY - MM/YYYY or Presente/Present)."""
        start_str = _format_iso_date(self.start_date, self.date_precision)
        if not self.end_date:
            return start_str
        if self.end_date.lower() in {"present", "presente", "current"}:
            present_str = "Present" if lang == "en" else "Presente"
            return f"{start_str} - {present_str}"
        end_str = _format_iso_date(self.end_date, self.date_precision)
        if start_str == end_str:
            return start_str
        return f"{start_str} - {end_str}"

    def select_title(
        self,
        archetype: str | None = None,
        title_id: str | None = None,
    ) -> EntryTitle:
        """Select an approved title matching id, archetype, or default."""
        if title_id is not None:
            for t in self.titles:
                if t.id == title_id:
                    if not t.approved:
                        raise ValueError(
                            f"EntryTitle '{t.id}' is not approved and cannot be rendered."
                        )
                    return t
            raise ValueError(f"EntryTitle '{title_id}' not found in entry '{self.id}'.")

        approved_titles = [t for t in self.titles if t.approved]
        if not approved_titles:
            raise ValueError(f"Entry '{self.id}' has no approved titles.")

        if archetype:
            arch_titles = [t for t in approved_titles if t.archetype == archetype]
            if arch_titles:
                return arch_titles[0]

        default_titles = [t for t in approved_titles if t.is_default]
        if default_titles:
            return default_titles[0]
        return approved_titles[0]


PROFILE_SCHEMA_VERSION = "2.0.0"
_LEGACY_PROFILE_KEYS = ("default_lang", "summary_en")
_LEGACY_ENTRY_KEYS = ("location_en",)
_LEGACY_SKILL_KEYS = ("category_en", "level_en")
_LEGACY_FACT_KEYS = ("text_en", "lang")


def _is_legacy_profile(data: dict) -> bool:
    return str(data.get("schema_version", "1.0.0")).startswith("1.") or any(
        k in data for k in _LEGACY_PROFILE_KEYS
    )


def upcast_legacy_profile(data: dict) -> dict:
    """Convert a v1 profile dict (mixed ES/EN fields) into a monolingual v2 dict.

    Keeps only base-language content: titles tagged with a different language are
    dropped when the entry has titles in the base language.
    """
    out = dict(data)
    base_lang = out.pop("default_lang", None) or out.get("base_lang") or "es"
    out["base_lang"] = base_lang
    out.pop("summary_en", None)
    out["schema_version"] = PROFILE_SCHEMA_VERSION

    skills = []
    for sk in out.get("skills", []) or []:
        sk = dict(sk)
        for k in _LEGACY_SKILL_KEYS:
            sk.pop(k, None)
        skills.append(sk)
    out["skills"] = skills

    entries = []
    for entry in out.get("entries", []) or []:
        entry = dict(entry)
        for k in _LEGACY_ENTRY_KEYS:
            entry.pop(k, None)
        titles = [dict(t) for t in entry.get("titles", []) or []]
        base_titles = [t for t in titles if t.get("lang", base_lang) == base_lang]
        kept_titles = base_titles or titles
        for t in kept_titles:
            t.pop("lang", None)
        entry["titles"] = kept_titles
        facts = []
        for fact in entry.get("facts", []) or []:
            fact = dict(fact)
            for k in _LEGACY_FACT_KEYS:
                fact.pop(k, None)
            facts.append(fact)
        entry["facts"] = facts
        entries.append(entry)
    out["entries"] = entries
    return out


class Profile(BaseModel):
    """Master Profile containing the exhaustive fact bank, skills, and entries."""

    model_config = ConfigDict(extra="forbid")

    id: str = "default"
    schema_version: str = PROFILE_SCHEMA_VERSION
    full_name: str
    contact: ContactInfo
    base_lang: LangCode = "es"
    summary: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    entries: list[Entry] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _upcast_legacy(cls, data: object) -> object:
        """Strip v1 bilingual fields (`*_en`, per-row `lang`) and rename default_lang."""
        if isinstance(data, dict) and _is_legacy_profile(data):
            return upcast_legacy_profile(data)
        return data

    @classmethod
    def from_json(cls, path: str | Path) -> Profile:
        """Load and validate a Master Profile from a JSON file."""
        content = Path(path).read_text(encoding="utf-8")
        return cls.model_validate_json(content)

    @classmethod
    def from_file(cls, path: str | Path) -> Profile:
        """Load and validate a Master Profile from a file (.json preferred)."""
        p = Path(path)
        if not p.exists() and p.with_suffix(".json").exists():
            return cls.from_json(p.with_suffix(".json"))
        if p.suffix.lower() == ".json":
            return cls.from_json(p)
        return cls.from_yaml(p)

    def to_json(self, path: str | Path | None = None, indent: int = 2) -> str:
        """Serialize Master Profile to JSON string and optionally save to disk."""
        dumped = self.model_dump_json(indent=indent, exclude_none=True)
        if path is not None:
            Path(path).write_text(dumped, encoding="utf-8")
        return dumped

    @classmethod
    def from_yaml(cls, path: str | Path) -> Profile:
        """Deprecated compatibility loader: falls back to .json if .yaml missing."""
        p = Path(path)
        if not p.exists() and p.with_suffix(".json").exists():
            return cls.from_json(p.with_suffix(".json"))
        try:
            import yaml

            raw = yaml.safe_load(p.read_text(encoding="utf-8"))
            return cls.model_validate(raw)
        except Exception:
            return cls.from_json(p)

    def to_yaml(self, path: str | Path | None = None) -> str:
        """Deprecated: Serialize profile to JSON."""
        return self.to_json(path)

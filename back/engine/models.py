"""Pydantic schemas and domain models for CV Tailor (SSOT)."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

LangCode = Literal["es", "en"]
EntryKind = Literal["experience", "project", "education", "certification", "other"]
DatePrecision = Literal["year", "month", "day"]
TitleSource = Literal["user", "ai"]
ThemeName = Literal["classic", "modern", "engineering"]
SectionKey = Literal["summary", "skills", "experience", "projects", "education"]

DEFAULT_SECTION_ORDER: list[SectionKey] = [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
]

MAX_EXPERIENCE_ENTRIES: int = 3
MAX_PROJECT_ENTRIES: int = 3
MAX_EDUCATION_ENTRIES: int = 2
SECTION_MAX_ENTRIES: dict[str, int] = {
    "experience": MAX_EXPERIENCE_ENTRIES,
    "projects": MAX_PROJECT_ENTRIES,
    "education": MAX_EDUCATION_ENTRIES,
}
MAX_COMFORTABLE_DENSITY: float = 0.35


class ContactInfo(BaseModel):
    """Contact metadata for the candidate header."""

    model_config = ConfigDict(extra="forbid")

    email: str
    phone: str
    location: str
    github: str | None = None
    linkedin: str | None = None
    website: str | None = None


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


def _format_iso_date(raw: str, precision: DatePrecision) -> str:
    """Convert YYYY-MM or YYYY into MM/YYYY or YYYY."""
    parts = raw.strip().split("-")
    if precision == "year" or len(parts) == 1:
        return parts[0]
    if len(parts) >= 2:
        year, month = parts[0], parts[1].zfill(2)
        return f"{month}/{year}"
    return raw


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


class JobSpec(BaseModel):
    """Structured representation of a job posting extracted for tailoring."""

    model_config = ConfigDict(extra="forbid")

    company: str | None = None
    role: str | None = None
    lang: LangCode = "es"
    archetype: str | None = None
    keywords: list[str] = Field(default_factory=list)
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    raw_text: str | None = None
    source_url: str | None = None


class DesignKnobs(BaseModel):
    """Typographic and layout parameters controlled by the deterministic fit engine."""

    model_config = ConfigDict(extra="forbid")

    density: float = Field(default=0.0, ge=0.0, le=1.0)
    font_size_pt: float = Field(default=9.7, ge=8.5, le=11.0)
    leading_em: float = Field(default=0.44, ge=0.35, le=0.85)
    section_spacing_pt: float = Field(default=12.0, ge=4.0, le=20.0)
    entry_spacing_pt: float = Field(default=7.5, ge=2.5, le=13.0)
    bullet_spacing_pt: float = Field(default=6.0, ge=2.5, le=10.0)
    margin_x_cm: float = Field(default=1.35, ge=1.0, le=2.5)
    margin_y_cm: float = Field(default=1.30, ge=0.95, le=2.5)
    font_family: str = "Liberation Sans"

    @classmethod
    def from_density(
        cls,
        density: float,
        font_family: str = "Liberation Sans",
    ) -> DesignKnobs:
        """Interpolate all typographic knobs linearly from density in [0.0, 1.0].

        Enforces an ergonomic readability floor at `density = 1.0` so that the fit engine
        prunes low-priority bullets by slot rather than crushing line or bullet spacing.
        """
        if not 0.0 <= density <= 1.0:
            raise ValueError(f"density must be in [0.0, 1.0], got {density}")

        def lerp(low_d: float, high_d: float) -> float:
            return round(low_d + (high_d - low_d) * density, 3)

        return cls(
            density=round(density, 4),
            font_size_pt=lerp(9.7, 9.25),
            leading_em=lerp(0.44, 0.38),
            section_spacing_pt=lerp(12.0, 9.0),
            entry_spacing_pt=lerp(7.5, 5.5),
            bullet_spacing_pt=lerp(6.0, 4.8),
            margin_x_cm=lerp(1.35, 1.20),
            margin_y_cm=lerp(1.30, 1.10),
            font_family=font_family,
        )

    @classmethod
    def from_relaxed(
        cls,
        relax: float,
        font_family: str = "Liberation Sans",
    ) -> DesignKnobs:
        """Interpolate relaxed typographic knobs in [0.0, 1.0] for sparse underfilled layouts."""
        if not 0.0 <= relax <= 1.0:
            raise ValueError(f"relax must be in [0.0, 1.0], got {relax}")

        def lerp(base_val: float, max_val: float) -> float:
            return round(base_val + (max_val - base_val) * relax, 3)

        return cls(
            density=0.0,
            font_size_pt=lerp(9.7, 10.9),
            leading_em=lerp(0.44, 0.74),
            section_spacing_pt=lerp(12.0, 19.0),
            entry_spacing_pt=lerp(7.5, 12.0),
            bullet_spacing_pt=lerp(6.0, 8.5),
            margin_x_cm=lerp(1.35, 2.30),
            margin_y_cm=lerp(1.30, 2.45),
            font_family=font_family,
        )


class RenderSkillGroup(BaseModel):
    """Grouped skills row ready for rendering."""

    model_config = ConfigDict(extra="forbid")

    category: str
    items: str
    skill_ids: list[str] = Field(default_factory=list)


class RenderBullet(BaseModel):
    """Single bullet point in a RenderEntry with full provenance metadata."""

    model_config = ConfigDict(extra="forbid")

    text: str
    fact_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    priority: int = 100
    pinned: bool = False
    position: int = 0
    suggested_alternatives: list[str] = Field(default_factory=list)
    selected: bool = True


class RenderEntry(BaseModel):
    """Denormalized entry ready for Typst compilation."""

    model_config = ConfigDict(extra="forbid")

    entry_id: str
    title: str
    title_id: str | None = None
    org: str
    location: str | None = None
    date_label: str
    link: str | None = None
    bullets: list[RenderBullet] = Field(default_factory=list)
    min_bullets: int = Field(default=1, ge=0)
    max_bullets: int = Field(default=4, ge=0)
    selected: bool = True


class RenderModel(BaseModel):
    """Self-contained denormalized payload for Typst rendering and immutable snapshots."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str = "1.0.0"
    theme: ThemeName = "classic"
    lang: LangCode = "es"
    full_name: str
    contact: ContactInfo
    summary: str | None = None
    summary_fact_ids: list[str] = Field(default_factory=list)
    skills: list[RenderSkillGroup] = Field(default_factory=list)
    experience: list[RenderEntry] = Field(default_factory=list)
    projects: list[RenderEntry] = Field(default_factory=list)
    education: list[RenderEntry] = Field(default_factory=list)
    section_order: list[SectionKey] = Field(
        default_factory=lambda: list(DEFAULT_SECTION_ORDER)
    )
    design: DesignKnobs = Field(default_factory=DesignKnobs)

    @classmethod
    def from_profile(
        cls,
        profile: Profile,
        *,
        lang: LangCode | None = None,
        archetype: str | None = None,
        theme: ThemeName = "classic",
        density: float = 0.0,
        include_summary: bool = True,
        include_all: bool = False,
        section_order: list[SectionKey] | None = None,
    ) -> RenderModel:
        """Build a deterministic RenderModel from a Master Profile respecting ATS slots."""
        target_lang: LangCode = lang or profile.base_lang
        font_family = "Liberation Serif" if theme == "engineering" else "Liberation Sans"
        design = DesignKnobs.from_density(density, font_family=font_family)

        # Group skills by localized category
        skill_groups: list[RenderSkillGroup] = []
        grouped: dict[str, list[Skill]] = {}
        for sk in profile.skills:
            if not sk.approved:
                continue
            if not include_all and archetype and sk.tags and archetype not in sk.tags:
                continue
            cat = sk.category_label()
            grouped.setdefault(cat, []).append(sk)

        for cat, sk_list in grouped.items():
            skill_groups.append(
                RenderSkillGroup(
                    category=cat,
                    items=", ".join(s.display_label() for s in sk_list),
                    skill_ids=[s.id for s in sk_list],
                )
            )

        experience_entries: list[RenderEntry] = []
        project_entries: list[RenderEntry] = []
        education_entries: list[RenderEntry] = []

        sorted_entries = sorted(
            (e for e in profile.entries if not e.archived),
            key=lambda e: e.position,
        )

        for entry in sorted_entries:
            if not include_all:
                if archetype and entry.archetypes and archetype not in entry.archetypes:
                    continue
                if not archetype and not entry.default_selected:
                    continue
                if entry.kind == "experience" and len(experience_entries) >= MAX_EXPERIENCE_ENTRIES:
                    continue
                if entry.kind == "project" and len(project_entries) >= MAX_PROJECT_ENTRIES:
                    continue
                if entry.kind == "education" and len(education_entries) >= MAX_EDUCATION_ENTRIES:
                    continue

            selected_title = entry.select_title(archetype=archetype)
            approved_facts = [f for f in entry.facts if f.approved]
            sorted_facts = sorted(approved_facts, key=lambda f: f.position)

            if not include_all:
                if archetype:
                    arch_facts = [f for f in sorted_facts if archetype in f.tags]
                    chosen_facts = arch_facts or [
                        f for f in sorted_facts if f.default_selected or f.pinned
                    ]
                else:
                    chosen_facts = [f for f in sorted_facts if f.default_selected or f.pinned]
                if not chosen_facts and sorted_facts:
                    chosen_facts = sorted_facts[: max(entry.min_bullets, 2)]
                if entry.max_bullets > 0:
                    chosen_facts = chosen_facts[: entry.max_bullets]
            else:
                chosen_facts = sorted_facts

            bullets = [
                RenderBullet(
                    text=f.text,
                    fact_ids=[f.id],
                    skill_ids=list(f.skill_ids),
                    priority=f.weight,
                    pinned=f.pinned,
                    position=f.position,
                )
                for f in chosen_facts
            ]

            render_entry = RenderEntry(
                entry_id=entry.id,
                title=selected_title.title,
                title_id=selected_title.id,
                org=entry.org,
                location=entry.location,
                date_label=entry.format_date_range(target_lang),
                link=entry.link,
                bullets=bullets,
                min_bullets=entry.min_bullets,
                max_bullets=entry.max_bullets,
            )

            if entry.kind == "experience":
                experience_entries.append(render_entry)
            elif entry.kind == "project":
                project_entries.append(render_entry)
            elif entry.kind == "education":
                education_entries.append(render_entry)

        summary_text: str | None = profile.summary if include_summary else None

        return cls(
            theme=theme,
            lang=target_lang,
            full_name=profile.full_name,
            contact=profile.contact,
            summary=summary_text,
            skills=skill_groups,
            experience=experience_entries,
            projects=project_entries,
            education=education_entries,
            section_order=list(section_order) if section_order else list(DEFAULT_SECTION_ORDER),
            design=design,
        )


class FitReport(BaseModel):
    """Deterministic page count and vertical fill report emitted by the Typst renderer."""

    model_config = ConfigDict(extra="forbid")

    pages: int = Field(ge=1)
    end_page: int = Field(ge=1)
    end_y_pt: float = Field(ge=0.0)
    usable_height_pt: float = Field(gt=0.0)
    fill_ratio: float = Field(ge=0.0)
    fill_pct: float = Field(ge=0.0)
    fits_one_page: bool
    underfilled: bool
    density: float = Field(ge=0.0, le=1.0)
    pruned_fact_ids: list[str] = Field(default_factory=list)
    summary_pruned: bool = False

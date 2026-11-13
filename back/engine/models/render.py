"""Rendering domain models, Typst compile contracts, and fit reports."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from back.engine.models.profile import ContactInfo, Entry, LangCode, Profile, Skill

ThemeName = Literal[
    "classic",
    "modern",
    "engineering",
    "basic",
    "kire",
    "yuan",
    "modern-cv",
    "vercanard",
    "impressive-impression",
    "modern-resume",
    "metronic",
]
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
    org: str = ""
    role: str | None = None
    location: str | None = None

    @field_validator("org", mode="before")
    @classmethod
    def _coerce_org_none(cls, v: object) -> str:
        return "" if v is None else str(v)
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
    photo_path: str | None = None

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

        active_entries = [e for e in profile.entries if not e.archived]

        def _entry_sort_key(e: Entry) -> tuple[int, int, int, int, str]:
            matches_arch = 0 if (archetype and archetype in e.archetypes) else 1
            has_approved_facts = len([f for f in e.facts if f.approved])
            return (
                matches_arch,
                0 if e.default_selected else 1,
                e.position,
                -has_approved_facts,
                e.start_date or "",
            )

        sorted_entries = sorted(active_entries, key=_entry_sort_key)
        has_default_selected_proj = any(
            e.kind == "project" and e.default_selected for e in active_entries
        )
        has_default_selected_exp = any(
            e.kind == "experience" and e.default_selected for e in active_entries
        )

        for entry in sorted_entries:
            if not include_all:
                if archetype and entry.archetypes and archetype not in entry.archetypes:
                    continue
                if not archetype:
                    if entry.kind == "project" and has_default_selected_proj and not entry.default_selected:
                        continue
                    if entry.kind == "experience" and has_default_selected_exp and not entry.default_selected:
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
                elif len(chosen_facts) < entry.min_bullets and sorted_facts:
                    for f in sorted_facts:
                        if f not in chosen_facts:
                            chosen_facts.append(f)
                            if len(chosen_facts) >= entry.min_bullets:
                                break
                if entry.max_bullets > 0:
                    chosen_facts = chosen_facts[: entry.max_bullets]
            else:
                chosen_facts = sorted_facts

            # Do not create empty entries with 0 bullets in a blank CV
            if not include_all and not chosen_facts and entry.kind in {"experience", "project"}:
                continue

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
                org=entry.org or "",
                role=entry.role,
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

        # Preserve user position ordering in the rendered sections
        entry_pos_map = {e.id: e.position for e in profile.entries}
        experience_entries.sort(key=lambda re: entry_pos_map.get(re.entry_id, 0))
        project_entries.sort(key=lambda re: entry_pos_map.get(re.entry_id, 0))
        education_entries.sort(key=lambda re: entry_pos_map.get(re.entry_id, 0))

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
            photo_path=profile.contact.photo_url,
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

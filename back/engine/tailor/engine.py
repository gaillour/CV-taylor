"""Core engine to adapt a Master Profile to a specific JobSpec."""

from __future__ import annotations

from ..anti_hallucination import AntiHallucinationValidator
from ..llm import LLMClient
from ..models import (
    MAX_EDUCATION_ENTRIES,
    MAX_EXPERIENCE_ENTRIES,
    MAX_PROJECT_ENTRIES,
    DesignKnobs,
    Entry,
    Fact,
    JobSpec,
    LangCode,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
    RenderSkillGroup,
    ThemeName,
)
from .llm_curator import (
    adapt_bullets_with_llm,
    curate_profile_with_llm,
    harmonize_resume,
)
from .scoring import (
    _score_fact_relevance,
    select_deterministic_entries,
    select_skills,
)


class TailorEngine:
    """Core engine to adapt a Master Profile to a specific JobSpec."""

    def __init__(
        self,
        profile: Profile,
        client: LLMClient | None = None,
    ) -> None:
        self.profile = profile
        self.client = client or LLMClient()
        self.validator = AntiHallucinationValidator(profile)

    def _select_skills(
        self,
        target_lang: LangCode,
        keywords_lower: set[str],
        archetype: str | None,
    ) -> list[RenderSkillGroup]:
        """Prioritize and group candidate skills matching the target role."""
        return select_skills(self.profile.skills, target_lang, keywords_lower, archetype)

    def _curate_profile_with_llm(
        self,
        job_spec: JobSpec,
        target_lang: LangCode,
    ) -> dict[str, list[str]] | None:
        """Call LLM once as an elite recruiter to curate entries and facts for the target role.

        Returns a dictionary mapping selected `entry_id` to chosen `fact_ids`, or None on fallback.
        """
        return curate_profile_with_llm(self.client, self.profile, job_spec, target_lang)

    def _select_entries(
        self,
        kind: str,
        max_count: int,
        keywords_lower: set[str],
        archetype: str | None,
    ) -> list[Entry]:
        """Select top relevant entries for a section up to the ATS slot maximum."""
        return select_deterministic_entries(
            self.profile.entries,
            kind=kind,
            max_count=max_count,
            keywords_lower=keywords_lower,
            archetype=archetype,
        )

    def _adapt_bullets_with_llm(
        self,
        entry: Entry,
        selected_facts: list[Fact],
        job_spec: JobSpec,
        target_lang: LangCode,
    ) -> list[RenderBullet]:
        """Use LLM to rewrite selected bullets with action verbs while retaining exact truth."""
        return adapt_bullets_with_llm(
            self.client,
            self.validator,
            entry,
            selected_facts,
            job_spec,
            target_lang,
            self._build_deterministic_bullets,
        )

    def _build_deterministic_bullets(
        self,
        selected_facts: list[Fact],
        keywords_lower: set[str],
    ) -> list[RenderBullet]:
        """Build bullets deterministically without LLM."""
        return [
            RenderBullet(
                text=f.text,
                fact_ids=[f.id],
                skill_ids=list(f.skill_ids),
                priority=f.weight,
                pinned=f.pinned,
                position=f.position,
            )
            for f in selected_facts
        ]

    def tailor(
        self,
        job_spec: JobSpec,
        *,
        theme: ThemeName = "classic",
        lang: LangCode | None = None,
        use_llm: bool = True,
    ) -> RenderModel:
        """Tailor the Master Profile to the specified JobSpec."""
        target_lang: LangCode = lang or job_spec.lang or self.profile.default_lang
        font_family = "Liberation Serif" if theme == "engineering" else "Liberation Sans"
        design = DesignKnobs.from_density(0.0, font_family=font_family)
        keywords_lower = {kw.lower() for kw in job_spec.keywords}
        archetype = job_spec.archetype

        # 1. Skills
        skill_groups = self._select_skills(target_lang, keywords_lower, archetype)

        # 2. Entries selection (LLM curation with fallback to deterministic selection)
        curated_map: dict[str, list[str]] | None = None
        if use_llm and self.client.is_configured:
            curated_map = self._curate_profile_with_llm(job_spec, target_lang)

        if curated_map is not None:
            entries_by_id = {e.id: e for e in self.profile.entries if not e.archived}
            exp_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "experience"
            ][:MAX_EXPERIENCE_ENTRIES]
            proj_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "project"
            ][:MAX_PROJECT_ENTRIES]
            edu_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "education"
            ][:MAX_EDUCATION_ENTRIES]
        else:
            exp_entries = self._select_entries(
                "experience", MAX_EXPERIENCE_ENTRIES, keywords_lower, archetype
            )
            proj_entries = self._select_entries(
                "project", MAX_PROJECT_ENTRIES, keywords_lower, archetype
            )
            edu_entries = self._select_entries(
                "education", MAX_EDUCATION_ENTRIES, keywords_lower, archetype
            )

        def process_section(entries: list[Entry]) -> list[RenderEntry]:
            rendered_entries: list[RenderEntry] = []
            for entry in entries:
                selected_title = entry.select_title(archetype=archetype)
                approved_facts = [f for f in entry.facts if f.approved]
                facts_map = {f.id: f for f in approved_facts}

                # Check if curated by LLM
                curated_fids = curated_map.get(entry.id) if curated_map else None
                if curated_fids:
                    chosen_facts = [facts_map[fid] for fid in curated_fids if fid in facts_map]
                else:
                    chosen_facts = []

                if not chosen_facts:
                    # Rank facts by relevance
                    scored_facts = [
                        (_score_fact_relevance(f, keywords_lower, archetype), f)
                        for f in approved_facts
                    ]
                    scored_facts.sort(key=lambda item: (-item[0], item[1].position))
                    facts = [f for _, f in scored_facts]

                    # Respect entry slot limits
                    target_count = min(len(facts), entry.max_bullets or 4)
                    target_count = max(target_count, entry.min_bullets)
                    chosen_facts = facts[:target_count]

                if use_llm and self.client.is_configured:
                    bullets = self._adapt_bullets_with_llm(
                        entry, chosen_facts, job_spec, target_lang
                    )
                else:
                    bullets = self._build_deterministic_bullets(chosen_facts, keywords_lower)

                if entry.kind in {"experience", "project"} and not bullets:
                    # Skip empty entries without bullets to avoid leaving isolated titles
                    continue

                rendered_entries.append(
                    RenderEntry(
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
                )
            return rendered_entries

        experience = process_section(exp_entries)
        projects = process_section(proj_entries)
        education = process_section(edu_entries)

        summary_text = self.profile.summary

        return RenderModel(
            schema_version="1.0.0",
            theme=theme,
            lang=target_lang,
            full_name=self.profile.full_name,
            contact=self.profile.contact,
            summary=summary_text,
            skills=skill_groups,
            experience=experience,
            projects=projects,
            education=education,
            design=design,
        )

    def harmonize_resume(
        self,
        model: RenderModel,
        job_spec: JobSpec,
    ) -> RenderModel:
        """Single editorial consistency pass over a physically fitted 1-page skeleton."""
        return harmonize_resume(self.client, self.validator, model, job_spec)

"""Scoring and deterministic ranking helpers for entries, facts, and skills."""

from __future__ import annotations

from ..extractor import matches_archetype
from ..models import Entry, Fact, LangCode, RenderSkillGroup, Skill


def _score_fact_relevance(fact: Fact, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate matching score between a Fact and target job requirements."""
    score = fact.weight
    if fact.pinned:
        score += 50
    if fact.default_selected:
        score += 20
    if archetype and matches_archetype(archetype, fact.tags):
        score += 35

    fact_text_lower = fact.text.lower()
    for kw in keywords_lower:
        if kw in fact_text_lower:
            score += 25
        if any(kw in sk.lower() for sk in fact.skill_ids):
            score += 30
    return score


def _score_entry_affinity(entry: Entry, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate target relevance (keywords + archetype) excluding base position/default weights."""
    affinity = 0
    if archetype and matches_archetype(archetype, entry.archetypes):
        affinity += 40

    for fact in entry.facts:
        if not fact.approved:
            continue
        f_text_low = fact.text.lower()
        for kw in keywords_lower:
            if kw in f_text_low or any(kw in sk.lower() for sk in fact.skill_ids):
                affinity += 15
    return affinity


def _score_entry_relevance(entry: Entry, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate matching score between an Entry and target job requirements."""
    # Base position score: education positions are often 10..20, so use gentle decay
    score = entry.position * -2
    score += _score_entry_affinity(entry, keywords_lower, archetype)
    if entry.default_selected:
        score += 15

    for fact in entry.facts:
        if not fact.approved:
            continue
        score += _score_fact_relevance(fact, keywords_lower, archetype) // 10
    return score


def select_skills(
    skills_pool: list[Skill],
    target_lang: LangCode,
    keywords_lower: set[str],
    archetype: str | None,
) -> list[RenderSkillGroup]:
    """Prioritize and group candidate skills matching the target role."""
    grouped: dict[str, list[tuple[int, Skill]]] = {}

    for sk in skills_pool:
        if not sk.approved:
            continue
        score = 0
        sk_name_low = sk.name.lower()
        if sk_name_low in keywords_lower:
            score += 50
        if any(alias.lower() in keywords_lower for alias in sk.aliases):
            score += 40
        if archetype and archetype in sk.tags:
            score += 20

        cat = sk.category_label()
        grouped.setdefault(cat, []).append((score, sk))

    skill_groups: list[RenderSkillGroup] = []
    for cat, scored_skills in grouped.items():
        # Sort skills by score descending, then by name
        scored_skills.sort(key=lambda item: (-item[0], item[1].name))
        skills = [s for _, s in scored_skills]
        skill_groups.append(
            RenderSkillGroup(
                category=cat,
                items=", ".join(s.display_label() for s in skills),
                skill_ids=[s.id for s in skills],
            )
        )
    return skill_groups


def select_deterministic_entries(
    entries_pool: list[Entry],
    kind: str,
    max_count: int,
    keywords_lower: set[str],
    archetype: str | None,
) -> list[Entry]:
    """Select top relevant entries for a section up to the ATS slot maximum."""
    candidates = [e for e in entries_pool if e.kind == kind and not e.archived]
    if not candidates:
        return []

    scored = []
    for e in candidates:
        aff = _score_entry_affinity(e, keywords_lower, archetype)
        rel = _score_entry_relevance(e, keywords_lower, archetype)
        scored.append((rel, aff, e))

    scored.sort(key=lambda item: (-item[0], item[2].position))

    # Pre-detect if candidate has higher education (university/college/institute)
    higher_education_ids: set[str] = set()
    if kind == "education":
        for e in candidates:
            is_secondary = any(
                term in (e.org + " " + e.select_title().title).lower()
                for term in [
                    "secundario",
                    "secundaria",
                    "bachiller",
                    "bachillerato",
                    "polimodal",
                    "high school",
                ]
            )
            if not is_secondary:
                higher_education_ids.add(e.id)

    selected: list[Entry] = []

    for _, aff, entry in scored:
        if len(selected) >= max_count:
            break

        # Section-specific rules
        if kind == "education":
            is_secondary = any(
                term in (entry.org + " " + entry.select_title().title).lower()
                for term in [
                    "secundario",
                    "secundaria",
                    "bachiller",
                    "bachillerato",
                    "polimodal",
                    "high school",
                ]
            )
            # If the candidate has university education, do not include secondary school
            # unless secondary school has positive keyword affinity for the job
            if is_secondary and higher_education_ids and aff <= 0:
                continue

        elif kind == "project":
            # Projects require positive affinity or archetype match; do not force irrelevant projects
            archetype_match = bool(
                archetype and matches_archetype(archetype, entry.archetypes)
            )
            if aff <= 0 and not (entry.default_selected and archetype_match):
                continue

        elif kind == "experience":
            # The first entry can be the top relevant/default entry.
            # Additional entries (slot 2 and 3) require affinity > 0 or default + archetype
            if len(selected) >= 1:
                archetype_match = bool(
                    archetype and matches_archetype(archetype, entry.archetypes)
                )
                if aff <= 0 and not (entry.default_selected and archetype_match):
                    continue

        selected.append(entry)

    # Safety floor for experience: if nothing matched at all, provide the top base entry
    if not selected and scored and kind == "experience":
        selected.append(scored[0][2])

    return selected

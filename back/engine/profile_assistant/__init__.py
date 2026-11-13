"""AI-assisted profile enrichment: context distillation, title archetypes, and skills."""

from __future__ import annotations

from back.engine.profile_assistant.deterministic import (
    _detect_missing_skills_deterministic,
    _distill_context_deterministic,
    _is_forbidden_project_title,
    _polish_fact_deterministic,
    _suggest_titles_deterministic,
    _suggest_titles_for_experience,
    _suggest_titles_for_project,
    normalize_contact_link,
)
from back.engine.profile_assistant.llm_enhancer import (
    _enhance_with_llm,
    clean_and_deduplicate_profile,
    enhance_profile,
)
from back.engine.profile_assistant.taxonomies import (
    CANONICAL_SKILL_MAP,
    FIRST_PERSON_REWRITES_EN,
    FIRST_PERSON_REWRITES_ES,
    FORBIDDEN_PROJECT_TITLE_PATTERN,
    SKILL_CATEGORY_MAP,
    EnhanceProfileResponse,
    EnhanceStats,
    _allowed_tech_tokens,
    _is_valid_rewrite,
    _known_skill_tokens,
    _normalize_skill_token,
    _short_id,
)

__all__ = [
    "CANONICAL_SKILL_MAP",
    "EnhanceProfileResponse",
    "EnhanceStats",
    "FIRST_PERSON_REWRITES_EN",
    "FIRST_PERSON_REWRITES_ES",
    "FORBIDDEN_PROJECT_TITLE_PATTERN",
    "SKILL_CATEGORY_MAP",
    "_allowed_tech_tokens",
    "_detect_missing_skills_deterministic",
    "_distill_context_deterministic",
    "_enhance_with_llm",
    "_is_forbidden_project_title",
    "_is_valid_rewrite",
    "_known_skill_tokens",
    "_normalize_skill_token",
    "_polish_fact_deterministic",
    "_short_id",
    "_suggest_titles_deterministic",
    "_suggest_titles_for_experience",
    "_suggest_titles_for_project",
    "clean_and_deduplicate_profile",
    "enhance_profile",
    "normalize_contact_link",
]

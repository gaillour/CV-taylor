"""Invariant extraction, curation, and formatting rules shared across LLM prompts."""

from __future__ import annotations

SHARED_PROJECT_AND_ENTRY_RULES: str = (
    "PROJECT & ENTRY STRUCTURE INVARIANTS:\n"
    "- For `kind=\"project\"`, `title` MUST be the proper name of the project, product, "
    "system, or artifact (e.g., \"CV Tailor — Motor de Adaptación de CVs\", "
    "\"Simulador de Físicas 2D\").\n"
    "- FORBIDDEN: NEVER use a generic job title or role as the `title` of a project "
    "(e.g., \"Desarrollador Backend\", \"Software Engineer\", \"Full Stack Developer\").\n"
    "- If the CV mentions a role performed within the project, place it in `role` "
    "(or `null` if none).\n"
    "- If there is a company, university, or client associated with the project, "
    "place it in `org` (if none, use `\"\"` or `null`).\n"
    "- For `kind=\"experience\"`, `title` is the job role/position and `org` is the company."
)

SHARED_DATE_RULES: str = (
    "DATE FORMATTING INVARIANTS:\n"
    "- Use ISO format `YYYY-MM` or `YYYY`.\n"
    "- FORBIDDEN: NEVER generate date ranges where start date equals end date "
    "(e.g., `2026 - 2026`).\n"
    "- If an event occurred in a single year/month or has no explicit end date and does NOT "
    "explicitly state \"Presente\", \"Actualidad\", or \"Present\", `end_date` MUST be `null` "
    "(NEVER invent \"Presente\" when not in the CV)."
)

SHARED_LINK_RULES: str = (
    "LINK & CONTACT NORMALIZATION INVARIANTS:\n"
    "- `github`: ALWAYS normalize as `github.com/<username>` "
    "(never a bare username like `\"gaillour\"`).\n"
    "- `linkedin`: ALWAYS normalize as `linkedin.com/in/<handle>`.\n"
    "- `website` and entry `link`: ALWAYS format as a clean domain/path without protocol "
    "(e.g., `ejemplo.com/proyecto` or `github.com/user/repo`, without `https://` or `http://`)."
)

SHARED_BULLET_RULES: str = (
    "BULLET & ACCOMPLISHMENT INVARIANTS:\n"
    "- No `experience` or `project` entry may be left with 0 bullets (`bullets: []`) if "
    "descriptive text or a paragraph exists in the CV.\n"
    "- Break down descriptive paragraphs into at least 2 atomic accomplishment/impact bullets "
    "(or 1 bullet if there is only a single short sentence), without inventing facts "
    "outside the original text."
)

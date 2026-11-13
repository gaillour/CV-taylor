"""PDF and raw text importer for CV Tailor."""

from __future__ import annotations

from back.engine.importer.merger import (
    _is_duplicate_fact,
    _norm_key,
    _sort_and_reindex_entries,
    merge_profiles,
)
from back.engine.importer.pdf_extractor import (
    _detect_two_columns,
    _extract_page_spans,
    _reconstruct_text_block,
    extract_text_from_pdf,
)
from back.engine.importer.text_parser import (
    MAX_RESUME_CHARS,
    MONTH_MAP,
    SYSTEM_PROMPT,
    _build_profile_from_dict,
    _entry_sort_key,
    _normalize_date_token,
    _normalize_entry_kind,
    _parse_profile_heuristic,
    _slugify,
    parse_profile_from_text,
)

__all__ = [
    "MAX_RESUME_CHARS",
    "MONTH_MAP",
    "SYSTEM_PROMPT",
    "_build_profile_from_dict",
    "_detect_two_columns",
    "_entry_sort_key",
    "_extract_page_spans",
    "_is_duplicate_fact",
    "_norm_key",
    "_normalize_date_token",
    "_normalize_entry_kind",
    "_parse_profile_heuristic",
    "_reconstruct_text_block",
    "_slugify",
    "_sort_and_reindex_entries",
    "extract_text_from_pdf",
    "merge_profiles",
    "parse_profile_from_text",
]

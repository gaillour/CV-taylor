"""Deterministic 1-page A4 fit engine: ATS slot enforcement, bullet pruning, stable typography."""

from .content_shaper import (
    SECTION_NAMES,
    SECTION_PRUNE_RANK,
    _augment_from_profile,
    _enforce_section_entry_slots,
    _exceeds_section_slots,
    _PrunedBulletRecord,
    _remove_bullet,
    _select_next_prune_candidate,
    _try_reinsert_bullet,
)
from .density_search import (
    DEFAULT_DENSITY_STEPS,
    MAX_COMPILATION_BUDGET,
    MAX_SAFE_FILL_PCT,
    MIN_ACCEPTABLE_DENSITY,
    _binary_search_relaxed_underfill,
    _finalize_report,
    _with_density,
    _with_relaxed,
    binary_search_density_overflow,
    binary_search_density_underfill,
)
from .orchestrator import fit_render_model

__all__ = [
    "fit_render_model",
    "binary_search_density_overflow",
    "binary_search_density_underfill",
    "MAX_COMPILATION_BUDGET",
    "MIN_ACCEPTABLE_DENSITY",
    "DEFAULT_DENSITY_STEPS",
    "MAX_SAFE_FILL_PCT",
    "SECTION_NAMES",
    "SECTION_PRUNE_RANK",
    "_PrunedBulletRecord",
    "_with_density",
    "_with_relaxed",
    "_finalize_report",
    "_exceeds_section_slots",
    "_enforce_section_entry_slots",
    "_binary_search_relaxed_underfill",
    "_select_next_prune_candidate",
    "_remove_bullet",
    "_try_reinsert_bullet",
    "_augment_from_profile",
]

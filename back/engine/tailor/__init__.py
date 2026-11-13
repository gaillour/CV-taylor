"""Tailoring engine package: intelligent profile adaptation, bullet rewriting, and ATS alignment."""

from .engine import TailorEngine
from .scoring import (
    _score_entry_affinity,
    _score_entry_relevance,
    _score_fact_relevance,
)

__all__ = [
    "TailorEngine",
    "_score_entry_affinity",
    "_score_entry_relevance",
    "_score_fact_relevance",
]

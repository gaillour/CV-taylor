"""CV Tailor core rendering, fit, and validation engine."""

from .anti_hallucination import AntiHallucinationValidator, ValidationReport, Violation
from .ats import ATSChecker, ATSReport, check_ats_compliance
from .extractor import extract_job_spec, extract_job_spec_heuristic, fetch_url_text
from .feedback_loop import TailoringPipeline, TailorPipelineResult
from .fit import (
    binary_search_density_overflow,
    binary_search_density_underfill,
    fit_render_model,
)
from .importer import extract_text_from_pdf, parse_profile_from_text
from .llm import LLMClient, LLMConfig
from .models import (
    MAX_COMFORTABLE_DENSITY,
    MAX_EDUCATION_ENTRIES,
    MAX_EXPERIENCE_ENTRIES,
    MAX_PROJECT_ENTRIES,
    SECTION_MAX_ENTRIES,
    ContactInfo,
    DesignKnobs,
    Entry,
    EntryTitle,
    Fact,
    FitReport,
    JobSpec,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
    RenderSkillGroup,
    Skill,
    ThemeName,
)
from .renderer import RenderResult, measure_fit, render_cv
from .snapshot import Snapshot
from .tailor import TailorEngine

__version__ = "0.1.0"

__all__ = [
    "MAX_COMFORTABLE_DENSITY",
    "MAX_EDUCATION_ENTRIES",
    "MAX_EXPERIENCE_ENTRIES",
    "MAX_PROJECT_ENTRIES",
    "SECTION_MAX_ENTRIES",
    "ContactInfo",
    "DesignKnobs",
    "Entry",
    "EntryTitle",
    "Fact",
    "FitReport",
    "JobSpec",
    "Profile",
    "RenderBullet",
    "RenderEntry",
    "RenderModel",
    "RenderResult",
    "RenderSkillGroup",
    "Skill",
    "ThemeName",
    "__version__",
    "binary_search_density_overflow",
    "binary_search_density_underfill",
    "fit_render_model",
    "measure_fit",
    "render_cv",
    "ATSChecker",
    "ATSReport",
    "check_ats_compliance",
    "LLMConfig",
    "LLMClient",
    "AntiHallucinationValidator",
    "ValidationReport",
    "Violation",
    "Snapshot",
    "extract_job_spec",
    "extract_job_spec_heuristic",
    "extract_text_from_pdf",
    "fetch_url_text",
    "parse_profile_from_text",
    "TailorEngine",
    "TailoringPipeline",
    "TailorPipelineResult",
]

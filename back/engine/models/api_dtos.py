"""HTTP API DTOs for anonymous sessions, previews, and tailor quotas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from back.engine.models.profile import LangCode, Profile
from back.engine.models.render import FitReport, RenderModel, ThemeName


class AnonymousParseResponse(BaseModel):
    """Structured profile extracted from uploaded PDF/TXT for an anonymous session."""

    model_config = ConfigDict(extra="forbid")

    profile: Profile
    source_lang: str = Field(default="auto", description="Source language option used")
    detected_lang: LangCode = Field(description="Language detected in source document")
    render_model: RenderModel | None = None


class AnonymousFromProfileRequest(BaseModel):
    """Payload to build a canonical RenderModel from a Profile for anonymous sessions."""

    model_config = ConfigDict(extra="forbid")

    profile: Profile
    theme: ThemeName = "classic"


class AnonymousPreviewRequest(BaseModel):
    """Payload for anonymous preview compilation."""

    model_config = ConfigDict(extra="forbid")

    render_model: RenderModel


class AnonymousPreviewResponse(BaseModel):
    """Rendered SVG and telemetry for anonymous preview."""

    model_config = ConfigDict(extra="forbid")

    svg: str
    fit_report: FitReport
    render_model: RenderModel


class AnonymousExportPdfRequest(BaseModel):
    """Payload for anonymous binary PDF compilation."""

    model_config = ConfigDict(extra="forbid")

    render_model: RenderModel
    role: str | None = Field(default=None, description="Target role override for filename")


class TailorQuotaResponse(BaseModel):
    """Usage quota status for AI tailor adaptations."""

    model_config = ConfigDict(extra="forbid")

    used_count: int = Field(ge=0, description="Number of AI adaptations performed")
    limit: int = Field(default=2, description="Max free AI adaptations allowed")
    has_active_pass: bool = Field(default=False, description="Whether user holds an active pass")
    can_tailor: bool = Field(description="Whether account is eligible for adaptation")


class QuotaExceededErrorResponse(BaseModel):
    """Standardized payload emitted when an account exhausts its free adaptation allowance."""

    model_config = ConfigDict(extra="forbid")

    code: Literal["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED"
    detail: str = Field(default="Límite de adaptaciones gratuitas alcanzado. Requiere Pase.")
    used_count: int = Field(ge=0)
    limit: int = Field(default=2)

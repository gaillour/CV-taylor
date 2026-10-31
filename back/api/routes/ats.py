"""ATS reactive evaluation routes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from back.engine.ats.checker import ATSChecker
from back.engine.models import RenderModel

router = APIRouter()


class ATSBreakdown(BaseModel):
    structure: int
    experience: int
    education: int
    skills: int


class ATSEvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    render_model: RenderModel
    target_keywords: list[str] | None = None


class ATSEvaluateResponse(BaseModel):
    total_score: int
    structure_score: int
    experience_score: int
    education_score: int
    skills_score: int
    breakdown: ATSBreakdown
    passed: bool
    issues: list[str] = Field(default_factory=list)
    keyword_matches: list[str] = Field(default_factory=list)
    keyword_gaps: list[str] = Field(default_factory=list)


@router.post("/evaluate", response_model=ATSEvaluateResponse)
def evaluate_ats(payload: ATSEvaluateRequest) -> ATSEvaluateResponse:
    """
    Evalúa compatibilidad ATS directamente sobre el RenderModel en memoria.
    No compila Typst ni genera PDF (<5ms).
    """
    checker = ATSChecker()
    report = checker.evaluate_render_model(
        payload.render_model,
        target_keywords=payload.target_keywords,
    )
    return ATSEvaluateResponse(
        total_score=report.total_score,
        structure_score=report.structure_score,
        experience_score=report.experience_score,
        education_score=report.education_score,
        skills_score=report.skills_score,
        breakdown=ATSBreakdown(
            structure=report.structure_score,
            experience=report.experience_score,
            education=report.education_score,
            skills=report.skills_score,
        ),
        passed=report.passed,
        issues=report.issues,
        keyword_matches=report.keyword_matches,
        keyword_gaps=report.keyword_gaps,
    )

"""Tailoring and job offer adaptation API routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from back.api.auth import UserContext, get_current_user
from back.engine import (
    FitReport,
    JobSpec,
    LLMClient,
    Profile,
    RenderModel,
    TailoringPipeline,
    extract_job_spec,
)
from back.engine.mirror import build_mirror, resolve_profile
from back.engine.models import (
    LangCode,
    QuotaExceededErrorResponse,
    TailorQuotaResponse,
    ThemeName,
)
from back.engine.storage import StorageRepository, get_repo_for_user
from back.engine.translator import LLMTranslator

router = APIRouter()


@router.get("/quota", response_model=TailorQuotaResponse)
def get_tailor_quota(
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
    _user: Annotated[UserContext, Depends(get_current_user)],
) -> TailorQuotaResponse:
    """Check AI tailor quota usage and pass eligibility."""
    return repo.get_tailor_quota()


class TailorRequest(BaseModel):
    """Payload for tailoring a CV against a job posting."""

    offer_text: str = Field(..., min_length=10, description="Raw text of the job posting")
    theme: ThemeName = Field(default="classic", description="Target visual theme")
    lang: LangCode | None = Field(
        default=None,
        description="Target language. Defaults to detected language from offer.",
    )
    no_llm: bool = Field(
        default=False,
        description="If True, runs deterministic heuristic tailoring without external LLM calls.",
    )
    profile: Profile | None = Field(
        default=None,
        description="Candidate master profile. Defaults to active master profile.",
    )


class TailorResponse(BaseModel):
    """Result of tailoring pipeline including adapted model, SVG preview, and ATS feedback."""

    render_model: RenderModel
    svg: str
    fit_report: FitReport
    job_spec: JobSpec
    ats_score: int
    ats_passed: bool
    keyword_matches: list[str]
    keyword_gaps: list[str]
    ats_issues: list[str]
    validation_valid: bool
    checked_bullets: int
    iterations_performed: int


@router.post(
    "",
    response_model=TailorResponse,
    responses={402: {"model": QuotaExceededErrorResponse}},
)
def tailor_cv(
    payload: TailorRequest,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
    _user: Annotated[UserContext, Depends(get_current_user)],
) -> TailorResponse | JSONResponse:
    """Adapt candidate profile to job offer with ATS feedback loop and 1-page fit."""
    quota = repo.get_tailor_quota()
    if not quota.can_tailor:
        return JSONResponse(
            status_code=402,
            content=QuotaExceededErrorResponse(
                code="QUOTA_EXCEEDED",
                detail="Límite de adaptaciones gratuitas alcanzado. Requiere Pase.",
                used_count=quota.used_count,
                limit=quota.limit,
            ).model_dump(mode="json"),
        )

    try:
        # 1. Configure LLM client if requested
        llm_client: LLMClient | None = None
        if not payload.no_llm:
            client_candidate = LLMClient()
            if client_candidate.is_configured:
                llm_client = client_candidate

        # 2. Extract JobSpec from offer text
        job_spec = extract_job_spec(payload.offer_text, client=llm_client)
        if payload.lang is not None:
            job_spec = job_spec.model_copy(update={"lang": payload.lang})

        target_lang = payload.lang or job_spec.lang
        translator = LLMTranslator(llm_client) if llm_client else None

        # 3. Resolve master profile (base or derived mirror for target_lang)
        if payload.profile is not None:
            base_lang = payload.profile.base_lang
            if target_lang == base_lang:
                active_profile = payload.profile
            else:
                mirror_doc, _ = build_mirror(payload.profile, repo.get_mirror(), translator)
                active_profile = mirror_doc.profile
        else:
            base_lang = repo.get_profile().base_lang
            active_profile = resolve_profile(repo, target_lang, translator=translator)

        # 4. Run tailoring pipeline with Typst compilation
        pipeline = TailoringPipeline(
            active_profile,
            client=llm_client,
            is_translated=(target_lang != base_lang),
        )
        result = pipeline.run(
            job_spec,
            theme=payload.theme,
            lang=target_lang,
            use_llm=(llm_client is not None),
            include_svg=True,
        )

        svg = result.svg_content or ""
        ats = result.ats_report

        repo.increment_tailor_usage()

        return TailorResponse(
            render_model=result.render_model,
            svg=svg,
            fit_report=result.fit_report,
            job_spec=job_spec,
            ats_score=ats.total_score,
            ats_passed=ats.passed,
            keyword_matches=ats.keyword_matches,
            keyword_gaps=ats.keyword_gaps,
            ats_issues=ats.issues,
            validation_valid=result.validation_report.is_valid,
            checked_bullets=result.validation_report.checked_bullets,
            iterations_performed=result.iterations_performed,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

"""Rendering and real-time preview routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from back.engine.models import DesignKnobs, FitReport, RenderModel
from back.engine.renderer import render_cv
from back.engine.storage import StorageRepository, get_repo_for_user

router = APIRouter()


class PreviewRequest(BaseModel):
    """Payload for real-time Typst preview."""

    render_model: RenderModel | None = Field(
        default=None,
        description="RenderModel to compile to SVG. Defaults to active master profile.",
    )


class PreviewResponse(BaseModel):
    """Rendered Typst preview response containing SVG and fit telemetry."""

    svg: str
    fit_report: FitReport
    render_model: RenderModel


@router.post("/preview", response_model=PreviewResponse)
def preview_cv(
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
    payload: PreviewRequest | None = None,
) -> PreviewResponse:
    """Render a RenderModel (or default profile) to SVG with fit telemetry."""
    try:
        if payload is not None and payload.render_model is not None:
            active_model = payload.render_model
        else:
            profile = repo.get_profile()
            active_model = RenderModel.from_profile(
                profile, theme="classic", lang=profile.base_lang
            )

        # Ensure physical typography matches the requested density
        active_model.design = DesignKnobs.from_density(
            active_model.design.density,
            font_family=active_model.design.font_family,
        )

        # Compile to SVG without forcing auto-fit so user sees exact current state
        render_result = render_cv(
            active_model,
            include_svg=True,
            enforce_fit=False,
        )

        svg_str = ""
        if render_result.svg_pages:
            svg_str = render_result.svg_pages[0].decode("utf-8", errors="replace")

        return PreviewResponse(
            svg=svg_str,
            fit_report=render_result.fit_report,
            render_model=active_model,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

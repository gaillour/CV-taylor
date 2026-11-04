"""Export routes for PDF compilation and snapshot persistence."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from back.api.auth import UserContext, get_current_user
from back.engine.models import DesignKnobs, JobSpec, RenderModel
from back.engine.renderer import render_cv
from back.engine.snapshot import Snapshot
from back.engine.storage import StorageRepository, get_repo_for_user

router = APIRouter()

SNAPSHOTS_DIR = Path("out/snapshots")
SNAPSHOT_ID_PATTERN = r"^snap_[0-9a-f]{12}$"


def sanitize_filename_part(text: str) -> str:
    """Normalize and sanitize a text string for cross-platform file names."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ASCII", "ignore").decode("ascii")
    cleaned = re.sub(r"[^\w]+", "_", ascii_text.strip())
    return cleaned.strip("_")


def generate_cv_filename(render_model: RenderModel, job_role: str | None = None) -> str:
    """Generate a recruiter-friendly file name such as CV_Juan_Perez_Backend_Engineer.pdf."""
    parts = ["CV"]
    name = sanitize_filename_part(render_model.full_name)
    if name:
        parts.append(name)

    role_raw = job_role
    if not role_raw and render_model.experience:
        role_raw = render_model.experience[0].title

    if role_raw:
        role = sanitize_filename_part(role_raw)
        if role:
            parts.append(role)

    return f"{'_'.join(parts)}.pdf"


class ExportPdfRequest(BaseModel):
    """Payload for compiling and downloading a PDF."""

    render_model: RenderModel
    role: str | None = Field(default=None, description="Optional target role override for filename")


class ExportSnapshotRequest(BaseModel):
    """Payload for saving an immutable snapshot to disk or cloud."""

    render_model: RenderModel
    job_spec: JobSpec | None = None
    ats_score: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    parent_id: str | None = Field(
        default=None,
        pattern=SNAPSHOT_ID_PATTERN,
        description="Snapshot this version was forked from",
    )


class ExportSnapshotResponse(BaseModel):
    """Result of snapshot persistence."""

    id: str
    created_at: str
    pdf_sha256: str
    path: str
    snapshot: Snapshot


@router.post("/pdf")
def export_pdf(
    payload: ExportPdfRequest,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
    _user: Annotated[UserContext, Depends(get_current_user)],
) -> Response:
    """Compile RenderModel to binary PDF with WYSIWYG fidelity and trigger attachment download."""
    try:
        model = payload.render_model
        prof = repo.get_profile()
        if not getattr(model, "photo_path", None) and prof.contact.photo_url:
            model.photo_path = prof.contact.photo_url
        if not getattr(model.contact, "photo_url", None) and prof.contact.photo_url:
            model.contact.photo_url = prof.contact.photo_url

        # Ensure design matches density parameters
        model.design = DesignKnobs.from_density(
            model.design.density,
            font_family=model.design.font_family,
        )

        # Compile PDF strictly WYSIWYG
        render_result = render_cv(
            model,
            include_svg=False,
            enforce_fit=False,
        )

        filename = generate_cv_filename(model, payload.role)

        return Response(
            content=render_result.pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Pdf-Sha256": render_result.pdf_sha256,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/snapshot", response_model=ExportSnapshotResponse)
def export_snapshot(
    payload: ExportSnapshotRequest,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> ExportSnapshotResponse:
    """Persist an immutable snapshot via the active StorageRepository."""
    if payload.parent_id:
        try:
            repo.get_snapshot(payload.parent_id)
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=404, detail=f"Parent snapshot not found: {payload.parent_id}"
            ) from exc

    try:
        model = payload.render_model
        prof = repo.get_profile()
        if not getattr(model, "photo_path", None) and prof.contact.photo_url:
            model.photo_path = prof.contact.photo_url
        if not getattr(model.contact, "photo_url", None) and prof.contact.photo_url:
            model.contact.photo_url = prof.contact.photo_url

        model.design = DesignKnobs.from_density(
            model.design.density,
            font_family=model.design.font_family,
        )

        # Compile to obtain the immutable SHA256 and PDF binary
        render_result = render_cv(
            model,
            include_svg=False,
            enforce_fit=False,
        )

        snapshot = Snapshot.create(
            job_spec=payload.job_spec,
            render_model=model,
            pdf_sha256=render_result.pdf_sha256,
            ats_score=payload.ats_score,
            metadata=payload.metadata,
            parent_id=payload.parent_id,
        )

        out_path = repo.save_snapshot(snapshot, pdf_bytes=render_result.pdf_bytes)

        return ExportSnapshotResponse(
            id=snapshot.id,
            created_at=snapshot.created_at,
            pdf_sha256=snapshot.pdf_sha256,
            path=str(out_path),
            snapshot=snapshot,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

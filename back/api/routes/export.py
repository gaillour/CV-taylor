"""Export routes for PDF compilation and snapshot persistence."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from back.engine.models import DesignKnobs, JobSpec, RenderModel
from back.engine.renderer import render_cv
from back.engine.snapshot import Snapshot

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
    """Payload for saving an immutable snapshot to disk."""

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
def export_pdf(payload: ExportPdfRequest) -> Response:
    """Compile RenderModel to binary PDF with WYSIWYG fidelity and trigger attachment download."""
    try:
        model = payload.render_model

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
def export_snapshot(payload: ExportSnapshotRequest) -> ExportSnapshotResponse:
    """Persist an immutable snapshot JSON file in out/snapshots/<id>.json."""
    if payload.parent_id and not (SNAPSHOTS_DIR / f"{payload.parent_id}.json").is_file():
        raise HTTPException(
            status_code=404, detail=f"Parent snapshot not found: {payload.parent_id}"
        )

    try:
        model = payload.render_model
        model.design = DesignKnobs.from_density(
            model.design.density,
            font_family=model.design.font_family,
        )

        # Compile to obtain the immutable SHA256 of the exact PDF
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

        SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
        out_file = SNAPSHOTS_DIR / f"{snapshot.id}.json"
        snapshot.save(out_file)

        return ExportSnapshotResponse(
            id=snapshot.id,
            created_at=snapshot.created_at,
            pdf_sha256=snapshot.pdf_sha256,
            path=str(out_file),
            snapshot=snapshot,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

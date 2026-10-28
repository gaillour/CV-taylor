"""Read-only routes for browsing immutable snapshots."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError

from back.api.routes import export as export_routes
from back.engine.snapshot import Snapshot

router = APIRouter()


class SnapshotSummary(BaseModel):
    """Lightweight snapshot listing entry for the gallery."""

    id: str
    created_at: str
    parent_id: str | None = None
    company: str | None = None
    role: str | None = None
    lang: str
    theme: str
    ats_score: float | None = None
    pdf_sha256: str
    full_name: str


@router.get("", response_model=list[SnapshotSummary])
def list_snapshots() -> list[SnapshotSummary]:
    """List all persisted snapshots, newest first. Corrupt files are skipped."""
    snapshots_dir = export_routes.SNAPSHOTS_DIR
    if not snapshots_dir.is_dir():
        return []

    summaries: list[SnapshotSummary] = []
    for path in snapshots_dir.glob("snap_*.json"):
        try:
            snap = Snapshot.load(path)
        except (OSError, ValidationError, ValueError):
            continue
        summaries.append(
            SnapshotSummary(
                id=snap.id,
                created_at=snap.created_at,
                parent_id=snap.parent_id,
                company=snap.company,
                role=snap.role,
                lang=snap.lang,
                theme=snap.theme,
                ats_score=snap.ats_score,
                pdf_sha256=snap.pdf_sha256,
                full_name=snap.render_model.full_name,
            )
        )

    summaries.sort(key=lambda s: s.created_at, reverse=True)
    return summaries


@router.get("/{snapshot_id}", response_model=Snapshot)
def get_snapshot(snapshot_id: str) -> Snapshot:
    """Return a full snapshot by id."""
    if not re.match(export_routes.SNAPSHOT_ID_PATTERN, snapshot_id):
        raise HTTPException(status_code=400, detail="Invalid snapshot id")

    path = export_routes.SNAPSHOTS_DIR / f"{snapshot_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Snapshot not found: {snapshot_id}")
    return Snapshot.load(path)

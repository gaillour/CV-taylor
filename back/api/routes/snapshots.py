"""Read-only and soft-deletion routes for browsing immutable snapshots."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from back.api.routes import export as export_routes
from back.engine.snapshot import Snapshot
from back.engine.storage import StorageRepository, get_repo_for_user

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
    deleted_at: str | None = None


class SoftDeleteSnapshotResponse(BaseModel):
    """Confirmation payload for snapshot soft deletion."""

    id: str
    deleted_at: str


@router.get("", response_model=list[SnapshotSummary])
def list_snapshots(
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> list[SnapshotSummary]:
    """List all persisted snapshots, newest first. Deleted and corrupt records are skipped."""
    snapshots = repo.list_snapshots(include_deleted=False)
    return [
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
            deleted_at=snap.deleted_at,
        )
        for snap in snapshots
    ]


@router.get("/{snapshot_id}", response_model=Snapshot)
def get_snapshot(
    snapshot_id: str,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> Snapshot:
    """Return a full snapshot by id."""
    if not re.match(export_routes.SNAPSHOT_ID_PATTERN, snapshot_id):
        raise HTTPException(status_code=400, detail="Invalid snapshot id")

    try:
        return repo.get_snapshot(snapshot_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Snapshot not found: {snapshot_id}"
        ) from exc


@router.delete("/{snapshot_id}", response_model=SoftDeleteSnapshotResponse)
def delete_snapshot(
    snapshot_id: str,
    repo: Annotated[StorageRepository, Depends(get_repo_for_user)],
) -> SoftDeleteSnapshotResponse:
    """Soft delete a snapshot by ID while preserving physical immutability."""
    if not re.match(export_routes.SNAPSHOT_ID_PATTERN, snapshot_id):
        raise HTTPException(status_code=400, detail="Invalid snapshot id")

    try:
        deleted_at = repo.soft_delete_snapshot(snapshot_id)
        return SoftDeleteSnapshotResponse(id=snapshot_id, deleted_at=deleted_at)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=f"Snapshot not found: {snapshot_id}"
        ) from exc

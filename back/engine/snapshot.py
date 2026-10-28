"""Immutable snapshot storage for tailored CVs and audit trail."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import JobSpec, RenderModel


class Snapshot(BaseModel):
    """Immutable record of a tailored CV generation."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: f"snap_{uuid.uuid4().hex[:12]}")
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    parent_id: str | None = None
    company: str | None = None
    role: str | None = None
    lang: str = "es"
    theme: str = "classic"
    pdf_sha256: str
    ats_score: float | None = None
    job_spec: JobSpec | None = None
    render_model: RenderModel
    metadata: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def create(
        cls,
        *,
        job_spec: JobSpec | None = None,
        render_model: RenderModel,
        pdf_sha256: str,
        ats_score: float | None = None,
        metadata: dict[str, Any] | None = None,
        parent_id: str | None = None,
    ) -> Snapshot:
        """Create a new immutable snapshot from a tailored run or manual base edit."""
        return cls(
            parent_id=parent_id,
            company=job_spec.company if job_spec else None,
            role=job_spec.role if job_spec else None,
            lang=render_model.lang,
            theme=render_model.theme,
            pdf_sha256=pdf_sha256,
            ats_score=ats_score,
            job_spec=job_spec,
            render_model=render_model,
            metadata=metadata or {},
        )

    def save(self, path: Path | str) -> None:
        """Persist snapshot to a JSON file."""
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(self.model_dump_json(indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path | str) -> Snapshot:
        """Load snapshot from a JSON file."""
        raw = Path(path).read_text(encoding="utf-8")
        return cls.model_validate_json(raw)

"""Tests for export API routes (PDF compilation and immutable snapshots)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import JobSpec, Profile, RenderModel
from back.engine.snapshot import Snapshot

client = TestClient(app)


def _load_sample_model() -> RenderModel:
    sample_path = Path("fixtures/profile_juan.json")
    profile = Profile.model_validate(json.loads(sample_path.read_text(encoding="utf-8")))
    return RenderModel.from_profile(profile, theme="classic", lang="es")


def test_export_pdf_stream() -> None:
    model = _load_sample_model()
    response = client.post(
        "/api/export/pdf",
        json={"render_model": model.model_dump(mode="json")},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert "CV_Juan_Ignacio_Gaillour" in response.headers["content-disposition"]
    assert "X-Pdf-Sha256" in response.headers

    # Validate PDF binary magic number
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 1000


def test_export_pdf_role_override() -> None:
    model = _load_sample_model()
    response = client.post(
        "/api/export/pdf",
        json={
            "render_model": model.model_dump(mode="json"),
            "role": "Senior Backend Developer",
        },
    )

    assert response.status_code == 200
    disp = response.headers["content-disposition"]
    assert "Senior_Backend_Developer" in disp


def test_export_snapshot_base_model(tmp_path: Path, monkeypatch) -> None:
    snapshots_dir = tmp_path / "snapshots"
    monkeypatch.setattr("back.api.routes.export.SNAPSHOTS_DIR", snapshots_dir)

    model = _load_sample_model()
    payload = {
        "render_model": model.model_dump(mode="json"),
    }

    response = client.post("/api/export/snapshot", json=payload)
    assert response.status_code == 200
    data = response.json()

    snap_id = data["id"]
    assert snap_id.startswith("snap_")
    assert data["pdf_sha256"]
    assert Path(data["path"]).is_file()

    # Verify loaded snapshot
    loaded = Snapshot.load(data["path"])
    assert loaded.id == snap_id
    assert loaded.render_model.full_name == "Juan Ignacio Gaillour"
    assert loaded.job_spec is None
    assert loaded.ats_score is None


def test_export_snapshot_with_job_spec(tmp_path: Path, monkeypatch) -> None:
    snapshots_dir = tmp_path / "snapshots"
    monkeypatch.setattr("back.api.routes.export.SNAPSHOTS_DIR", snapshots_dir)

    model = _load_sample_model()
    job_spec = JobSpec(
        company="MercadoLibre",
        role="Staff Engineer",
        raw_text="Oferta técnica...",
        keywords=["Python", "FastAPI"],
    )

    payload = {
        "render_model": model.model_dump(mode="json"),
        "job_spec": job_spec.model_dump(mode="json"),
        "ats_score": 92.5,
        "metadata": {"source": "web_ui"},
    }

    response = client.post("/api/export/snapshot", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert Path(data["path"]).is_file()
    loaded = Snapshot.load(data["path"])
    assert loaded.company == "MercadoLibre"
    assert loaded.role == "Staff Engineer"
    assert loaded.ats_score == 92.5
    assert loaded.metadata == {"source": "web_ui"}

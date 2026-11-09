"""Tests for anonymous onboarding routes (parsing, preview, PDF rendering, rate limiting)."""

from __future__ import annotations

import io
from pathlib import Path

from fastapi.testclient import TestClient

from back.api.main import app
from back.api.routes.anonymous import anonymous_rate_limiter
from back.engine.models import Profile, RenderModel

client = TestClient(app)
FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def setup_function() -> None:
    """Reset rate limiter state before each test."""
    anonymous_rate_limiter.reset()


def test_anonymous_parse_txt_success() -> None:
    sample_text = (
        "Juan Perez\n"
        "juan@example.com | Buenos Aires, Argentina\n"
        "Desarrollador Backend con 5 años de experiencia en Python y FastAPI.\n"
        "EXPERIENCIA:\n"
        "Senior Backend Developer en Tech Corp (2020 - Actualidad)\n"
        "- Diseñé arquitecturas escalables basadas en microservicios.\n"
    )
    files = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
    res = client.post("/api/anonymous/parse", files=files, data={"source_lang": "es"})
    assert res.status_code == 200
    data = res.json()

    assert "profile" in data
    assert "detected_lang" in data
    assert data["source_lang"] == "es"
    assert data["detected_lang"] in ("es", "en")


def test_anonymous_parse_unsupported_format() -> None:
    files = {"file": ("image.png", b"\x89PNG\r\n\x1a\n", "image/png")}
    res = client.post("/api/anonymous/parse", files=files)
    assert res.status_code == 400
    assert "Formato de archivo no soportado" in res.json()["detail"]


def test_anonymous_parse_empty_file() -> None:
    files = {"file": ("empty.txt", b"", "text/plain")}
    res = client.post("/api/anonymous/parse", files=files)
    assert res.status_code == 400
    assert "vacío" in res.json()["detail"]


def test_anonymous_parse_rate_limiting() -> None:
    sample_text = "Jane Doe\njane@example.com\nPython Developer\n"
    headers = {"X-Forwarded-For": "203.0.113.195"}

    for _ in range(3):
        files = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
        res = client.post("/api/anonymous/parse", files=files, headers=headers)
        assert res.status_code == 200

    # 4th request must be blocked with HTTP 429
    files = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
    res_blocked = client.post("/api/anonymous/parse", files=files, headers=headers)
    assert res_blocked.status_code == 429
    detail = res_blocked.json()["detail"]
    assert "Límite de 3 parseos" in detail

    # Another IP can still parse
    other_headers = {"X-Forwarded-For": "198.51.100.42"}
    files_other = {"file": ("cv.txt", sample_text.encode("utf-8"), "text/plain")}
    res_other = client.post("/api/anonymous/parse", files=files_other, headers=other_headers)
    assert res_other.status_code == 200


def test_anonymous_preview_and_pdf() -> None:
    profile_path = FIXTURES_DIR / "profile_juan.json"
    profile = Profile.model_validate_json(profile_path.read_text(encoding="utf-8"))
    render_model = RenderModel.from_profile(profile, theme="classic", lang="es")

    # Preview
    preview_res = client.post(
        "/api/anonymous/preview",
        json={"render_model": render_model.model_dump(mode="json")},
    )
    assert preview_res.status_code == 200
    data = preview_res.json()
    assert "svg" in data
    assert data["svg"].startswith("<svg")
    assert "fit_report" in data

    # PDF download
    pdf_res = client.post(
        "/api/anonymous/pdf",
        json={"render_model": render_model.model_dump(mode="json"), "role": "Backend Engineer"},
    )
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_res.headers["content-disposition"]
    assert pdf_res.content.startswith(b"%PDF")

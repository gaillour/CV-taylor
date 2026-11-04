"""Tests for Phase F6: Avatar / Photo support and the 5 new visual Typst templates."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import get_args

import pytest
from fastapi.testclient import TestClient

from back.api.main import app
from back.engine.models import (
    ContactInfo,
    Profile,
    RenderModel,
    ThemeName,
)
from back.engine.renderer import render_cv
from back.engine.storage import LocalStorageRepository

ALL_THEMES: list[ThemeName] = [
    "classic",
    "modern",
    "engineering",
    "basic",
    "kire",
    "yuan",
    "modern-cv",
    "vercanard",
    "impressive-impression",
    "modern-resume",
    "metronic",
]

# Valid 1x1 transparent PNG bytes
TINY_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _sample_profile() -> Profile:
    return Profile.from_json("fixtures/profile_ficticio_tecnico.json")


def test_theme_name_literal_contains_all_11_themes() -> None:
    literal_themes = set(get_args(ThemeName))
    assert set(ALL_THEMES) == literal_themes


def test_contact_info_photo_url() -> None:
    contact = ContactInfo(
        email="dev@example.com",
        phone="+54 11 0000-0000",
        location="Buenos Aires, Argentina",
        photo_url="/api/avatars/abc123.jpg",
    )
    assert contact.photo_url == "/api/avatars/abc123.jpg"

    # Default is None
    contact_no_photo = ContactInfo(
        email="dev@example.com",
        phone="+54 11 0000-0000",
        location="Buenos Aires, Argentina",
    )
    assert contact_no_photo.photo_url is None


def test_render_model_inherits_photo_path_from_profile() -> None:
    profile = _sample_profile()
    profile.contact.photo_url = "/api/avatars/test_hash.png"

    model = RenderModel.from_profile(profile, theme="modern-cv")
    assert model.photo_path == "/api/avatars/test_hash.png"
    assert model.contact.photo_url == "/api/avatars/test_hash.png"


@pytest.mark.parametrize("theme", ALL_THEMES)
def test_all_11_themes_compile_cleanly_without_photo(theme: ThemeName, tmp_path: Path) -> None:
    profile = _sample_profile()
    profile.contact.photo_url = None

    model = RenderModel.from_profile(profile, theme=theme)
    out_pdf = tmp_path / f"cv_{theme}_no_photo.pdf"
    result = render_cv(model, output_pdf=out_pdf, enforce_fit=False)

    assert result.pdf_sha256
    assert out_pdf.is_file()
    assert out_pdf.stat().st_size > 0
    assert result.fit_report.pages >= 1


@pytest.mark.parametrize(
    "theme",
    ["modern-cv", "vercanard", "impressive-impression", "modern-resume", "metronic"],
)
def test_visual_themes_compile_with_avatar_image(theme: ThemeName, tmp_path: Path) -> None:
    avatar_file = Path("out/avatars/test_f6_avatar.png")
    avatar_file.parent.mkdir(parents=True, exist_ok=True)
    avatar_file.write_bytes(TINY_PNG_BYTES)

    try:
        profile = _sample_profile()
        profile.contact.photo_url = f"/api/avatars/{avatar_file.name}"

        model = RenderModel.from_profile(profile, theme=theme)
        out_pdf = tmp_path / f"cv_{theme}_with_photo.pdf"
        result = render_cv(model, output_pdf=out_pdf, enforce_fit=False)

        assert result.pdf_sha256
        assert out_pdf.is_file()
        assert out_pdf.stat().st_size > 0
    finally:
        if avatar_file.exists():
            avatar_file.unlink()


def test_local_storage_avatar_lifecycle(tmp_path: Path) -> None:
    repo = LocalStorageRepository()
    saved_url = repo.save_avatar(TINY_PNG_BYTES, extension="png")
    assert saved_url.startswith("/api/avatars/")
    filename = saved_url.split("/")[-1]

    target_file = Path("out/avatars") / filename
    assert target_file.is_file()
    assert target_file.read_bytes() == TINY_PNG_BYTES

    # Clean up test artifact
    target_file.unlink()


def test_api_avatar_upload_and_delete() -> None:
    client = TestClient(app)

    # 1. Upload valid avatar
    upload_res = client.post(
        "/api/profile/avatar",
        files={"file": ("my_avatar.png", TINY_PNG_BYTES, "image/png")},
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert "photo_url" in data
    photo_url = data["photo_url"]
    assert photo_url.startswith("/api/avatars/")

    # 2. Verify file is served via GET /api/avatars/{filename}
    filename = photo_url.split("/")[-1]
    get_res = client.get(f"/api/avatars/{filename}")
    assert get_res.status_code == 200
    assert get_res.content == TINY_PNG_BYTES

    # 3. Verify profile now has photo_url
    prof_res = client.get("/api/profile")
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert prof_data["contact"]["photo_url"] == photo_url

    # 4. Delete avatar
    del_res = client.delete("/api/profile/avatar")
    assert del_res.status_code == 200
    assert del_res.json() == {"deleted": True}

    # 5. Verify profile photo_url is cleared
    prof_res_after = client.get("/api/profile")
    assert prof_res_after.status_code == 200
    assert prof_res_after.json()["contact"]["photo_url"] is None

    # Clean up file
    avatar_path = Path("out/avatars") / filename
    if avatar_path.exists():
        avatar_path.unlink()


def test_api_avatar_rejects_invalid_file_type() -> None:
    client = TestClient(app)
    res = client.post(
        "/api/profile/avatar",
        files={"file": ("doc.pdf", b"%PDF-1.4...", "application/pdf")},
    )
    assert res.status_code == 400
    assert "Formato no soportado" in res.json()["detail"]


def test_api_avatar_rejects_oversized_file() -> None:
    client = TestClient(app)
    huge_bytes = b"0" * (2 * 1024 * 1024 + 100)
    res = client.post(
        "/api/profile/avatar",
        files={"file": ("huge.jpg", huge_bytes, "image/jpeg")},
    )
    assert res.status_code == 400
    assert "excede el tamaño máximo" in res.json()["detail"]

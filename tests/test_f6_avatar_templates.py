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


@pytest.mark.parametrize("theme", ALL_THEMES)
def test_all_11_themes_disable_hyphenation(theme: ThemeName) -> None:
    template_file = Path("back/engine/templates") / f"{theme}.typ"
    assert template_file.is_file()
    content = template_file.read_text(encoding="utf-8")
    assert "hyphenate: false" in content


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


@pytest.mark.parametrize("theme", ALL_THEMES)
def test_project_entries_optional_org_and_role_render_without_orphan_separators(
    theme: ThemeName,
    tmp_path: Path,
) -> None:
    import shutil
    import subprocess

    from back.engine.models import Entry, EntryTitle, Fact

    profile = _sample_profile()
    profile.contact.photo_url = None
    profile.entries = [
        Entry(
            kind="project",
            id="p1",
            org="",
            role=None,
            start_date="2024",
            titles=[
                EntryTitle(id="t_p1", title="SoloProjectAlpha", is_default=True, approved=True)
            ],
            facts=[
                Fact(
                    id="f_p1",
                    text="Arquitectura distribuida en Rust.",
                    default_selected=True,
                    approved=True,
                )
            ],
        ),
        Entry(
            kind="project",
            id="p2",
            org="FIUBA",
            role="Autor",
            start_date="2025",
            titles=[
                EntryTitle(id="t_p2", title="AcademicCompilerBeta", is_default=True, approved=True)
            ],
            facts=[
                Fact(
                    id="f_p2",
                    text="Compilador optimizado con LLVM.",
                    default_selected=True,
                    approved=True,
                )
            ],
        ),
    ]

    model = RenderModel.from_profile(profile, theme=theme, include_all=True)
    assert len(model.projects) == 2
    assert model.projects[0].title == "SoloProjectAlpha"
    assert model.projects[0].org == ""
    assert model.projects[0].role is None
    assert model.projects[1].title == "AcademicCompilerBeta"
    assert model.projects[1].org == "FIUBA"
    assert model.projects[1].role == "Autor"

    out_pdf = tmp_path / f"proj_{theme}.pdf"
    result = render_cv(model, output_pdf=out_pdf, enforce_fit=False)
    assert result.pdf_sha256
    assert out_pdf.is_file()

    if shutil.which("pdftotext"):
        proc = subprocess.run(
            ["pdftotext", str(out_pdf), "-"],
            capture_output=True,
            text=True,
            check=True,
        )
        extracted = proc.stdout
        assert "SoloProjectAlpha" in extracted
        assert "SoloProjectAlpha —" not in extracted
        assert "SoloProjectAlpha |  |" not in extracted
        assert "AcademicCompilerBeta — Autor | FIUBA" in extracted


@pytest.mark.parametrize("theme", ALL_THEMES)
def test_all_11_themes_normalize_and_render_clean_links(
    theme: ThemeName,
    tmp_path: Path,
) -> None:
    import shutil
    import subprocess

    from back.engine.models import RenderBullet, RenderEntry

    profile = _sample_profile()
    model = RenderModel.from_profile(profile, theme=theme)
    model.contact.github = "https://github.com/gaillour/"
    model.contact.linkedin = "https://www.linkedin.com/in/juan/"
    model.contact.website = "https://ejemplo.com/"
    model.projects = [
        RenderEntry(
            entry_id="proj_link_test",
            title="CV Tailor",
            org="",
            role=None,
            date_label="2026",
            link="https://github.com/gaillour/cv-tailor",
            bullets=[RenderBullet(text="Motor determinístico en Typst.")],
        )
    ]

    out_pdf = tmp_path / f"links_{theme}.pdf"
    result = render_cv(model, output_pdf=out_pdf, enforce_fit=False)
    assert result.pdf_sha256
    assert out_pdf.is_file()

    if shutil.which("pdftotext"):
        proc = subprocess.run(
            ["pdftotext", str(out_pdf), "-"],
            capture_output=True,
            text=True,
            check=True,
        )
        extracted = proc.stdout
        assert "github.com/gaillour" in extracted
        assert "linkedin.com/in/juan" in extracted
        assert "ejemplo.com" in extracted
        assert "github.com/gaillour/cv-tailor" in extracted
        assert "https://https://" not in extracted
        assert "https://github.com" not in extracted
        assert "https://www.linkedin.com" not in extracted


def test_render_model_from_profile_normalizes_links() -> None:
    from back.engine.models import Entry, EntryTitle, Fact

    profile = _sample_profile()
    profile.contact.github = "gaillour"
    profile.contact.linkedin = "juan"
    profile.contact.website = "https://www.ejemplo.com/"
    profile.entries = [
        Entry(
            kind="project",
            id="p_norm",
            org="",
            role=None,
            start_date="2026",
            link="https://github.com/gaillour/cv-tailor/",
            titles=[EntryTitle(id="t_norm", title="CV Tailor", is_default=True, approved=True)],
            facts=[Fact(id="f_norm", text="Normalización.", default_selected=True, approved=True)],
        )
    ]

    model = RenderModel.from_profile(profile, include_all=True)
    assert model.contact.github == "github.com/gaillour"
    assert model.contact.linkedin == "linkedin.com/in/juan"
    assert model.contact.website == "ejemplo.com"
    assert model.projects[0].link == "github.com/gaillour/cv-tailor"

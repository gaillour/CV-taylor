"""Deterministic Typst renderer and fit report measurement engine."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import typst
from pydantic import BaseModel, ConfigDict, Field

from .models import FitReport, Profile, RenderModel, ThemeName

ENGINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = ENGINE_DIR.parent.parent
FONTS_DIR = ENGINE_DIR / "fonts"
TEMPLATES_DIR = ENGINE_DIR / "templates"

A4_HEIGHT_PT: float = 297.0 / 25.4 * 72.0
CM_TO_PT: float = 10.0 / 25.4 * 72.0
UNDERFILL_THRESHOLD_PCT: float = 85.0


class RenderResult(BaseModel):
    """Output bundle from a deterministic Typst compilation."""

    model_config = ConfigDict(extra="forbid")

    pdf_bytes: bytes
    pdf_sha256: str
    svg_pages: list[bytes] = Field(default_factory=list)
    fit_report: FitReport
    render_model: RenderModel


def get_template_path(theme: ThemeName) -> Path:
    """Resolve the Typst template file path for a given theme."""
    path = TEMPLATES_DIR / f"{theme}.typ"
    if not path.is_file():
        raise FileNotFoundError(f"Template not found for theme '{theme}': {path}")
    return path


def _parse_pt(raw_length: str | float | int) -> float:
    """Parse a Typst length string like '735.12pt' into float points."""
    if isinstance(raw_length, (int, float)):
        return float(raw_length)
    cleaned = raw_length.strip()
    if cleaned.endswith("pt"):
        cleaned = cleaned[:-2]
    return float(cleaned)


def _resolve_photo_path(photo_url: str | None) -> str | None:
    """Resolve an avatar URL/path to a repository-relative path accessible by Typst."""
    if not photo_url:
        return None

    # Local file already in out/avatars/ by name (e.g. /api/avatars/x, out/avatars/x, or just filename)
    clean_name = Path(photo_url.split("?")[0]).name
    candidate = REPO_ROOT / "out" / "avatars" / clean_name
    if candidate.is_file():
        return f"/out/avatars/{clean_name}"

    # Local API endpoint: /api/avatars/xxxx.jpg -> /out/avatars/xxxx.jpg
    if "/api/avatars/" in photo_url:
        filename = photo_url.split("/api/avatars/")[-1].split("?")[0]
        local_file = REPO_ROOT / "out" / "avatars" / filename
        if local_file.is_file():
            return f"/out/avatars/{filename}"

    # Already rooted /out/avatars/...
    if photo_url.startswith("/out/avatars/"):
        return photo_url

    # Supabase or external HTTP URL
    if photo_url.startswith(("http://", "https://")):
        try:
            import httpx

            filename = photo_url.split("/")[-1].split("?")[0]
            cache_file = REPO_ROOT / "out" / "avatars" / filename
            if not cache_file.is_file():
                cache_file.parent.mkdir(parents=True, exist_ok=True)
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(photo_url)
                    if resp.status_code == 200:
                        cache_file.write_bytes(resp.content)
            if cache_file.is_file():
                return f"/out/avatars/{filename}"
        except Exception:
            return None
    return None


def _create_compiler(render_model: RenderModel) -> typst.Compiler:
    """Instantiate a sandboxed Typst compiler with vendored fonts only."""
    template_path = get_template_path(render_model.theme)
    model_dict = render_model.model_dump(mode="json")

    # Resolve photo path for Typst if present
    raw_photo = render_model.photo_path or (
        render_model.contact.photo_url if render_model.contact else None
    )
    resolved_photo = _resolve_photo_path(raw_photo)
    model_dict["photo_path"] = resolved_photo

    # Filter unselected entries and bullets for Typst rendering
    for section in ("experience", "projects", "education"):
        filtered_entries = []
        for entry in model_dict.get(section, []):
            if not entry.get("selected", True):
                continue
            entry["bullets"] = [b for b in entry.get("bullets", []) if b.get("selected", True)]
            filtered_entries.append(entry)
        model_dict[section] = filtered_entries

    payload_json = json.dumps(
        model_dict,
        ensure_ascii=False,
        sort_keys=True,
    )
    return typst.Compiler(
        input=template_path,
        root=REPO_ROOT,
        font_paths=[FONTS_DIR],
        ignore_system_fonts=True,
        sys_inputs={"data": payload_json},
    )


def _extract_fit_report(compiler: typst.Compiler, render_model: RenderModel) -> FitReport:
    """Evaluate <pages> and <end> markers to compute page count and vertical fill."""
    raw_eval = compiler.eval(
        "(pages: query(<pages>).first().value, end: query(<end>).first().value)",
        format="json",
    )
    parsed = json.loads(raw_eval)
    pages = int(parsed["pages"])
    end_info = parsed["end"]
    end_page = int(end_info["page"])
    end_y_pt = round(_parse_pt(end_info["y"]), 2)

    margin_y_pt = render_model.design.margin_y_cm * CM_TO_PT
    usable_height_pt = round(A4_HEIGHT_PT - (2.0 * margin_y_pt), 2)
    used_y_pt = max(0.0, end_y_pt - margin_y_pt)

    single_page_ratio = used_y_pt / usable_height_pt
    if end_page <= 1:
        fill_ratio = round(single_page_ratio, 4)
    else:
        fill_ratio = round((end_page - 1) + single_page_ratio, 4)

    fill_pct = round(fill_ratio * 100.0, 2)
    fits_one_page = pages == 1 and fill_pct <= 100.0

    return FitReport(
        pages=pages,
        end_page=end_page,
        end_y_pt=end_y_pt,
        usable_height_pt=usable_height_pt,
        fill_ratio=fill_ratio,
        fill_pct=fill_pct,
        fits_one_page=fits_one_page,
        underfilled=fits_one_page and fill_pct < UNDERFILL_THRESHOLD_PCT,
        density=render_model.design.density,
    )


def measure_fit(render_model: RenderModel) -> FitReport:
    """Measure pages and vertical fill ratio without serializing PDF bytes."""
    compiler = _create_compiler(render_model)
    return _extract_fit_report(compiler, render_model)


def render_cv(
    render_model: RenderModel,
    *,
    output_pdf: str | Path | None = None,
    include_svg: bool = False,
    enforce_fit: bool = True,
    candidate_pool: Profile | None = None,
) -> RenderResult:
    """Compile a RenderModel into a deterministic PDF (and optional SVG) + FitReport."""
    if enforce_fit:
        from .fit import fit_render_model

        active_model, fit_report = fit_render_model(
            render_model,
            candidate_pool=candidate_pool,
        )
        compiler = _create_compiler(active_model)
    else:
        active_model = render_model
        compiler = _create_compiler(active_model)
        fit_report = _extract_fit_report(compiler, active_model)

    compiled_pdf = compiler.compile(format="pdf", timestamp=0)
    if not isinstance(compiled_pdf, bytes):
        raise RuntimeError("Unexpected PDF output type from typst compiler.")

    pdf_sha256 = hashlib.sha256(compiled_pdf).hexdigest()

    if output_pdf is not None:
        out_path = Path(output_pdf)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(compiled_pdf)

    svg_pages: list[bytes] = []
    if include_svg:
        compiled_svg = compiler.compile(format="svg")
        if isinstance(compiled_svg, bytes):
            svg_pages = [compiled_svg]
        elif isinstance(compiled_svg, list):
            svg_pages = list(compiled_svg)

    return RenderResult(
        pdf_bytes=compiled_pdf,
        pdf_sha256=pdf_sha256,
        svg_pages=svg_pages,
        fit_report=fit_report,
        render_model=active_model,
    )

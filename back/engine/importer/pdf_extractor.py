"""PyMuPDF/pypdf extraction with two-column detection and layout preservation."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from pypdf import PdfReader


def _extract_page_spans(page: Any) -> list[dict[str, float | str]]:
    """Extract positioned text fragments from a PDF page using visitor_text."""
    spans: list[dict[str, float | str]] = []

    def visitor(
        text: str,
        cm: list[float],
        tm: list[float],
        font_dict: dict[str, Any] | None,
        font_size: float | None,
    ) -> None:
        if not text:
            return
        x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
        y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
        fs = abs(font_size or 10.0)
        approx_w = len(text) * fs * 0.55
        spans.append(
            {
                "text": text,
                "x0": x,
                "x1": x + approx_w,
                "y": y,
                "fs": fs,
            }
        )

    try:
        page.extract_text(visitor_text=visitor)
    except Exception:
        return []

    return spans


def _reconstruct_text_block(spans: list[dict[str, float | str]]) -> str:
    """Group spans into horizontal lines and return newline-joined text."""
    clean_spans = [s for s in spans if str(s["text"]).strip()]
    if not clean_spans:
        return ""

    clean_spans.sort(key=lambda s: -float(s["y"]))

    lines: list[list[dict[str, float | str]]] = []
    curr_line: list[dict[str, float | str]] = []
    curr_y: float | None = None

    for s in clean_spans:
        sy = float(s["y"])
        if curr_y is None or abs(sy - curr_y) < 3.5:
            curr_line.append(s)
            curr_y = sy if curr_y is None else (curr_y + sy) / 2
        else:
            lines.append(curr_line)
            curr_line = [s]
            curr_y = sy

    if curr_line:
        lines.append(curr_line)

    rendered_lines: list[str] = []
    for line in lines:
        line.sort(key=lambda s: float(s["x0"]))
        parts: list[str] = []
        for i, s in enumerate(line):
            text_val = str(s["text"])
            if i > 0:
                prev_x1 = float(line[i - 1]["x1"])
                curr_x0 = float(s["x0"])
                has_space = parts[-1].endswith(" ") or text_val.startswith(" ")
                if curr_x0 - prev_x1 > 2.0 and not has_space:
                    parts.append(" ")
            parts.append(text_val)

        merged_line = " ".join("".join(parts).split())
        if merged_line:
            rendered_lines.append(merged_line)

    return "\n".join(rendered_lines)


def _detect_two_columns(
    spans: list[dict[str, float | str]],
    page_width: float,
) -> tuple[float, float, float] | None:
    """Detect if spans form a 2-column layout."""
    clean_spans = [s for s in spans if str(s["text"]).strip()]
    if len(clean_spans) < 6:
        return None

    best_gutter: tuple[float, float, float] | None = None
    max_overlap = 0.0

    start_x = int(page_width * 0.20)
    end_x = int(page_width * 0.80)

    for x_cut in range(start_x, end_x, 5):
        f_cut = float(x_cut)
        left = [s for s in clean_spans if float(s["x1"]) <= f_cut + 5.0]
        right = [s for s in clean_spans if float(s["x0"]) >= f_cut - 5.0]
        crossing = [s for s in clean_spans if float(s["x0"]) < f_cut < float(s["x1"])]

        if len(left) < 3 or len(right) < 3:
            continue

        min_y_l, max_y_l = min(float(s["y"]) for s in left), max(float(s["y"]) for s in left)
        min_y_r, max_y_r = min(float(s["y"]) for s in right), max(float(s["y"]) for s in right)

        overlap_top = min(max_y_l, max_y_r)
        overlap_bot = max(min_y_l, min_y_r)
        overlap_y = overlap_top - overlap_bot

        crossings_in_overlap = [s for s in crossing if overlap_bot <= float(s["y"]) <= overlap_top]
        left_in_zone = [s for s in left if overlap_bot <= float(s["y"]) <= overlap_top]
        right_in_zone = [s for s in right if overlap_bot <= float(s["y"]) <= overlap_top]

        if (
            overlap_y >= 60.0
            and len(crossings_in_overlap) == 0
            and len(left_in_zone) >= 3
            and len(right_in_zone) >= 3
        ):
            if overlap_y > max_overlap:
                max_overlap = overlap_y
                best_gutter = (f_cut, overlap_bot, overlap_top)

    return best_gutter


def extract_text_from_pdf(path_or_bytes: Path | str | bytes) -> str:
    """Extract plain text from a PDF, supporting 1-column and 2-column layouts."""
    if isinstance(path_or_bytes, (str, Path)):
        p = Path(path_or_bytes)
        if not p.is_file():
            raise FileNotFoundError(f"PDF file not found: {p}")
        reader = PdfReader(str(p))
    elif isinstance(path_or_bytes, bytes):
        reader = PdfReader(io.BytesIO(path_or_bytes))
    else:
        raise TypeError(f"Expected Path, str or bytes, got {type(path_or_bytes).__name__}")

    pages_text: list[str] = []

    for page in reader.pages:
        page_width = float(page.mediabox.width)
        spans = _extract_page_spans(page)

        if not spans:
            plain = page.extract_text(extraction_mode="layout") or page.extract_text() or ""
            if plain.strip():
                pages_text.append(plain.strip())
            continue

        gutter = _detect_two_columns(spans, page_width)

        if gutter is None:
            page_content = _reconstruct_text_block(spans)
        else:
            x_split, overlap_bot, overlap_top = gutter

            header_spans = [s for s in spans if float(s["y"]) > overlap_top]
            left_col = [
                s
                for s in spans
                if overlap_bot <= float(s["y"]) <= overlap_top and float(s["x1"]) <= x_split + 5.0
            ]
            right_col = [
                s
                for s in spans
                if overlap_bot <= float(s["y"]) <= overlap_top and float(s["x0"]) >= x_split - 5.0
            ]
            footer_spans = [s for s in spans if float(s["y"]) < overlap_bot]

            blocks: list[str] = []
            header_txt = _reconstruct_text_block(header_spans)
            if header_txt:
                blocks.append(header_txt)

            left_txt = _reconstruct_text_block(left_col)
            if left_txt:
                blocks.append(left_txt)

            right_txt = _reconstruct_text_block(right_col)
            if right_txt:
                blocks.append(right_txt)

            footer_txt = _reconstruct_text_block(footer_spans)
            if footer_txt:
                blocks.append(footer_txt)

            page_content = "\n\n".join(blocks)

        if page_content.strip():
            pages_text.append(page_content.strip())

    return "\n\n".join(pages_text)

"""PDF and raw text importer for CV Tailor.

Extracts plain text from 1-column and 2-column PDF documents and normalizes
content for structured profile parsing with LLM assistance and heuristic fallback.
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from .extractor import COMMON_TECH_KEYWORDS, detect_language
from .llm import LLMClient
from .models import (
    ContactInfo,
    DatePrecision,
    Entry,
    EntryKind,
    EntryTitle,
    Fact,
    LangCode,
    Profile,
    Skill,
)

MONTH_MAP: dict[str, str] = {
    "enero": "01",
    "ene": "01",
    "january": "01",
    "jan": "01",
    "febrero": "02",
    "feb": "02",
    "february": "02",
    "marzo": "03",
    "mar": "03",
    "march": "03",
    "abril": "04",
    "abr": "04",
    "april": "04",
    "apr": "04",
    "mayo": "05",
    "may": "05",
    "junio": "06",
    "jun": "06",
    "june": "06",
    "julio": "07",
    "jul": "07",
    "july": "07",
    "agosto": "08",
    "ago": "08",
    "august": "08",
    "aug": "08",
    "septiembre": "09",
    "sep": "09",
    "sept": "09",
    "september": "09",
    "octubre": "10",
    "oct": "10",
    "october": "10",
    "noviembre": "11",
    "nov": "11",
    "november": "11",
    "diciembre": "12",
    "dic": "12",
    "december": "12",
    "dec": "12",
}

SYSTEM_PROMPT = """You are an expert ATS curriculum vitae parser.
Extract the candidate's profile into structured JSON matching this exact schema:
{
  "full_name": "Full Name",
  "default_lang": "es" or "en",
  "summary": "Professional summary or null",
  "contact": {
    "email": "candidate email",
    "phone": "candidate phone",
    "location": "City, Country",
    "github": "github username or URL or null",
    "linkedin": "linkedin username or URL or null",
    "website": "portfolio or website URL or null"
  },
  "skills": [
    {
      "name": "Skill Name",
      "category": "Category name (e.g. Lenguajes, Backend, Frontend, Cloud & DevOps, Herramientas)",
      "level": "Avanzado / Intermedio / null"
    }
  ],
  "entries": [
    {
      "kind": "experience" | "projects" | "education",
      "org": "Organization, Company, Institution, or Project name",
      "title": "Role title or degree obtained",
      "location": "Location or Remote or null",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or YYYY or Presente or null",
      "bullets": [
        "Measurable accomplishment or atomic fact..."
      ]
    }
  ]
}
Return ONLY valid JSON without markdown wrapping or commentary."""


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


def _slugify(val: str, prefix: str = "", max_len: int = 24) -> str:
    """Generate clean alphanumeric snake_case identifier."""
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", val.strip().lower()).strip("_")
    slug = cleaned[:max_len].strip("_") or "item"
    return f"{prefix}{slug}" if prefix else slug


def _normalize_date_token(token: str | None, lang: LangCode = "es") -> tuple[str, DatePrecision]:
    """Normalize raw date expression into ISO format (YYYY-MM or YYYY) or Present/Presente."""
    if not token or not str(token).strip():
        return ("Present" if lang == "en" else "Presente"), "month"

    cleaned = str(token).strip()
    low = cleaned.lower()
    if low in {"presente", "present", "actual", "current", "hoy", "now"}:
        return ("Present" if lang == "en" else "Presente"), "month"

    m_iso = re.search(r"\b(19\d\d|20\d\d)-(0[1-9]|1[0-2])\b", cleaned)
    if m_iso:
        return f"{m_iso.group(1)}-{m_iso.group(2)}", "month"

    m_slash = re.search(r"\b(0?[1-9]|1[0-2])/((?:19|20)\d\d)\b", cleaned)
    if m_slash:
        return f"{m_slash.group(2)}-{m_slash.group(1).zfill(2)}", "month"

    m_year = re.search(r"\b(19\d\d|20\d\d)\b", cleaned)
    if m_year:
        year = m_year.group(1)
        for name, m_num in MONTH_MAP.items():
            if re.search(r"\b" + re.escape(name) + r"\b", low):
                return f"{year}-{m_num}", "month"
        return year, "year"

    return cleaned, "year"


def _entry_sort_key(entry: Entry) -> tuple[int, str, str]:
    """Sort key for chronological descending order (ongoing/recent items first)."""
    end_raw = entry.end_date or ""
    is_ongoing = 0 if (not end_raw or end_raw.lower() in {"presente", "present"}) else 1
    end_val = "9999-99" if is_ongoing == 0 else end_raw
    start_val = entry.start_date or "0000-00"
    return (is_ongoing, end_val, start_val)


def _build_profile_from_dict(
    data: dict[str, Any],
    default_lang: LangCode | None = None,
) -> Profile:
    """Build and validate a Profile from structured dictionary, applying deterministic rules."""
    lang: LangCode = default_lang or data.get("default_lang") or "es"
    if lang not in {"es", "en"}:
        lang = "es"

    full_name = str(data.get("full_name") or "Candidato").strip()

    # Contact info normalization
    raw_contact = data.get("contact") or {}
    email = str(raw_contact.get("email") or "contacto@candidato.com").strip()
    phone = str(raw_contact.get("phone") or "+00 000 0000").strip()
    location = str(raw_contact.get("location") or "Remoto").strip()
    github = raw_contact.get("github")
    linkedin = raw_contact.get("linkedin")
    website = raw_contact.get("website")

    contact = ContactInfo(
        email=email,
        phone=phone,
        location=location,
        github=str(github).strip() if github else None,
        linkedin=str(linkedin).strip() if linkedin else None,
        website=str(website).strip() if website else None,
    )

    # Skills normalization
    raw_skills = data.get("skills") or []
    skills: list[Skill] = []
    seen_skills: set[str] = set()

    for s in raw_skills:
        name = str(s.get("name") or "").strip()
        if not name:
            continue
        s_id = _slugify(name, prefix="skill_")
        if s_id in seen_skills:
            continue
        seen_skills.add(s_id)
        cat = str(s.get("category") or "Herramientas").strip()
        level = s.get("level")
        skills.append(
            Skill(
                id=s_id,
                name=name,
                category=cat,
                level=str(level).strip() if level else None,
                aliases=[],
                tags=[],
            )
        )

    # Entries normalization
    raw_entries = data.get("entries") or []
    entries_by_kind: dict[str, list[Entry]] = {"experience": [], "projects": [], "education": []}
    used_entry_ids: set[str] = set()

    for raw_e in raw_entries:
        kind_str = str(raw_e.get("kind") or "experience").lower().strip()
        kind: EntryKind = (
            "experience"
            if "exp" in kind_str
            else ("projects" if "proj" in kind_str else "education")
        )
        org = str(raw_e.get("org") or "Institución").strip()

        prefix = "exp" if kind == "experience" else ("proj" if kind == "projects" else "edu")
        base_id = _slugify(org, prefix=f"{prefix}_")
        entry_id = base_id
        counter = 2
        while entry_id in used_entry_ids:
            entry_id = f"{base_id}_{counter}"
            counter += 1
        used_entry_ids.add(entry_id)

        start_raw = raw_e.get("start_date")
        end_raw = raw_e.get("end_date")
        start_date, date_prec = _normalize_date_token(start_raw, lang=lang)
        end_date = _normalize_date_token(end_raw, lang=lang)[0] if end_raw else None

        title_text = str(raw_e.get("title") or org).strip()
        title = EntryTitle(
            id=f"title_{entry_id}_default",
            entry_id=entry_id,
            title=title_text,
            lang=lang,
            is_default=True,
            source="user",
            approved=True,
        )

        raw_bullets = raw_e.get("bullets") or []
        facts: list[Fact] = []
        for b_idx, bullet in enumerate(raw_bullets):
            bullet_str = str(bullet).strip()
            if not bullet_str:
                continue
            facts.append(
                Fact(
                    id=f"fact_{entry_id}_{b_idx + 1}",
                    entry_id=entry_id,
                    text=bullet_str,
                    lang=lang,
                    position=b_idx,
                    pinned=False,
                    weight=100,
                    default_selected=True,
                )
            )

        loc = raw_e.get("location")
        link = raw_e.get("link")

        entry = Entry(
            id=entry_id,
            kind=kind,
            org=org,
            location=str(loc).strip() if loc else None,
            start_date=start_date,
            end_date=end_date,
            date_precision=date_prec,
            link=str(link).strip() if link else None,
            context="",
            position=0,
            archived=False,
            default_selected=True,
            titles=[title],
            facts=facts,
        )
        entries_by_kind[kind].append(entry)

    # Sort each entry group in reverse chronological order and assign position
    all_entries: list[Entry] = []
    for kind in ("experience", "projects", "education"):
        kind_entries = entries_by_kind[kind]
        # Sort ongoing first (is_ongoing=0), then latest end date / start date descending
        kind_entries.sort(
            key=lambda e: (
                0 if (not e.end_date or e.end_date.lower() in {"presente", "present"}) else 1,
                "" if not e.end_date else e.end_date,
                e.start_date,
            ),
            reverse=False,
        )
        # Sort ongoing items among themselves by start_date descending
        ongoing = [
            e
            for e in kind_entries
            if not e.end_date or e.end_date.lower() in {"presente", "present"}
        ]
        ended = [
            e
            for e in kind_entries
            if e.end_date and e.end_date.lower() not in {"presente", "present"}
        ]

        ongoing.sort(key=lambda e: e.start_date, reverse=True)
        ended.sort(key=lambda e: (e.end_date or "", e.start_date), reverse=True)

        ordered = ongoing + ended
        for idx, entry in enumerate(ordered):
            entry.position = idx
        all_entries.extend(ordered)

    return Profile(
        id="default",
        schema_version="1.0.0",
        full_name=full_name,
        contact=contact,
        default_lang=lang,
        summary=str(data.get("summary")).strip() if data.get("summary") else None,
        skills=skills,
        entries=all_entries,
    )


def _parse_profile_heuristic(
    text: str,
    default_lang: LangCode | None = None,
) -> Profile:
    """Deterministic, offline rule-based extraction of Profile from raw resume text."""
    lang: LangCode = default_lang or detect_language(text)

    # 1. Contact information
    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    email = email_match.group(0) if email_match else "contacto@candidato.com"

    phone_match = re.search(r"(\+?\d[\d\s\-\(\)]{7,}\d)", text)
    phone = phone_match.group(0).strip() if phone_match else "+00 000 0000"

    github_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", text)
    github = github_match.group(0) if github_match else None

    linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)", text)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # Full name heuristic: first non-header, non-contact line
    full_name = "Candidato"
    for line in lines[:5]:
        if (
            email not in line
            and phone not in line
            and "http" not in line
            and len(line.split()) in {2, 3, 4}
            and not any(
                h in line.lower() for h in ["resumen", "summary", "experiencia", "curriculum"]
            )
        ):
            full_name = line
            break

    # 2. Section segmenter
    sections: dict[str, list[str]] = {
        "summary": [],
        "experience": [],
        "projects": [],
        "education": [],
        "skills": [],
    }
    current_sec = "summary"

    sec_keywords = {
        "experience": ["experiencia", "experience", "historial laboral", "work experience"],
        "projects": ["proyectos", "projects", "proyectos destacados"],
        "education": ["educación", "educacion", "education", "formación", "formacion", "estudios"],
        "skills": ["habilidades", "skills", "tecnologías", "tecnologias", "competencias"],
        "summary": ["resumen", "summary", "perfil", "sobre mí", "sobre mi", "about me"],
    }

    for line in lines:
        line_low = line.lower()
        matched_sec = None
        for sec_name, kw_list in sec_keywords.items():
            pattern = rf"^(?:[#=*\-•\s]*){'|'.join(kw_list)}(?:\s*[:\-–—]?\s*)$"
            if re.match(pattern, line_low):
                matched_sec = sec_name
                break

        if matched_sec:
            current_sec = matched_sec
            continue

        sections[current_sec].append(line)

    summary_text = " ".join(sections["summary"]).strip() or None

    # 3. Skills extraction
    skills_data: list[dict[str, str]] = []
    text_lower = text.lower()
    languages_set = {"Python", "TypeScript", "JavaScript", "C", "Java", "Rust", "Go"}
    for kw in COMMON_TECH_KEYWORDS:
        pattern = r"(?<!\w)" + re.escape(kw.lower()) + r"(?!\w)"
        if re.search(pattern, text_lower):
            category = "Lenguajes" if kw in languages_set else "Herramientas"
            skills_data.append({"name": kw, "category": category})

    # 4. Entry parsing helper
    def parse_section_entries(sec_lines: list[str], kind: str) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        curr_entry: dict[str, Any] | None = None

        for line in sec_lines:
            is_bullet = line.startswith(("-", "•", "*")) or bool(re.match(r"^\d+\.", line))
            clean_bullet = re.sub(r"^[-•*\d.]+\s*", "", line).strip()

            # Date range detection
            date_match = re.search(
                r"\b((?:19|20)\d\d(?:-(?:0[1-9]|1[0-2]))?|(?:0?[1-9]|1[0-2])/(?:19|20)\d\d)\s*[-–—/]\s*((?:19|20)\d\d(?:-(?:0[1-9]|1[0-2]))?|(?:0?[1-9]|1[0-2])/(?:19|20)\d\d|presente|present|actual)\b",
                line,
                re.IGNORECASE,
            )

            if date_match and not is_bullet:
                # New entry detected with date
                parts = line.split("|")
                org_part = parts[0].strip()
                date_str = date_match.group(0)

                # Clean org string from dates
                org_clean = re.sub(re.escape(date_str), "", org_part).strip(" -–—|")
                title_clean = parts[1].strip() if len(parts) > 1 else org_clean

                curr_entry = {
                    "kind": kind,
                    "org": org_clean or "Empresa",
                    "title": title_clean or org_clean or "Rol",
                    "start_date": date_match.group(1),
                    "end_date": date_match.group(2),
                    "bullets": [],
                }
                entries.append(curr_entry)
            elif is_bullet:
                if curr_entry is None:
                    curr_entry = {
                        "kind": kind,
                        "org": "Experiencia Principal" if kind == "experience" else "Proyecto",
                        "title": "Desarrollador",
                        "start_date": "2024",
                        "end_date": "Presente",
                        "bullets": [],
                    }
                    entries.append(curr_entry)
                curr_entry["bullets"].append(clean_bullet)
            else:
                if curr_entry is None:
                    # Treat first header-like line as entry title/org
                    curr_entry = {
                        "kind": kind,
                        "org": line,
                        "title": line,
                        "start_date": "2024",
                        "end_date": "Presente",
                        "bullets": [],
                    }
                    entries.append(curr_entry)

        return entries

    raw_entries: list[dict[str, Any]] = []
    raw_entries.extend(parse_section_entries(sections["experience"], "experience"))
    raw_entries.extend(parse_section_entries(sections["projects"], "projects"))
    raw_entries.extend(parse_section_entries(sections["education"], "education"))

    raw_profile = {
        "full_name": full_name,
        "default_lang": lang,
        "summary": summary_text,
        "contact": {
            "email": email,
            "phone": phone,
            "location": "Mar del Plata, Buenos Aires, AR",
            "github": github,
            "linkedin": linkedin,
            "website": None,
        },
        "skills": skills_data,
        "entries": raw_entries,
    }

    return _build_profile_from_dict(raw_profile, default_lang=lang)


def parse_profile_from_text(
    text: str,
    llm: LLMClient | None = None,
    default_lang: LangCode | None = None,
) -> Profile:
    """Extract and build a verified Master Profile from raw resume text.

    Uses LLM structured parsing when configured; falls back deterministically to
    heuristic rule-based parsing.
    """
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Input resume text is empty.")

    if llm is not None and llm.is_configured:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": clean_text[:12000]},
        ]
        try:
            data = llm.parse_json_completion(messages, temperature=0.1)
            return _build_profile_from_dict(data, default_lang=default_lang)
        except Exception:
            # Automatic fallback to deterministic heuristic parser
            pass

    return _parse_profile_heuristic(clean_text, default_lang=default_lang)

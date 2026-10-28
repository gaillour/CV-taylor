"""JobSpec extractor from plain text or URLs with deterministic fallback and LLM support."""

from __future__ import annotations

import re
from urllib.parse import urlparse

import httpx

from .llm import LLMClient
from .models import JobSpec, LangCode

# Common tech keywords to recognize deterministically when LLM is unavailable
COMMON_TECH_KEYWORDS = [
    "Python",
    "FastAPI",
    "Django",
    "Flask",
    "PostgreSQL",
    "SQL",
    "Docker",
    "Kubernetes",
    "TypeScript",
    "JavaScript",
    "React",
    "Next.js",
    "Node.js",
    "Vue",
    "TailwindCSS",
    "C",
    "C++",
    "C#",
    ".NET",
    "Java",
    "Spring Boot",
    "Rust",
    "Go",
    "Golang",
    "AWS",
    "GCP",
    "Azure",
    "Linux",
    "Git",
    "GitHub Actions",
    "CI/CD",
    "GraphQL",
    "REST",
    "Redis",
    "Kafka",
    "RabbitMQ",
    "Celery",
    "MongoDB",
    "Supabase",
    "Pytest",
    "Jest",
    "Microservicios",
    "Microservices",
    "Arch Linux",
    "Zsh",
    "Neovim",
    "Typst",
]


def _strip_html(html: str) -> str:
    """Strip HTML tags, styles, and scripts to extract readable text."""
    # Remove script and style elements
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    # Remove all HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    # Decode basic entities
    cleaned = (
        cleaned.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    # Collapse multiple whitespaces
    return re.sub(r"\s+", " ", cleaned).strip()


def fetch_url_text(url: str, timeout: float = 15.0) -> str:
    """Fetch and strip web content from a given job URL."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        return _strip_html(resp.text)


def detect_language(text: str) -> LangCode:
    """Detect whether text is predominantly Spanish or English."""
    es_indicators = [
        "requisitos",
        "experiencia",
        "conocimientos",
        "responsabilidades",
        "buscamos",
        "puesto",
        "empresa",
        "educación",
        "habilidades",
    ]
    en_indicators = [
        "requirements",
        "experience",
        "responsibilities",
        "looking for",
        "position",
        "company",
        "education",
        "skills",
        "about the role",
    ]

    text_lower = text.lower()
    es_count = sum(1 for w in es_indicators if w in text_lower)
    en_count = sum(1 for w in en_indicators if w in text_lower)

    return "en" if en_count > es_count else "es"


def extract_job_spec_heuristic(text: str, source_url: str | None = None) -> JobSpec:
    """Deterministic, offline rule-based extraction of JobSpec."""
    lang = detect_language(text)

    # Extract tech keywords present in raw text
    text_lower = text.lower()
    matched_keywords: list[str] = []
    for kw in COMMON_TECH_KEYWORDS:
        # Match whole word or exact token
        pattern = r"(?<!\w)" + re.escape(kw.lower()) + r"(?!\w)"
        if re.search(pattern, text_lower):
            matched_keywords.append(kw)

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    first_few_lines = lines[:5] if lines else []

    role: str | None = None
    company: str | None = None

    # Try heuristic role identification from first non-empty lines
    for line in first_few_lines:
        line_clean = re.sub(r"^[#*•\-\s]+", "", line).strip()
        if len(line_clean) < 60 and any(
            t in line_clean.lower()
            for t in [
                "developer",
                "engineer",
                "desarrollador",
                "ingeniero",
                "architect",
                "lead",
                "analyst",
            ]
        ):
            role = line_clean
            break

    # Responsibilities and requirements splitting
    must_have: list[str] = []
    responsibilities: list[str] = []
    current_section: str | None = None

    for line in lines:
        line_clean = line.strip()
        lower = line_clean.lower()
        # Check if line is a section header (short line, not a bullet)
        is_bullet = line_clean.startswith(("-", "•", "*")) or bool(
            re.match(r"^\d+[\.\)]", line_clean)
        )
        if not is_bullet and len(line_clean) < 60:
            req_headers = ["requisitos", "requirements", "must have", "perfil", "lo que buscamos"]
            resp_headers = [
                "responsabilidades",
                "responsibilities",
                "funciones",
                "what you will do",
            ]
            benefit_headers = ["beneficios", "benefits", "ofrecemos", "about us", "sobre nosotros"]

            if any(h in lower for h in req_headers):
                current_section = "must_have"
                continue
            elif any(h in lower for h in resp_headers) or re.search(r"\brol\b", lower):
                current_section = "responsibilities"
                continue
            elif any(h in lower for h in benefit_headers):
                current_section = None
                continue

        if current_section and is_bullet:
            bullet_text = re.sub(r"^[-•*\d\.\)\s]+", "", line_clean).strip()
            if bullet_text:
                if current_section == "must_have":
                    must_have.append(bullet_text)
                elif current_section == "responsibilities":
                    responsibilities.append(bullet_text)

    # Infer archetype
    archetype = "dev"
    if role:
        r_low = role.lower()
        if "backend" in r_low or "back" in r_low:
            archetype = "backend"
        elif "frontend" in r_low or "front" in r_low:
            archetype = "frontend"
        elif "data" in r_low:
            archetype = "data"
        elif "lead" in r_low or "architect" in r_low:
            archetype = "lead"

    return JobSpec(
        company=company,
        role=role,
        lang=lang,
        archetype=archetype,
        keywords=matched_keywords,
        must_have=must_have,
        nice_to_have=[],
        responsibilities=responsibilities,
        raw_text=text,
        source_url=source_url,
    )


def extract_job_spec(
    input_text_or_url: str,
    client: LLMClient | None = None,
) -> JobSpec:
    """Extract a structured JobSpec from a URL or raw text snippet."""
    is_url = bool(urlparse(input_text_or_url).scheme in ("http", "https"))
    raw_text = fetch_url_text(input_text_or_url) if is_url else input_text_or_url.strip()
    source_url = input_text_or_url if is_url else None

    # If no LLM available, use deterministic heuristic extractor
    if client is None or not client.is_configured:
        return extract_job_spec_heuristic(raw_text, source_url=source_url)

    system_prompt = (
        "You are an expert technical recruiter and ATS parser. "
        "Extract the structured job specification from the provided job posting text. "
        "Respond ONLY with valid JSON matching the following schema:\n"
        "{\n"
        '  "company": "Company Name or null",\n'
        '  "role": "Exact or normalized Job Title or null",\n'
        '  "lang": "es" or "en",\n'
        '  "archetype": "dev" | "backend" | "frontend" | "data" | "mobile" | "devops" | null,\n'
        '  "keywords": ["tech1", "tech2", ...],\n'
        '  "must_have": ["mandatory requirement 1", ...],\n'
        '  "nice_to_have": ["optional requirement 1", ...],\n'
        '  "responsibilities": ["core task 1", ...]\n'
        "}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": raw_text[:8000]},  # truncate to prevent excessive token use
    ]

    try:
        data = client.parse_json_completion(messages, temperature=0.1)
        detected_lang = (
            data.get("lang") if data.get("lang") in ("es", "en") else detect_language(raw_text)
        )
        return JobSpec(
            company=data.get("company"),
            role=data.get("role"),
            lang=detected_lang,
            archetype=data.get("archetype"),
            keywords=data.get("keywords", []),
            must_have=data.get("must_have", []),
            nice_to_have=data.get("nice_to_have", []),
            responsibilities=data.get("responsibilities", []),
            raw_text=raw_text,
            source_url=source_url,
        )
    except Exception:
        # Fallback to heuristic on LLM parsing failure
        return extract_job_spec_heuristic(raw_text, source_url=source_url)

"""GitHub Project Importer: Deterministic metadata & manifest extraction + 1-pass LLM synthesis."""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field

from back.engine.anti_hallucination import TECH_REGEX
from back.engine.extractor import COMMON_TECH_KEYWORDS
from back.engine.llm import LLMClient
from back.engine.models import Entry, EntryTitle, Fact, LangCode, Skill
from back.engine.profile_assistant import SKILL_CATEGORY_MAP

logger = logging.getLogger(__name__)

CANONICAL_TECH_NAMES: dict[str, str] = {
    "python": "Python",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "react": "React",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "vue": "Vue",
    "angular": "Angular",
    "c": "C",
    "c++": "C++",
    "c#": "C#",
    ".net": ".NET",
    "java": "Java",
    "spring": "Spring",
    "spring boot": "Spring Boot",
    "rust": "Rust",
    "go": "Go",
    "golang": "Go",
    "sql": "SQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "supabase": "Supabase",
    "kafka": "Kafka",
    "rabbitmq": "RabbitMQ",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "linux": "Linux",
    "arch linux": "Arch Linux",
    "neovim": "Neovim",
    "tailwind": "TailwindCSS",
    "tailwindcss": "TailwindCSS",
    "typst": "Typst",
    "git": "Git",
    "github actions": "GitHub Actions",
    "ci/cd": "CI/CD",
    "pytest": "Pytest",
    "jest": "Jest",
}


class GitHubImportResult(BaseModel):
    """Result of importing a project from GitHub."""

    model_config = ConfigDict(extra="forbid")

    entry: Entry
    suggested_skills: list[Skill] = Field(default_factory=list)


def parse_github_url(url: str) -> tuple[str, str]:
    """Parse GitHub URL or owner/repo shorthand into (owner, repo).

    Raises:
        ValueError: If the URL format is invalid.
    """
    raw = url.strip()
    if not raw:
        raise ValueError("URL de GitHub no puede estar vacía.")

    # Strip query parameters and fragments
    raw = raw.split("?")[0].split("#")[0].strip()

    # Match https://github.com/owner/repo or github.com/owner/repo with optional subpaths
    full_pattern = re.compile(
        r"^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_\.-]+)/([a-zA-Z0-9_\.-]+)(?:/.*)?$",
        re.IGNORECASE,
    )
    match = full_pattern.match(raw)
    if match:
        owner, repo = match.group(1), match.group(2)
        if repo.endswith(".git"):
            repo = repo[:-4]
        owner = owner.strip()
        repo = repo.strip()
        if owner and repo:
            return owner, repo

    # Match shorthand "owner/repo"
    shorthand_pattern = re.compile(r"^([a-zA-Z0-9_\.-]+)/([a-zA-Z0-9_\.-]+)$")
    match_short = shorthand_pattern.match(raw)
    if match_short:
        owner, repo = match_short.group(1), match_short.group(2)
        if repo.endswith(".git"):
            repo = repo[:-4]
        return owner.strip(), repo.strip()

    raise ValueError(
        f"Formato de URL de GitHub no válido: '{url}'. "
        "Use https://github.com/owner/repo o owner/repo."
    )


def _github_headers(token: str | None = None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "cv-tailor",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_github_metadata(
    owner: str,
    repo: str,
    client: httpx.Client | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Fetch repository metadata from GitHub REST API.

    Raises:
        ValueError: On HTTP 404 (not found / private), HTTP 403 (rate limited), or other errors.
    """
    url = f"https://api.github.com/repos/{owner}/{repo}"
    headers = _github_headers(token)

    def _do_get(cli: httpx.Client) -> dict[str, Any]:
        resp = cli.get(url, headers=headers)
        if resp.status_code == 404:
            raise ValueError(
                f"Repositorio no encontrado o privado: '{owner}/{repo}'. "
                "Verificá que el repositorio sea público."
            )
        if resp.status_code == 403:
            msg = resp.json().get("message", "Acceso denegado o rate limit excedido.")
            raise ValueError(f"GitHub API Error 403: {msg}")
        resp.raise_for_status()
        return resp.json()

    if client is not None:
        return _do_get(client)
    with httpx.Client(timeout=10.0) as cli:
        return _do_get(cli)


def fetch_readme_and_manifests(
    owner: str,
    repo: str,
    client: httpx.Client | None = None,
    token: str | None = None,
    main_language: str | None = None,
) -> tuple[str, str]:
    """Fetch truncated README (max 150 lines or 3500 chars) and relevant manifest contents.

    Returns:
        (truncated_readme, manifest_text)
    """
    headers_raw = {
        "Accept": "application/vnd.github.raw+json",
        "User-Agent": "cv-tailor",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers_raw["Authorization"] = f"Bearer {token}"

    def _execute(cli: httpx.Client) -> tuple[str, str]:
        readme_text = ""
        # 1. Fetch README
        try:
            readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
            resp = cli.get(readme_url, headers=headers_raw)
            if resp.status_code == 200:
                lines = resp.text.splitlines()[:150]
                readme_text = "\n".join(lines)[:3500]
        except Exception as exc:
            logger.warning("Could not fetch README for %s/%s: %s", owner, repo, exc)

        # 2. Targeted manifest fetch based on language
        manifest_text = ""
        manifest_candidates: list[str] = []
        lang_lower = (main_language or "").lower()
        if "javascript" in lang_lower or "typescript" in lang_lower:
            manifest_candidates = ["package.json"]
        elif "python" in lang_lower:
            manifest_candidates = ["pyproject.toml", "requirements.txt"]
        elif "rust" in lang_lower:
            manifest_candidates = ["Cargo.toml"]
        elif "go" in lang_lower:
            manifest_candidates = ["go.mod"]
        else:
            manifest_candidates = ["package.json", "pyproject.toml"]

        for candidate in manifest_candidates:
            try:
                resp = cli.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{candidate}",
                    headers=headers_raw,
                )
                if resp.status_code == 200:
                    manifest_text = resp.text[:2500]
                    break
            except Exception:
                continue

        return readme_text, manifest_text

    if client is not None:
        return _execute(client)
    with httpx.Client(timeout=10.0) as cli:
        return _execute(cli)


def extract_skills_from_repo_data(
    metadata: dict[str, Any],
    readme_text: str,
    manifest_text: str,
    lang: LangCode,
) -> list[Skill]:
    """Deterministically detect skills from metadata, manifest, and README tokens."""
    detected_tokens: set[str] = set()

    # Primary language
    main_lang = metadata.get("language")
    if main_lang:
        detected_tokens.add(main_lang.lower())

    # GitHub topics
    topics = metadata.get("topics") or []
    for topic in topics:
        if isinstance(topic, str):
            detected_tokens.add(topic.lower())

    # Text corpus to scan with TECH_REGEX and COMMON_TECH_KEYWORDS
    corpus = f"{metadata.get('description') or ''}\n{manifest_text}\n{readme_text}"

    # Match with regex
    for m in TECH_REGEX.finditer(corpus):
        token = m.group(1).lower().strip()
        detected_tokens.add(token)

    for kw in COMMON_TECH_KEYWORDS:
        if re.search(rf"(?<!\w){re.escape(kw)}(?!\w)", corpus, re.IGNORECASE):
            detected_tokens.add(kw.lower())

    # Build Skill objects
    skills: list[Skill] = []
    seen_ids: set[str] = set()

    for token in sorted(detected_tokens):
        canonical_name = CANONICAL_TECH_NAMES.get(token) or token.capitalize()
        safe_id = f"skill_{re.sub(r'[^a-z0-9_]', '_', token)}"
        if safe_id in seen_ids:
            continue
        seen_ids.add(safe_id)

        cat_es, cat_en = SKILL_CATEGORY_MAP.get(token, ("Herramientas", "Tools"))
        cat = cat_en if lang == "en" else cat_es

        skills.append(
            Skill(
                id=safe_id,
                name=canonical_name,
                category=cat,
                aliases=[token],
                tags=["project", "github"],
                source="user",
                approved=True,
            )
        )

    return skills


def synthesize_github_project(
    metadata: dict[str, Any],
    readme_text: str,
    suggested_skills: list[Skill],
    lang: LangCode,
    llm: LLMClient | None = None,
) -> GitHubImportResult:
    """Generate structured Entry and atomic Facts with 1 LLM pass (or deterministic fallback)."""
    repo_name = metadata.get("name") or "proyecto"
    owner = (metadata.get("owner") or {}).get("login", "")
    html_url = metadata.get("html_url") or f"https://github.com/{owner}/{repo_name}"
    description = (metadata.get("description") or "").strip()

    # Dates
    created_at = str(metadata.get("created_at") or "2024-01-01")
    pushed_at = str(metadata.get("pushed_at") or created_at)
    start_date = created_at[:7]
    end_date = pushed_at[:7]

    clean_slug = re.sub(r"[^a-z0-9_-]", "-", repo_name.lower()).strip("-") or "project"
    entry_id = f"proj-{clean_slug}"

    skill_names = [s.name for s in suggested_skills]
    tech_summary = ", ".join(skill_names[:4]) if skill_names else "tecnologías modernas"
    stars = metadata.get("stargazers_count", 0)

    # Default fallback content
    default_title = "Autor y Desarrollador" if lang == "es" else "Creator & Lead Developer"
    default_context = description or (
        f"Desarrollo de {repo_name} con {tech_summary}."
        if lang == "es"
        else f"Engineered {repo_name} utilizing {tech_summary}."
    )
    if lang == "es":
        default_facts = [
            f"Diseño y desarrollo de la arquitectura técnica de {repo_name} con {tech_summary}.",
            f"Construcción modular y mantenimiento en GitHub con {stars} estrellas.",
        ]
    else:
        default_facts = [
            f"Architected and engineered technical foundation of {repo_name} with {tech_summary}.",
            f"Implemented core modular components on GitHub with {stars} stars.",
        ]

    synthesized_title = default_title
    synthesized_context = default_context
    synthesized_facts = default_facts

    # 1 structured LLM call if available
    if llm is not None and llm.is_configured:
        lang_label = "español" if lang == "es" else "English"
        allowed_techs = ", ".join(skill_names[:8])
        system_prompt = (
            f"Sos un redactor técnico de CVs de alto impacto. Idioma de redacción: {lang_label}.\n"
            "Tu tarea es generar 1 entrada de proyecto basada en la metadata y README de GitHub.\n"
            "Reglas:\n"
            "1. Título/Rol: Sugerir título conciso (ej: 'Autor y Desarrollador').\n"
            "2. Contexto: 1 frase breve (máx 140 chars) describiendo el propósito y problema.\n"
            "3. Viñetas (Facts): 2 a 3 viñetas breves STAR (acción + tech + impacto/resultado).\n"
            f"4. Tecnologías permitidas: Únicamente datos del repo ({allowed_techs}). "
            "Prohibido alucinar tecnologías o métricas no provistas.\n"
            "Respondé exclusivamente con un JSON que cumpla:\n"
            "{\n"
            '  "title": "string",\n'
            '  "context": "string",\n'
            '  "facts": ["bullet 1", "bullet 2"]\n'
            "}"
        )
        user_content = (
            f"Repositorio: {owner}/{repo_name}\n"
            f"Descripción: {description}\n"
            f"Lenguaje principal: {metadata.get('language')}\n"
            f"Topics: {metadata.get('topics')}\n"
            f"Estrellas: {metadata.get('stargazers_count', 0)}\n"
            f"Fragmento README:\n{readme_text}\n"
        )

        try:
            parsed = llm.parse_json_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
            )
            if isinstance(parsed, dict):
                if parsed.get("title") and isinstance(parsed["title"], str):
                    synthesized_title = parsed["title"].strip()
                if parsed.get("context") and isinstance(parsed["context"], str):
                    synthesized_context = parsed["context"].strip()
                if parsed.get("facts") and isinstance(parsed["facts"], list):
                    raw_bullets = [str(b).strip() for b in parsed["facts"] if str(b).strip()]
                    if 1 <= len(raw_bullets) <= 4:
                        synthesized_facts = raw_bullets
        except Exception as exc:
            logger.warning("LLM synthesis failed, falling back to deterministic: %s", exc)

    # Build EntryTitle
    title_obj = EntryTitle(
        id=f"title_{uuid.uuid4().hex[:8]}",
        entry_id=entry_id,
        title=synthesized_title,
        is_default=True,
        source="user",
        approved=True,
    )

    # Build Facts
    fact_objs: list[Fact] = []
    for idx, fact_text in enumerate(synthesized_facts):
        # Match skill IDs present in bullet text
        matched_ids = [
            s.id
            for s in suggested_skills
            if s.name.lower() in fact_text.lower() or s.id in fact_text.lower()
        ]
        fact_objs.append(
            Fact(
                id=f"fact_{uuid.uuid4().hex[:8]}",
                entry_id=entry_id,
                text=fact_text,
                position=idx,
                weight=100,
                source="user",
                approved=True,
                tags=["project", "github"],
                skill_ids=matched_ids,
            )
        )

    entry = Entry(
        id=entry_id,
        kind="project",
        org=repo_name,
        start_date=start_date,
        end_date=end_date,
        date_precision="month",
        link=html_url,
        context=synthesized_context,
        titles=[title_obj],
        facts=fact_objs,
        skill_ids=[s.id for s in suggested_skills],
    )

    return GitHubImportResult(entry=entry, suggested_skills=suggested_skills)


def import_project_from_github(
    url: str,
    lang: LangCode = "es",
    token: str | None = None,
    client: httpx.Client | None = None,
    llm: LLMClient | None = None,
) -> GitHubImportResult:
    """Orchestrate GitHub project import from URL to synthesized Entry and Skill models."""
    owner, repo = parse_github_url(url)
    metadata = fetch_github_metadata(owner, repo, client=client, token=token)
    main_language = metadata.get("language")
    readme_text, manifest_text = fetch_readme_and_manifests(
        owner,
        repo,
        client=client,
        token=token,
        main_language=main_language,
    )
    skills = extract_skills_from_repo_data(metadata, readme_text, manifest_text, lang=lang)
    return synthesize_github_project(
        metadata=metadata,
        readme_text=readme_text,
        suggested_skills=skills,
        lang=lang,
        llm=llm,
    )

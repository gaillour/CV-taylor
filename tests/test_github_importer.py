"""Tests for GitHub project importer (deterministic extraction and LLM synthesis)."""

from __future__ import annotations

import httpx
import pytest

from back.engine.github_importer import (
    extract_skills_from_repo_data,
    fetch_github_metadata,
    fetch_readme_and_manifests,
    import_project_from_github,
    parse_github_url,
    synthesize_github_project,
)
from back.engine.llm import LLMClient


def test_parse_github_url_valid() -> None:
    cases = [
        ("https://github.com/fastapi/fastapi", ("fastapi", "fastapi")),
        ("https://github.com/fastapi/fastapi.git", ("fastapi", "fastapi")),
        ("https://github.com/fastapi/fastapi/", ("fastapi", "fastapi")),
        ("http://github.com/owner/repo", ("owner", "repo")),
        ("github.com/owner/repo", ("owner", "repo")),
        ("owner/my-cool-project", ("owner", "my-cool-project")),
        ("https://github.com/owner/repo/tree/main/src", ("owner", "repo")),
        ("https://github.com/owner/repo?tab=readme-ov-file#intro", ("owner", "repo")),
    ]
    for raw_url, expected in cases:
        assert parse_github_url(raw_url) == expected


def test_parse_github_url_invalid() -> None:
    invalid_cases = [
        "",
        "   ",
        "https://gitlab.com/owner/repo",
        "https://github.com/",
        "just_a_word",
        "owner/repo/extra/parts/here",
    ]
    for raw_url in invalid_cases:
        with pytest.raises(ValueError):
            parse_github_url(raw_url)


def test_fetch_github_metadata_success() -> None:
    sample_data = {
        "name": "cv-tailor",
        "html_url": "https://github.com/user/cv-tailor",
        "description": "Deterministic CV tailoring engine",
        "language": "Python",
        "topics": ["cv", "typst", "fastapi"],
        "stargazers_count": 42,
        "created_at": "2024-02-15T10:00:00Z",
        "pushed_at": "2024-06-01T12:00:00Z",
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/repos/user/cv-tailor"
        assert request.headers.get("User-Agent") == "cv-tailor"
        return httpx.Response(200, json=sample_data)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as client:
        metadata = fetch_github_metadata("user", "cv-tailor", client=client)
        assert metadata["name"] == "cv-tailor"
        assert metadata["stargazers_count"] == 42


def test_fetch_github_metadata_404_and_403() -> None:
    def handler_404(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"message": "Not Found"})

    with httpx.Client(transport=httpx.MockTransport(handler_404)) as client:
        with pytest.raises(ValueError, match="Repositorio no encontrado o privado"):
            fetch_github_metadata("user", "missing-repo", client=client)

    def handler_403(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"message": "API rate limit exceeded"})

    with httpx.Client(transport=httpx.MockTransport(handler_403)) as client:
        with pytest.raises(ValueError, match="GitHub API Error 403"):
            fetch_github_metadata("user", "rate-limited", client=client)


def test_fetch_readme_truncation() -> None:
    # 200 lines of markdown
    long_readme = "\n".join([f"Line {i}: This is some readme detail." for i in range(200)])

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/readme"):
            return httpx.Response(200, text=long_readme)
        return httpx.Response(404)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        readme, _ = fetch_readme_and_manifests("user", "cv-tailor", client=client)
        assert len(readme.splitlines()) <= 150
        assert len(readme) <= 3500


def test_extract_skills_from_repo_data() -> None:
    metadata = {
        "language": "Python",
        "topics": ["fastapi", "docker"],
        "description": "API microservice using Redis and PostgreSQL",
    }
    readme_text = "Built with Next.js and TailwindCSS for frontend."
    manifest_text = "dependencies = ['pydantic', 'httpx']"

    skills = extract_skills_from_repo_data(metadata, readme_text, manifest_text, lang="es")
    skill_names = {s.name for s in skills}
    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    assert "Docker" in skill_names
    assert "Redis" in skill_names
    assert "PostgreSQL" in skill_names
    assert "Next.js" in skill_names

    # Check categories
    fastapi_skill = next(s for s in skills if s.name == "FastAPI")
    assert fastapi_skill.category == "Backend"
    assert fastapi_skill.approved is True


def test_synthesize_github_project_deterministic_fallback() -> None:
    metadata = {
        "name": "my-tool",
        "html_url": "https://github.com/juan/my-tool",
        "description": "CLI tool for PDF parsing",
        "language": "Rust",
        "topics": ["cli", "pdf"],
        "stargazers_count": 15,
        "created_at": "2024-01-10T08:00:00Z",
        "pushed_at": "2024-05-20T10:00:00Z",
        "owner": {"login": "juan"},
    }
    skills = extract_skills_from_repo_data(metadata, "", "", lang="es")
    result = synthesize_github_project(metadata, "", skills, lang="es", llm=None)

    entry = result.entry
    assert entry.id == "proj-my-tool"
    assert entry.kind == "project"
    assert entry.org == "my-tool"
    assert entry.start_date == "2024-01"
    assert entry.end_date == "2024-05"
    assert entry.link == "https://github.com/juan/my-tool"
    assert len(entry.titles) == 1
    assert entry.titles[0].title == "Autor y Desarrollador"
    assert len(entry.facts) >= 2


def test_synthesize_github_project_with_mock_llm() -> None:
    metadata = {
        "name": "ai-agent",
        "html_url": "https://github.com/juan/ai-agent",
        "description": "Agentic system",
        "language": "Python",
        "stargazers_count": 50,
        "created_at": "2024-03-01T00:00:00Z",
        "pushed_at": "2024-04-01T00:00:00Z",
        "owner": {"login": "juan"},
    }
    skills = extract_skills_from_repo_data(metadata, "", "", lang="en")

    class MockLLM(LLMClient):
        @property
        def is_configured(self) -> bool:
            return True

        def parse_json_completion(self, messages, *, temperature=0.2):
            return {
                "title": "Lead Engineer & Architect",
                "context": "Autonomous coding agent orchestrating subagents and tools.",
                "facts": [
                    "Engineered modular LLM layer in Python handling 100+ req/min.",
                    "Designed tool registry with sandboxed command execution.",
                ],
            }

    mock_llm = MockLLM()
    result = synthesize_github_project(metadata, "", skills, lang="en", llm=mock_llm)

    entry = result.entry
    assert entry.titles[0].title == "Lead Engineer & Architect"
    assert "Autonomous coding agent" in entry.context
    assert len(entry.facts) == 2
    assert "Engineered modular LLM" in entry.facts[0].text


def test_import_project_from_github_end_to_end() -> None:
    repo_data = {
        "name": "mini-redis",
        "html_url": "https://github.com/tokio-rs/mini-redis",
        "description": "Incomplete Redis client and server implementation using Tokio",
        "language": "Rust",
        "topics": ["tokio", "redis", "async"],
        "stargazers_count": 3500,
        "created_at": "2020-03-15T12:00:00Z",
        "pushed_at": "2024-01-10T12:00:00Z",
        "owner": {"login": "tokio-rs"},
    }

    def handler(request: httpx.Request) -> httpx.Response:
        url_path = request.url.path
        if url_path == "/repos/tokio-rs/mini-redis":
            return httpx.Response(200, json=repo_data)
        if url_path.endswith("/readme"):
            return httpx.Response(200, text="# mini-redis\nAn incomplete Redis client and server.")
        if "Cargo.toml" in url_path:
            return httpx.Response(200, text="[dependencies]\ntokio = '1.0'")
        return httpx.Response(404)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = import_project_from_github(
            "https://github.com/tokio-rs/mini-redis",
            lang="es",
            client=client,
            llm=None,
        )
        assert result.entry.id == "proj-mini-redis"
        assert result.entry.org == "mini-redis"
        assert result.entry.link == "https://github.com/tokio-rs/mini-redis"
        assert any(s.name == "Rust" for s in result.suggested_skills)
        assert any(s.name == "Redis" for s in result.suggested_skills)

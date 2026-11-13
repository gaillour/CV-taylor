"""Unit tests for shared prompt rules across importer and tailor curator."""

from __future__ import annotations

from typing import Any

from back.engine.anti_hallucination import AntiHallucinationValidator
from back.engine.importer.text_parser import SYSTEM_PROMPT
from back.engine.models import ContactInfo, JobSpec, Profile, RenderModel
from back.engine.prompts.rules import (
    SHARED_BULLET_RULES,
    SHARED_DATE_RULES,
    SHARED_LINK_RULES,
    SHARED_PROJECT_AND_ENTRY_RULES,
)
from back.engine.tailor.llm_curator import (
    CURATE_PROFILE_SYSTEM_PROMPT,
    build_harmonize_system_prompt,
    harmonize_resume,
)


class _CapturingLLMClient:
    """Mock LLM client that captures the messages sent to parse_json_completion."""

    is_configured = True

    def __init__(self) -> None:
        self.captured_messages: list[dict[str, str]] = []

    def parse_json_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        self.captured_messages = messages
        return {
            "summary": "Resumen",
            "experience": [],
            "projects": [],
            "education": [],
        }


def test_text_parser_system_prompt_includes_all_shared_rules() -> None:
    """Verify that text_parser SYSTEM_PROMPT embeds all shared prompt rules and role field."""
    assert SHARED_PROJECT_AND_ENTRY_RULES in SYSTEM_PROMPT
    assert SHARED_DATE_RULES in SYSTEM_PROMPT
    assert SHARED_LINK_RULES in SYSTEM_PROMPT
    assert SHARED_BULLET_RULES in SYSTEM_PROMPT
    assert '"role": "Optional role in project or null"' in SYSTEM_PROMPT


def test_curate_profile_system_prompt_includes_shared_rules() -> None:
    """Verify that CURATE_PROFILE_SYSTEM_PROMPT embeds project/entry and bullet rules."""
    assert SHARED_PROJECT_AND_ENTRY_RULES in CURATE_PROFILE_SYSTEM_PROMPT
    assert SHARED_BULLET_RULES in CURATE_PROFILE_SYSTEM_PROMPT


def test_harmonize_resume_prompt_includes_shared_rules() -> None:
    """Verify that harmonize_resume injects shared rules into its system prompt."""
    built_prompt = build_harmonize_system_prompt("Ensure Spanish.")
    assert SHARED_PROJECT_AND_ENTRY_RULES in built_prompt
    assert SHARED_BULLET_RULES in built_prompt

    profile = Profile(
        id="test",
        full_name="Test Candidate",
        contact=ContactInfo(
            email="test@example.com",
            phone="+54 9 11 0000 0000",
            location="Buenos Aires, AR",
        ),
        base_lang="es",
    )
    model = RenderModel.from_profile(profile)
    validator = AntiHallucinationValidator(profile)
    job_spec = JobSpec(raw_text="Backend Developer", role="Backend Developer")
    client = _CapturingLLMClient()

    harmonize_resume(client, validator, model, job_spec)

    assert len(client.captured_messages) == 2
    sys_msg = client.captured_messages[0]["content"]
    assert SHARED_PROJECT_AND_ENTRY_RULES in sys_msg
    assert SHARED_BULLET_RULES in sys_msg

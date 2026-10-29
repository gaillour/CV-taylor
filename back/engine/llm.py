"""OpenAI-compatible LLM adapter supporting Gemini, OpenRouter, Ollama, and OpenAI."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field


def _load_dotenv_if_present() -> None:
    """Populate os.environ from a local .env file if keys are not already set."""
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    env_path = Path(".env")
    if not env_path.is_file():
        return
    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            k = key.strip()
            v = val.strip().strip("'").strip('"')
            if k:
                os.environ.setdefault(k, v)
    except Exception:
        return


class LLMConfig(BaseModel):
    """Configuration for OpenAI-compatible LLM endpoints."""

    model_config = ConfigDict(extra="forbid")

    api_key: str = Field(default="")
    base_url: str = Field(default="https://api.openai.com/v1")
    model: str = Field(default="gpt-4o-mini")
    timeout_seconds: float = Field(default=30.0, ge=1.0)

    @classmethod
    def from_env(cls) -> LLMConfig:
        """Create configuration from environment variables with sensible provider fallbacks."""
        _load_dotenv_if_present()
        # 1. Gemini OpenAI-compatible endpoint
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            return cls(
                api_key=gemini_key,
                base_url=os.getenv(
                    "GEMINI_BASE_URL",
                    "https://generativelanguage.googleapis.com/v1beta/openai/",
                ),
                model=os.getenv("GEMINI_MODEL")
                or os.getenv("LLM_MODEL")
                or "gemini-flash-lite-latest",
            )

        # 2. OpenRouter
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            return cls(
                api_key=openrouter_key,
                base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
                model=os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct"),
            )

        # 3. Ollama (local)
        ollama_url = os.getenv("OLLAMA_BASE_URL")
        if ollama_url:
            return cls(
                api_key=os.getenv("OLLAMA_API_KEY", "ollama"),
                base_url=ollama_url.rstrip("/") + "/v1",
                model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            )

        # 4. Standard OpenAI
        openai_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return cls(api_key=openai_key, base_url=base_url, model=model)


class LLMClient:
    """Client for OpenAI-compatible chat completion endpoints."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig.from_env()

    @property
    def is_configured(self) -> bool:
        """Return True if an API key or local endpoint is available."""
        if "localhost" in self.config.base_url or "127.0.0.1" in self.config.base_url:
            return True
        return bool(self.config.api_key.strip())

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        json_mode: bool = False,
    ) -> str:
        """Synchronously request a chat completion from the configured LLM endpoint."""
        if not self.is_configured:
            raise RuntimeError(
                "LLM client is not configured. Set GEMINI_API_KEY, OPENROUTER_API_KEY, "
                "or OPENAI_API_KEY."
            )

        url = self.config.base_url.rstrip("/") + "/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        with httpx.Client(timeout=self.config.timeout_seconds) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return str(data["choices"][0]["message"]["content"])

    def parse_json_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        """Request structured JSON, stripping markdown code blocks if present."""
        raw_text = self.chat_completion(messages, temperature=temperature, json_mode=True)
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.removeprefix("```json").removesuffix("```").strip()
        elif cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)

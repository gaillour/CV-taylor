"""Pluggable text translators used to derive the mirror profile (base_lang -> other)."""

from __future__ import annotations

import os
from typing import Protocol

from back.engine.llm import LLMClient
from back.engine.models import LangCode

LANG_NAMES: dict[LangCode, str] = {"es": "Spanish", "en": "English"}


class Translator(Protocol):
    """Batch translator. Must return a list aligned 1:1 with `texts`."""

    def translate_batch(self, texts: list[str], src: LangCode, dst: LangCode) -> list[str]: ...


class TranslationError(RuntimeError):
    """Raised when the translator cannot produce an aligned batch."""


class LLMTranslator:
    """Single-call batch translation through the configured OpenAI-compatible LLM."""

    def __init__(self, llm: LLMClient | None = None) -> None:
        self.llm = llm or LLMClient()

    @property
    def is_configured(self) -> bool:
        return self.llm.is_configured

    def translate_batch(self, texts: list[str], src: LangCode, dst: LangCode) -> list[str]:
        if not texts:
            return []
        if src == dst:
            return list(texts)
        system_prompt = (
            "You are a professional translator for engineering CVs.\n"
            f"Translate each item from {LANG_NAMES[src]} into {LANG_NAMES[dst]}.\n"
            "STRICT INVARIANTS:\n"
            "1. NEVER alter, invent, or omit numbers, percentages, metrics or dates.\n"
            "2. Keep technology, product and company names exactly as written.\n"
            "3. Keep the same meaning and length; do not add content.\n"
            "4. CV bullets: concise, action-oriented, past tense when describing work.\n"
            'Return ONLY JSON: {"items": ["...", "..."]} with exactly the same number '
            "of items and in the same order as the input."
        )
        numbered = "\n".join(f"{i}. {t}" for i, t in enumerate(texts))
        res = self.llm.parse_json_completion(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Items ({len(texts)}):\n{numbered}"},
            ],
            temperature=0.1,
        )
        items = res.get("items") if isinstance(res, dict) else None
        if not isinstance(items, list) or len(items) != len(texts):
            raise TranslationError("La traducción no devolvió la misma cantidad de ítems.")
        return [str(x).strip() for x in items]


def get_translator() -> Translator | None:
    """Return the configured translator (CV_TRANSLATOR=llm) or None if unavailable."""
    kind = os.getenv("CV_TRANSLATOR", "llm").strip().lower()
    if kind == "llm":
        tr = LLMTranslator()
        return tr if tr.is_configured else None
    raise ValueError(f"CV_TRANSLATOR no soportado: {kind}")

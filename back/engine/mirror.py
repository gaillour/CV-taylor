"""Derived mirror profile: same structure and ids as the base profile, other language.

The base Profile (``base_lang``) is the single source of truth. The mirror is
regenerated incrementally: each translatable field records the hash of the base
text it was translated from, so only changed or missing fields are re-translated.
"""

from __future__ import annotations

import hashlib
import logging
import re
from collections.abc import Callable
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, ConfigDict, Field

from back.engine.models import (
    DEFAULT_CATEGORY_TRANSLATIONS,
    DEFAULT_LEVEL_TRANSLATIONS,
    LangCode,
    Profile,
)
from back.engine.translator import Translator, get_translator

if TYPE_CHECKING:
    from back.engine.storage import StorageRepository

logger = logging.getLogger(__name__)

MirrorStatus = Literal["ok", "partial"]
_NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?")


class ProfileMirror(BaseModel):
    """Mirror document persisted next to the base profile."""

    model_config = ConfigDict(extra="forbid")

    profile: Profile
    sources: dict[str, str] = Field(default_factory=dict)


def other_lang(lang: LangCode) -> LangCode:
    return "en" if lang == "es" else "es"


def _hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


Slot = tuple[Callable[[], str | None], Callable[[str], None]]


def _slots(profile: Profile) -> dict[str, Slot]:
    """Map stable keys to getter/setter pairs for every translatable field."""
    slots: dict[str, Slot] = {}

    def add(key: str, obj: object, attr: str) -> None:
        slots[key] = (
            lambda: getattr(obj, attr),
            lambda v: setattr(obj, attr, v),
        )

    add("summary", profile, "summary")
    for sk in profile.skills:
        add(f"skill:{sk.id}:name", sk, "name")
        add(f"skill:{sk.id}:category", sk, "category")
        add(f"skill:{sk.id}:level", sk, "level")
    for entry in profile.entries:
        add(f"entry:{entry.id}:location", entry, "location")
        for t in entry.titles:
            add(f"title:{entry.id}:{t.id}", t, "title")
        for f in entry.facts:
            add(f"fact:{entry.id}:{f.id}", f, "text")
    return slots


def _glossary(text: str, key: str, src: LangCode, dst: LangCode) -> str | None:
    """Deterministic translation for skill categories and levels."""
    if key.endswith(":category"):
        table = DEFAULT_CATEGORY_TRANSLATIONS
    elif key.endswith(":level"):
        table = DEFAULT_LEVEL_TRANSLATIONS
    else:
        return None
    norm = text.strip().lower()
    for variants in table.values():
        if variants[src].lower() == norm:
            return variants[dst]
    return None


def validate_translation(src: str, dst: str) -> bool:
    """Numbers and metrics must survive translation verbatim (ignoring separators)."""

    def nums(s: str) -> set[str]:
        return {n.replace(",", ".") for n in _NUMBER_RE.findall(s)}

    return nums(src) == nums(dst)


def build_mirror(
    base: Profile,
    previous: ProfileMirror | None,
    translator: Translator | None,
) -> tuple[ProfileMirror, list[str]]:
    """Derive the mirror from `base`, reusing previous translations whose source is unchanged.

    Returns the mirror and the keys that could not be translated (left with the base text
    and without a source hash, so they are retried on the next sync).
    """
    src_lang = base.base_lang
    dst_lang = other_lang(src_lang)
    mirror = base.model_copy(deep=True)
    mirror.base_lang = dst_lang

    prev_values: dict[str, str | None] = {}
    prev_sources: dict[str, str] = {}
    if previous is not None and previous.profile.base_lang == dst_lang:
        prev_values = {k: get() for k, (get, _) in _slots(previous.profile).items()}
        prev_sources = previous.sources

    sources: dict[str, str] = {}
    pending: list[tuple[str, str]] = []
    for key, (get, set_) in _slots(mirror).items():
        text = get()
        if not text or not text.strip():
            continue
        digest = _hash(text)
        cached = prev_values.get(key)
        if prev_sources.get(key) == digest and cached:
            set_(cached)
            sources[key] = digest
            continue
        glossed = _glossary(text, key, src_lang, dst_lang)
        if glossed is not None:
            set_(glossed)
            sources[key] = digest
            continue
        pending.append((key, text))

    failed: list[str] = []
    if pending:
        translated: list[str] | None = None
        if translator is not None:
            try:
                translated = translator.translate_batch(
                    [t for _, t in pending], src_lang, dst_lang
                )
            except Exception as exc:  # noqa: BLE001 - mirror must never block saving base
                logger.warning("Fallo la traducción del espejo: %s", exc)
        slots = _slots(mirror)
        for i, (key, text) in enumerate(pending):
            if translated is None or not translated[i]:
                failed.append(key)
                continue
            if not validate_translation(text, translated[i]):
                logger.warning("Traducción con números alterados en %s", key)
            slots[key][1](translated[i])
            sources[key] = _hash(text)

    return ProfileMirror(profile=mirror, sources=sources), failed


def is_mirror_fresh(base: Profile, mirror: ProfileMirror | None) -> bool:
    """True if every translatable base field has an up-to-date translation."""
    if mirror is None or mirror.profile.base_lang != other_lang(base.base_lang):
        return False
    if _structure(mirror.profile) != _structure(base):
        return False
    for key, (get, _) in _slots(base).items():
        text = get()
        if text and text.strip() and mirror.sources.get(key) != _hash(text):
            return False
    return True


def _structure(profile: Profile) -> dict:
    """Profile dump with translatable texts blanked, to compare non-text fields."""
    blank = profile.model_copy(deep=True)
    for get, set_ in _slots(blank).values():
        if get() is not None:
            set_("")
    return blank.model_dump(exclude={"base_lang"})


def sync_mirror(
    repo: StorageRepository,
    base: Profile,
    translator: Translator | None = None,
) -> MirrorStatus:
    """Rebuild and persist the mirror for `base`. Never raises on translation failures."""
    tr = translator if translator is not None else get_translator()
    mirror, failed = build_mirror(base, repo.get_mirror(), tr)
    repo.save_mirror(mirror)
    return "partial" if failed else "ok"


def get_or_sync_mirror(
    repo: StorageRepository,
    translator: Translator | None = None,
) -> tuple[ProfileMirror, MirrorStatus]:
    """Return a fresh mirror, rebuilding it lazily if stale or missing."""
    base = repo.get_profile()
    mirror = repo.get_mirror()
    if is_mirror_fresh(base, mirror):
        assert mirror is not None
        return mirror, "ok"
    status = sync_mirror(repo, base, translator)
    fresh = repo.get_mirror()
    assert fresh is not None
    return fresh, status


def resolve_profile(
    repo: StorageRepository,
    lang: LangCode,
    translator: Translator | None = None,
) -> Profile:
    """Return the base profile or its mirror depending on the requested CV language."""
    base = repo.get_profile()
    if lang == base.base_lang:
        return base
    mirror, _ = get_or_sync_mirror(repo, translator)
    return mirror.profile


def swap_base(base: Profile, mirror: ProfileMirror) -> tuple[Profile, ProfileMirror]:
    """Promote the mirror to base; the previous base becomes the (exact) mirror."""
    new_base = mirror.profile.model_copy(deep=True)
    new_mirror_profile = base.model_copy(deep=True)
    sources = {
        key: _hash(text)
        for key, (get, _) in _slots(new_base).items()
        if (text := get()) and text.strip()
    }
    return new_base, ProfileMirror(profile=new_mirror_profile, sources=sources)

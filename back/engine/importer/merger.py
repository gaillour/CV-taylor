"""Deterministic profile merging without data loss or duplicate accumulation."""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher

from back.engine.importer.text_parser import _slugify
from back.engine.models import (
    ContactInfo,
    Entry,
    EntryKind,
    EntryTitle,
    Fact,
    Profile,
    Skill,
)

_DUMMY_NAMES = {"", "candidato", "candidate"}
_DUMMY_EMAILS = {"", "contacto@candidato.com"}
_DUMMY_PHONES = {"", "+00 000 0000"}
_DUMMY_LOCATIONS = {"", "remoto", "mar del plata, buenos aires, ar"}


def _norm_key(val: str) -> str:
    """Normalize text for deterministic matching (lowercase, ASCII-folded, alphanumeric)."""
    folded = unicodedata.normalize("NFKD", val or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", folded.lower()).strip()


def _is_duplicate_fact(existing_facts: list[Fact], candidate_text: str) -> bool:
    """Return True if candidate_text matches or is near-identical to an existing Fact."""
    cand_norm = _norm_key(candidate_text)
    if not cand_norm:
        return True
    for fact in existing_facts:
        f_norm = _norm_key(fact.text)
        if cand_norm == f_norm:
            return True
        if SequenceMatcher(None, f_norm, cand_norm).ratio() >= 0.88:
            return True
    return False


def _sort_and_reindex_entries(entries: list[Entry]) -> list[Entry]:
    """Group entries by kind, sort reverse chronologically, and update position."""
    entries_by_kind: dict[EntryKind, list[Entry]] = {
        "experience": [],
        "project": [],
        "education": [],
        "certification": [],
        "other": [],
    }
    for entry in entries:
        entries_by_kind.setdefault(entry.kind, []).append(entry)

    all_entries: list[Entry] = []
    for kind_key in ("experience", "project", "education", "certification", "other"):
        kind_entries = entries_by_kind.get(kind_key, [])
        ongoing = [
            e
            for e in kind_entries
            if not e.end_date or e.end_date.lower() in {"presente", "present", "current"}
        ]
        ended = [
            e
            for e in kind_entries
            if e.end_date and e.end_date.lower() not in {"presente", "present", "current"}
        ]
        ongoing.sort(key=lambda e: e.start_date, reverse=True)
        ended.sort(key=lambda e: (e.end_date or "", e.start_date), reverse=True)

        ordered = ongoing + ended
        for idx, entry in enumerate(ordered):
            entry.position = idx
        all_entries.extend(ordered)

    return all_entries


def merge_profiles(base: Profile, incoming: Profile) -> Profile:
    """Deterministically merge `incoming` Profile into `base` without data loss or LLM calls.

    Enforces the Cumulative Master Profile invariant:
    - Existing entries, titles, facts, and skills are never deleted.
    - Matching entries `(kind, normalized_org)` accumulate new `EntryTitle` variants
      (`is_default=False`) and non-duplicate `Fact` bullets.
    - Distinct entries are appended with collision-free IDs.
    """
    base_empty = not base.full_name.strip() and len(base.entries) == 0 and len(base.skills) == 0
    if base_empty:
        merged = incoming.model_copy(deep=True)
        merged.base_lang = base.base_lang
        return merged

    incoming_empty = (
        not incoming.full_name.strip() and len(incoming.entries) == 0 and len(incoming.skills) == 0
    )
    if incoming_empty:
        return base.model_copy(deep=True)

    # 1. Header & Contact (preserve base unless empty/placeholder)
    base_name_clean = base.full_name.strip()
    inc_name_clean = incoming.full_name.strip()
    if base_name_clean and base_name_clean.lower() not in _DUMMY_NAMES:
        full_name = base_name_clean
    elif inc_name_clean and inc_name_clean.lower() not in _DUMMY_NAMES:
        full_name = inc_name_clean
    else:
        full_name = base_name_clean or inc_name_clean or "Candidato"

    base_email = base.contact.email.strip()
    inc_email = incoming.contact.email.strip()
    email = (
        base_email
        if (base_email and base_email.lower() not in _DUMMY_EMAILS)
        else (inc_email or base_email)
    )

    base_phone = base.contact.phone.strip()
    inc_phone = incoming.contact.phone.strip()
    phone = (
        base_phone
        if (base_phone and base_phone not in _DUMMY_PHONES)
        else (inc_phone or base_phone)
    )

    base_loc = base.contact.location.strip()
    inc_loc = incoming.contact.location.strip()
    location = (
        base_loc
        if (base_loc and base_loc.lower() not in _DUMMY_LOCATIONS)
        else (inc_loc if inc_loc.lower() not in _DUMMY_LOCATIONS else (base_loc or inc_loc))
    )

    contact = ContactInfo(
        email=email,
        phone=phone,
        location=location,
        github=base.contact.github or incoming.contact.github,
        linkedin=base.contact.linkedin or incoming.contact.linkedin,
        website=base.contact.website or incoming.contact.website,
    )

    summary = base.summary if (base.summary and base.summary.strip()) else incoming.summary

    # 2. Skills (additive union)
    merged_skills: list[Skill] = [s.model_copy(deep=True) for s in base.skills]
    used_skill_ids: set[str] = {s.id for s in merged_skills}
    known_skill_keys: set[str] = set()
    for s in merged_skills:
        if _norm_key(s.name):
            known_skill_keys.add(_norm_key(s.name))
        for alias in s.aliases:
            if _norm_key(alias):
                known_skill_keys.add(_norm_key(alias))

    for inc_s in incoming.skills:
        s_key = _norm_key(inc_s.name)
        if not s_key or s_key in known_skill_keys:
            continue
        base_s_id = inc_s.id or _slugify(inc_s.name, prefix="skill_")
        s_id = base_s_id
        counter = 2
        while s_id in used_skill_ids:
            s_id = f"{base_s_id}_{counter}"
            counter += 1
        used_skill_ids.add(s_id)
        known_skill_keys.add(s_key)
        for alias in inc_s.aliases:
            if _norm_key(alias):
                known_skill_keys.add(_norm_key(alias))
        merged_skills.append(inc_s.model_copy(deep=True, update={"id": s_id}))

    # 3. Entries (match by kind + normalized org)
    prefix_map: dict[EntryKind, str] = {
        "experience": "exp",
        "project": "proj",
        "education": "edu",
        "certification": "cert",
        "other": "other",
    }

    merged_entries: list[Entry] = [e.model_copy(deep=True) for e in base.entries]
    used_entry_ids: set[str] = {e.id for e in merged_entries}
    existing_by_key: dict[tuple[EntryKind, str], Entry] = {}
    for entry in merged_entries:
        org_key = _norm_key(entry.org)
        if org_key and (entry.kind, org_key) not in existing_by_key:
            existing_by_key[(entry.kind, org_key)] = entry

    for inc_e in incoming.entries:
        org_key = _norm_key(inc_e.org)
        match_key = (inc_e.kind, org_key)

        if org_key and match_key in existing_by_key:
            target = existing_by_key[match_key]

            # 3a. Merge EntryTitles (new role titles become valid non-default variants)
            existing_title_keys = {_norm_key(t.title) for t in target.titles if _norm_key(t.title)}
            used_title_ids = {t.id for t in target.titles}
            has_default = any(t.is_default for t in target.titles)

            for inc_t in inc_e.titles:
                t_key = _norm_key(inc_t.title)
                if not t_key or t_key in existing_title_keys:
                    continue
                t_idx = len(target.titles) + 1
                title_id = f"title_{target.id}_{t_idx}"
                while title_id in used_title_ids:
                    t_idx += 1
                    title_id = f"title_{target.id}_{t_idx}"

                target.titles.append(
                    EntryTitle(
                        id=title_id,
                        entry_id=target.id,
                        title=inc_t.title.strip(),
                        archetype=inc_t.archetype,
                        is_default=not has_default,
                        source="user",
                        approved=True,
                    )
                )
                has_default = True
                existing_title_keys.add(t_key)
                used_title_ids.add(title_id)

            # 3b. Merge Facts (append non-duplicate bullets)
            used_fact_ids = {f.id for f in target.facts}
            next_pos = max((f.position for f in target.facts), default=-1) + 1

            for inc_f in inc_e.facts:
                if _is_duplicate_fact(target.facts, inc_f.text):
                    continue
                f_idx = len(target.facts) + 1
                fact_id = f"fact_{target.id}_{f_idx}"
                while fact_id in used_fact_ids:
                    f_idx += 1
                    fact_id = f"fact_{target.id}_{f_idx}"

                target.facts.append(
                    inc_f.model_copy(
                        deep=True,
                        update={
                            "id": fact_id,
                            "entry_id": target.id,
                            "position": next_pos,
                        },
                    )
                )
                used_fact_ids.add(fact_id)
                next_pos += 1

            # 3c. Fill missing metadata on target entry
            if not target.location and inc_e.location:
                target.location = inc_e.location
            if not target.link and inc_e.link:
                target.link = inc_e.link
            if not target.end_date and inc_e.end_date:
                target.end_date = inc_e.end_date
            for arch in inc_e.archetypes:
                if arch not in target.archetypes:
                    target.archetypes.append(arch)
            for sk_id in inc_e.skill_ids:
                if sk_id not in target.skill_ids:
                    target.skill_ids.append(sk_id)
        else:
            # Append as a new Entry with collision-free IDs
            prefix = prefix_map.get(inc_e.kind, "entry")
            base_id = inc_e.id or _slugify(inc_e.org, prefix=f"{prefix}_")
            entry_id = base_id
            counter = 2
            while entry_id in used_entry_ids:
                entry_id = f"{base_id}_{counter}"
                counter += 1
            used_entry_ids.add(entry_id)

            new_titles: list[EntryTitle] = []
            for t_idx, inc_t in enumerate(inc_e.titles):
                suffix = "default" if t_idx == 0 else str(t_idx + 1)
                new_titles.append(
                    inc_t.model_copy(
                        deep=True,
                        update={
                            "id": f"title_{entry_id}_{suffix}",
                            "entry_id": entry_id,
                            "is_default": t_idx == 0,
                        },
                    )
                )

            new_facts: list[Fact] = []
            for f_idx, inc_f in enumerate(inc_e.facts):
                new_facts.append(
                    inc_f.model_copy(
                        deep=True,
                        update={
                            "id": f"fact_{entry_id}_{f_idx + 1}",
                            "entry_id": entry_id,
                            "position": f_idx,
                        },
                    )
                )

            new_entry = inc_e.model_copy(
                deep=True,
                update={
                    "id": entry_id,
                    "titles": new_titles,
                    "facts": new_facts,
                },
            )
            merged_entries.append(new_entry)
            if org_key:
                existing_by_key[match_key] = new_entry

    sorted_entries = _sort_and_reindex_entries(merged_entries)

    return Profile(
        id=base.id or "default",
        schema_version=base.schema_version or "1.0.0",
        full_name=full_name,
        contact=contact,
        base_lang=base.base_lang or incoming.base_lang,
        summary=summary,
        skills=merged_skills,
        entries=sorted_entries,
    )

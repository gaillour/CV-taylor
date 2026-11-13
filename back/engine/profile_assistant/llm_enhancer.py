"""LLM-driven profile enrichment orchestrator and holistic cleaning/deduplication."""

from __future__ import annotations

from back.engine.llm import LLMClient
from back.engine.models import EntryTitle, Fact, Profile, Skill
from back.engine.profile_assistant.deterministic import (
    _detect_missing_skills_deterministic,
    _distill_context_deterministic,
    _is_forbidden_project_title,
    _polish_fact_deterministic,
    _suggest_titles_deterministic,
)
from back.engine.profile_assistant.taxonomies import (
    CANONICAL_SKILL_MAP,
    EnhanceProfileResponse,
    EnhanceStats,
    _allowed_tech_tokens,
    _is_valid_rewrite,
    _known_skill_tokens,
    _normalize_skill_token,
    _short_id,
)


def _enhance_with_llm(
    profile: Profile,
    llm: LLMClient,
    stats: EnhanceStats,
) -> bool:
    """Run a single batch LLM call to enrich the profile with anti-hallucination checks."""
    entries_payload = []
    for entry in profile.entries:
        if entry.archived:
            continue
        entries_payload.append(
            {
                "entry_id": entry.id,
                "kind": entry.kind,
                "org": entry.org,
                "context": entry.context,
                "existing_titles": [
                    {"title": t.title, "archetype": t.archetype} for t in entry.titles
                ],
                "facts": [{"fact_id": f.id, "text": f.text} for f in entry.facts if f.approved],
            }
        )

    existing_skills = [s.name for s in profile.skills]
    lang = profile.base_lang

    system_prompt = (
        "You are an elite technical resume editor and ATS specialist.\n"
        "Analyze the Master Profile and return a single JSON object with AI suggestions:\n"
        "1. `detected_skills`: Canonical technical skills mentioned in entries/context/facts "
        "missing from `existing_skills`.\n"
        "2. `redundant_skills`: Technical skills in `existing_skills` that are redundant, "
        "duplicates, or obsolete aliases of other skills (e.g. both 'Postgres' and 'PostgreSQL'). "
        "Include `name` and a concise `reason` in the profile's language.\n"
        "3. `redundant_facts`: Bullets that are duplicates, near-duplicates, or redundant "
        "with another bullet in the candidate's profile. Include `fact_id` and a concise "
        "`reason` in the profile's language explaining why it should be removed. "
        "CRITICAL: If a bullet should be removed, ALWAYS list it here. NEVER return an empty proposed_text in `improved_facts`.\n"
        "4. `entries`: For each entry:\n"
        "   - `distilled_facts`: If `context` contains achievements not yet in `facts`, "
        "extract 1-3 atomic bullets (16-24 words, nominal/action style).\n"
        "   - `improved_facts`: For existing `facts` that can be phrased with stronger ATS "
        "impact, provide `fact_id` and `proposed_text`. (STRICT: `proposed_text` must NEVER be empty or a deletion placeholder; use `redundant_facts` instead).\n"
        "   - `suggested_titles`: Up to 2 alternative titles tailored to "
        "archetypes (`backend`, `frontend`, `fullstack`, `data`, `devops`).\n"
        "     * For `experience` entries: Suggest job/role titles tailored to archetypes (e.g. 'Backend Engineer', 'Desarrollador Full Stack').\n"
        "     * For `project` entries: Suggest concise, descriptive artifact/system/product titles (e.g. 'Simulador de Físicas 2D', 'API Gateway Distribuido'). STRICTLY PROHIBITED: NEVER suggest employment job titles (e.g. 'Software Developer', 'Backend Engineer') for projects.\n"
        "STRICT ANTI-HALLUCINATION RULES:\n"
        "- NEVER invent numbers, percentages, latencies, or metrics not in original text.\n"
        "- NEVER introduce technologies not mentioned in the candidate's profile.\n"
        "- Match the language of the profile (`es` or `en`).\n"
        "Return ONLY valid JSON matching:\n"
        "{\n"
        '  "detected_skills": [{"name": "...", "category": "Backend"}],\n'
        '  "redundant_skills": [{"name": "...", "reason": "..."}],\n'
        '  "redundant_facts": [{"fact_id": "...", "reason": "..."}],\n'
        '  "entries": [\n'
        "    {\n"
        '      "entry_id": "...",\n'
        '      "distilled_facts": ["..."],\n'
        '      "improved_facts": [{"fact_id": "...", "proposed_text": "..."}],\n'
        '      "suggested_titles": [{"title": "...", "archetype": "backend"}]\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        f"Profile Language: {lang}\nExisting Skills: {existing_skills}\nEntries:\n{entries_payload}"
    )

    try:
        data = llm.parse_json_completion(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
    except Exception:
        return False

    if not isinstance(data, dict):
        return False

    known_tokens = _known_skill_tokens(profile.skills)
    raw_skills = data.get("detected_skills", [])
    llm_skill_names: list[str] = []
    if isinstance(raw_skills, list):
        for item in raw_skills:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            cat = str(item.get("category", "Herramientas")).strip() or "Herramientas"
            if not name:
                continue
            norm = _normalize_skill_token(name)
            if norm in known_tokens:
                continue
            known_tokens.add(norm)
            llm_skill_names.append(name)
            profile.skills.append(
                Skill(
                    id=_short_id("skill_ai"),
                    name=name,
                    category=cat,
                    aliases=[name.lower()],
                    tags=["dev"],
                    source="ai",
                    approved=False,
                    approved_at=None,
                )
            )
            stats.detected_skills += 1

    # Mark redundant skills recommended for removal
    raw_redundant_skills = data.get("redundant_skills", [])
    if isinstance(raw_redundant_skills, list):
        skill_reasons = {
            str(item.get("name", "")).strip().lower(): str(item.get("reason", "Habilidad redundante o duplicada")).strip()
            for item in raw_redundant_skills
            if isinstance(item, dict) and item.get("name")
        }
        for skill in profile.skills:
            norm_sk = skill.name.strip().lower()
            if norm_sk in skill_reasons:
                skill.marked_for_removal = True
                skill.removal_reason = skill_reasons[norm_sk]
                stats.redundant_skills_marked += 1

    # Mark redundant facts recommended for removal
    raw_redundant_facts = data.get("redundant_facts", [])
    if isinstance(raw_redundant_facts, list):
        fact_reasons = {
            str(item.get("fact_id", "")): str(item.get("reason", "Viñeta redundante o duplicada")).strip()
            for item in raw_redundant_facts
            if isinstance(item, dict) and item.get("fact_id")
        }
        for entry in profile.entries:
            for fact in entry.facts:
                if fact.id in fact_reasons:
                    fact.marked_for_removal = True
                    fact.removal_reason = fact_reasons[fact.id]
                    stats.redundant_facts_marked += 1

    entries_by_id = {e.id: e for e in profile.entries}
    raw_entries = data.get("entries", [])
    if isinstance(raw_entries, list):
        for e_item in raw_entries:
            if not isinstance(e_item, dict):
                continue
            eid = str(e_item.get("entry_id", ""))
            entry = entries_by_id.get(eid)
            if not entry:
                continue

            allowed_techs = _allowed_tech_tokens(profile, entry, llm_skill_names)
            existing_fact_lows = {f.text.lower().strip().rstrip(".") for f in entry.facts}
            next_pos = max((f.position for f in entry.facts), default=-1) + 1

            if (entry.context or "").strip():
                for d_text in e_item.get("distilled_facts", []) or []:
                    if not isinstance(d_text, str):
                        continue
                    clean_d = d_text.strip()
                    if not _is_valid_rewrite(clean_d, [entry.context, entry.org], allowed_techs):
                        continue
                    if clean_d.lower().rstrip(".") in existing_fact_lows:
                        continue
                    existing_fact_lows.add(clean_d.lower().rstrip("."))
                    entry.facts.append(
                        Fact(
                            id=_short_id("fact_ai"),
                            entry_id=entry.id,
                            text=clean_d,
                            tags=list(entry.archetypes) or ["dev"],
                            skill_ids=[],
                            position=next_pos,
                            weight=100,
                            default_selected=True,
                            source="ai",
                            approved=False,
                            approved_at=None,
                        )
                    )
                    next_pos += 1
                    stats.distilled_facts += 1

            facts_by_id = {f.id: f for f in entry.facts if f.approved}
            for imp in e_item.get("improved_facts", []) or []:
                if not isinstance(imp, dict):
                    continue
                fid = str(imp.get("fact_id", ""))
                prop_text = str(imp.get("proposed_text", "")).strip()
                target_fact = facts_by_id.get(fid)
                if not target_fact:
                    continue

                if not prop_text or prop_text.lower() in (
                    "eliminar",
                    "borrar",
                    "delete",
                    "remove",
                    "n/a",
                    "none",
                    "redundante",
                    "duplicada",
                ):
                    if not target_fact.marked_for_removal:
                        target_fact.marked_for_removal = True
                        target_fact.removal_reason = "Viñeta vacía o redundante recomendada para eliminación"
                        stats.redundant_facts_marked += 1
                    continue

                if prop_text.lower().rstrip(".") == target_fact.text.lower().strip().rstrip("."):
                    continue
                if _is_valid_rewrite(
                    prop_text,
                    [target_fact.text, entry.context, entry.org],
                    allowed_techs,
                ):
                    target_fact.proposed_text = prop_text
                    stats.improved_facts += 1

            existing_titles = {t.title.lower().strip() for t in entry.titles}
            for t_item in e_item.get("suggested_titles", []) or []:
                if not isinstance(t_item, dict):
                    continue
                t_str = str(t_item.get("title", "")).strip()
                arch = str(t_item.get("archetype", "")).strip() or None
                if not t_str or t_str.lower() in existing_titles:
                    continue
                if entry.kind == "project" and _is_forbidden_project_title(t_str):
                    continue
                existing_titles.add(t_str.lower())
                entry.titles.append(
                    EntryTitle(
                        id=_short_id("title_ai"),
                        entry_id=entry.id,
                        title=t_str,
                        archetype=arch,
                        is_default=False,
                        source="ai",
                        approved=False,
                        approved_at=None,
                    )
                )
                stats.suggested_titles += 1

    return True


def clean_and_deduplicate_profile(profile: Profile) -> Profile:
    """Normalize canonical skills, merge duplicates, and deduplicate identical facts."""
    canonical_skills: dict[str, Skill] = {}
    for skill in profile.skills:
        norm_name = skill.name.strip().lower()
        canon_name = CANONICAL_SKILL_MAP.get(norm_name, skill.name.strip())
        key = canon_name.lower().replace(" ", "").replace(".", "")

        if key in canonical_skills:
            target = canonical_skills[key]
            if skill.name != target.name and skill.name not in target.aliases:
                target.aliases.append(skill.name)
            for a in skill.aliases:
                if a not in target.aliases and a != target.name:
                    target.aliases.append(a)
            if skill.approved and not target.approved:
                target.approved = True
                target.source = skill.source
        else:
            updated_skill = skill.model_copy(deep=True, update={"name": canon_name})
            canonical_skills[key] = updated_skill

    profile.skills = list(canonical_skills.values())

    for entry in profile.entries:
        seen_facts: list[str] = []
        unique_facts: list[Fact] = []
        for fact in entry.facts:
            norm_fact = fact.text.strip().lower()
            if norm_fact not in seen_facts:
                seen_facts.append(norm_fact)
                unique_facts.append(fact)
        entry.facts = unique_facts

    return profile


def enhance_profile(profile: Profile, llm: LLMClient | None = None) -> EnhanceProfileResponse:
    """Run a unified AI + deterministic enrichment pass on the Master Profile.

    All generated items enter with `source="ai", approved=False` (or `proposed_text` on Facts)
    so the candidate can review, approve, or discard them in one step.
    """
    working = clean_and_deduplicate_profile(profile.model_copy(deep=True))

    working.skills = [s for s in working.skills if s.approved]
    for entry in working.entries:
        entry.titles = [t for t in entry.titles if t.approved]
        entry.facts = [f for f in entry.facts if f.approved]
        for f in entry.facts:
            f.proposed_text = None

    stats = EnhanceStats()
    lang = working.base_lang
    used_llm = False

    if llm is not None and llm.is_configured:
        used_llm = _enhance_with_llm(working, llm, stats)

    # Supplement with deterministic skill detection for known tech tokens
    det_skills = _detect_missing_skills_deterministic(working)
    if det_skills:
        working.skills.extend(det_skills)
        stats.detected_skills += len(det_skills)

    # Fallback deterministic pass if LLM was not used or failed
    if not used_llm:
        for entry in working.entries:
            if entry.archived:
                continue

            allowed_techs = _allowed_tech_tokens(working, entry, [])

            distilled = _distill_context_deterministic(entry, lang)
            if distilled:
                entry.facts.extend(distilled)
                stats.distilled_facts += len(distilled)

            for fact in entry.facts:
                if not fact.approved:
                    continue
                polished = _polish_fact_deterministic(fact.text, lang)
                if polished and _is_valid_rewrite(
                    polished, [fact.text, entry.context, entry.org], allowed_techs
                ):
                    fact.proposed_text = polished
                    stats.improved_facts += 1

            sug_titles = _suggest_titles_deterministic(entry, lang)
            if sug_titles:
                entry.titles.extend(sug_titles)
                stats.suggested_titles += len(sug_titles)

    return EnhanceProfileResponse(
        profile=working,
        stats=stats,
        used_llm=used_llm,
    )

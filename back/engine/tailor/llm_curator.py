"""LLM curation, anti-hallucination bullet adaptation, and resume harmonization."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from ..anti_hallucination import AntiHallucinationValidator
from ..llm import LLMClient
from ..models import (
    Entry,
    Fact,
    JobSpec,
    LangCode,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
)

CURATE_PROFILE_SYSTEM_PROMPT: str = (
    "You are an elite technical recruiter and CV curator. Your goal is to curate the "
    "most compelling, relevant 1-page CV for a candidate applying to a target job.\n"
    "STRICT CURATION RULES:\n"
    "1. RELEVANCE FIRST: Only select entries that provide direct or strong transferable "
    "value to the target role. Do NOT include unrelated jobs/roles (e.g., retail, sales, "
    "mystery shopper) if the target role is software/technical, even if there are empty "
    "slots.\n"
    "2. EDUCATION HIERARCHY: If the candidate has university or higher education "
    "(whether in progress or completed), DO NOT include secondary school (high school / "
    "bachillerato / secundario) UNLESS the job explicitly requests it.\n"
    "3. RESPECT SECTION CAPS:\n"
    "   - 'experience': Maximum 3 entries (fewer is great if others are irrelevant).\n"
    "   - 'project': Maximum 3 entries.\n"
    "   - 'education': Maximum 2 entries (usually 1 university entry is ideal).\n"
    "4. FOR EACH SELECTED ENTRY: Select between `min_bullets` and `max_bullets` of the "
    "most impactful `fact_ids`.\n"
    "5. OUTPUT ONLY a JSON object mapping entry_id to a list of fact_ids:\n"
    "{\n"
    '  "selected": [\n'
    '    {"entry_id": "...", "fact_ids": ["...", "..."]}\n'
    "  ]\n"
    "}"
)


def curate_profile_with_llm(
    client: LLMClient,
    profile: Profile,
    job_spec: JobSpec,
    target_lang: LangCode,
) -> dict[str, list[str]] | None:
    """Call LLM once as an elite recruiter to curate entries and facts for the target role.

    Returns a dictionary mapping selected `entry_id` to chosen `fact_ids`, or None on fallback.
    """
    if not client.is_configured:
        return None

    candidates = [e for e in profile.entries if not e.archived]
    if not candidates:
        return None

    entries_manifest = []
    for e in candidates:
        title_obj = e.select_title(archetype=job_spec.archetype)
        facts_list = [{"id": f.id, "text": f.text} for f in e.facts if f.approved]
        entries_manifest.append(
            {
                "entry_id": e.id,
                "kind": e.kind,
                "org": e.org,
                "title": title_obj.title,
                "date_range": e.format_date_range(target_lang),
                "context": e.context,
                "min_bullets": e.min_bullets,
                "max_bullets": e.max_bullets,
                "facts": facts_list,
            }
        )

    user_prompt = (
        f"Target Role: {job_spec.role or 'Software Engineer'}\n"
        f"Target Archetype: {job_spec.archetype or 'dev'}\n"
        f"Target Keywords: {', '.join(job_spec.keywords)}\n"
        f"Candidate Entries Pool:\n{entries_manifest}"
    )

    messages = [
        {"role": "system", "content": CURATE_PROFILE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        res = client.parse_json_completion(messages, temperature=0.1)
        if (
            not isinstance(res, dict)
            or "selected" not in res
            or not isinstance(res["selected"], list)
        ):
            return None

        curated_map: dict[str, list[str]] = {}
        valid_entry_ids = {e.id: e for e in candidates}

        for item in res["selected"]:
            if not isinstance(item, dict):
                continue
            eid = item.get("entry_id")
            fids = item.get("fact_ids", [])
            if eid in valid_entry_ids and isinstance(fids, list):
                entry_obj = valid_entry_ids[eid]
                valid_fids = {f.id for f in entry_obj.facts if f.approved}
                curated_fids = [fid for fid in fids if fid in valid_fids]
                # Discard entire block if LLM selected 0 facts for an experience/project that has facts
                if entry_obj.kind in {"experience", "project"} and entry_obj.facts and not curated_fids:
                    continue
                curated_map[eid] = curated_fids

        return curated_map if curated_map else None
    except Exception:
        return None


def adapt_bullets_with_llm(
    client: LLMClient,
    validator: AntiHallucinationValidator,
    entry: Entry,
    selected_facts: list[Fact],
    job_spec: JobSpec,
    target_lang: LangCode,
    fallback_builder: Callable[[list[Fact], set[str]], list[RenderBullet]],
) -> list[RenderBullet]:
    """Use LLM to rewrite selected bullets with action verbs while retaining exact truth."""
    if not client.is_configured:
        return fallback_builder(selected_facts, set())

    facts_payload = [
        {"id": f.id, "text": f.text, "skills": f.skill_ids}
        for f in selected_facts
    ]

    lang_rule = (
        "Write exclusively in English (e.g. 'Automation of CI/CD pipelines...')."
        if target_lang == "en"
        else "Escribe exclusivamente en Español (ej. 'Automatización de pipelines...')."
    )

    system_prompt = (
        "You are an elite resume editor optimizing for ATS and human technical recruiters. "
        "Rewrite the candidate's factual achievements for the target role.\n"
        "STRICT RULES (ANY VIOLATION WILL REJECT YOUR OUTPUT):\n"
        "1. NEVER invent metrics, numbers, percentages, or scale. Every number "
        "MUST come directly from the source fact.\n"
        "2. NEVER add tools or skills not in source facts or candidate skills.\n"
        f"3. {lang_rule}\n"
        "4. Write each bullet in executive third-person or action nominal style.\n"
        "5. Keep each bullet between 16 and 24 words for optimal 1-page visual flow.\n"
        "6. Cite the exact source fact ID in 'fact_ids'.\n"
        "Respond ONLY with a JSON array of objects:\n"
        '[{"fact_id": "...", "text": "...", "skill_ids": ["..."]}]'
    )

    user_prompt = (
        f"Target Role: {job_spec.role or 'Software Engineer'}\n"
        f"Target Language: {target_lang}\n"
        f"Target Keywords: {', '.join(job_spec.keywords)}\n"
        f"Organization: {entry.org}\n"
        f"Facts to rewrite:\n{facts_payload}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        raw_rewrites = client.parse_json_completion(messages, temperature=0.2)
        if not isinstance(raw_rewrites, list):
            if isinstance(raw_rewrites, dict) and "bullets" in raw_rewrites:
                raw_rewrites = raw_rewrites["bullets"]
            else:
                return fallback_builder(selected_facts, set())

        rewritten_bullets: list[RenderBullet] = []
        facts_map = {f.id: f for f in selected_facts}

        for item in raw_rewrites:
            fid = item.get("fact_id")
            text = item.get("text", "").strip()
            if not fid or fid not in facts_map or not text:
                continue

            candidate_bullet = RenderBullet(
                text=text,
                fact_ids=[fid],
                skill_ids=item.get("skill_ids", facts_map[fid].skill_ids),
                priority=facts_map[fid].weight,
                pinned=facts_map[fid].pinned,
                position=facts_map[fid].position,
            )

            # Validate against hallucinations
            violations = validator.validate_bullet(candidate_bullet)
            safe_opts = validator.suggest_alternatives(
                candidate_bullet, violations=violations, lang=target_lang
            )
            if violations:
                # Ground firmly into the safest source alternative
                orig = facts_map[fid]
                candidate_bullet = RenderBullet(
                    text=safe_opts[0] if safe_opts else orig.text,
                    fact_ids=[orig.id],
                    skill_ids=list(orig.skill_ids),
                    priority=orig.weight,
                    pinned=orig.pinned,
                    position=orig.position,
                    suggested_alternatives=safe_opts,
                )
            else:
                candidate_bullet.suggested_alternatives = safe_opts

            rewritten_bullets.append(candidate_bullet)

        return rewritten_bullets or fallback_builder(selected_facts, set())
    except Exception:
        return fallback_builder(selected_facts, set())


def harmonize_resume(
    client: LLMClient,
    validator: AntiHallucinationValidator,
    model: RenderModel,
    job_spec: JobSpec,
) -> RenderModel:
    """Single editorial consistency pass over a physically fitted 1-page skeleton.

    Harmonizes tone, active voice, and coherence across the surviving pruned entries
    while strictly preserving atomic fact provenance and zero-hallucination invariants.
    """
    if not client.is_configured:
        return model

    experience_payload = [
        {
            "entry_id": e.entry_id,
            "title": e.title,
            "org": e.org,
            "bullets": [
                {"fact_ids": b.fact_ids, "text": b.text, "skill_ids": b.skill_ids}
                for b in e.bullets
            ],
        }
        for e in model.experience
    ]
    projects_payload = [
        {
            "entry_id": p.entry_id,
            "title": p.title,
            "org": p.org,
            "bullets": [
                {"fact_ids": b.fact_ids, "text": b.text, "skill_ids": b.skill_ids}
                for b in p.bullets
            ],
        }
        for p in model.projects
    ]
    education_payload = [
        {
            "entry_id": ed.entry_id,
            "title": ed.title,
            "org": ed.org,
            "bullets": [
                {"fact_ids": b.fact_ids, "text": b.text, "skill_ids": b.skill_ids}
                for b in ed.bullets
            ],
        }
        for ed in model.education
    ]

    lang_directive = (
        "Ensure the entire resume (summary, titles, bullets) is strictly in English."
        if model.lang == "en"
        else "Ensure the entire resume (summary, titles, bullets) is strictly in Spanish."
    )

    system_prompt = (
        "You are an elite executive CV editor performing a final editorial consistency pass. "
        "The candidate's resume has already been physically fitted to 1 page A4.\n"
        "Your task is to harmonize style, tone, and flow across the entire CV "
        "so it reads as a unified, compelling technical narrative.\n"
        f"LANGUAGE DIRECTIVE: {lang_directive}\n"
        "STRICT INVARIANTS (ANY VIOLATION WILL BE REJECTED BY AUTOMATED LINTERS):\n"
        "1. NEVER invent, alter, or round numbers, percentages, or scale. Every single number "
        "must come verbatim from the original bullet.\n"
        "2. NEVER introduce unauthorized tools, frameworks, or languages not present "
        "in original bullets or skills.\n"
        "3. Keep each bullet concise (16-24 words) in professional executive third-person or "
        "action nominal style.\n"
        "4. Translate or adapt entry titles to match the Target Language.\n"
        "5. Do NOT add or drop bullets. Every output bullet must preserve the exact "
        "'fact_ids' of its source.\n"
        "Respond ONLY with a JSON object in this exact schema:\n"
        "{\n"
        '  "summary": "...",\n'
        '  "experience": [{"entry_id": "...", "title": "...", "bullets": '
        '[{"fact_ids": ["..."], "text": "...", "skill_ids": ["..."]}]}],\n'
        '  "projects": [{"entry_id": "...", "title": "...", "bullets": '
        '[{"fact_ids": ["..."], "text": "...", "skill_ids": ["..."]}]}],\n'
        '  "education": [{"entry_id": "...", "title": "...", "bullets": '
        '[{"fact_ids": ["..."], "text": "...", "skill_ids": ["..."]}]}]\n'
        "}"
    )

    allowed_skills = sorted(validator.whitelist)
    allowed_skills_str = ", ".join(allowed_skills) if allowed_skills else "None specified"

    user_prompt = (
        f"Target Role: {job_spec.role or 'Software Engineer'}\n"
        f"Target Language: {model.lang}\n"
        f"Target Keywords: {', '.join(job_spec.keywords)}\n"
        f"Candidate Allowed Technologies (STRICT WHITELIST - DO NOT claim knowledge/specialization outside this list): {allowed_skills_str}\n"
        f"Original Summary:\n{model.summary or ''}\n\n"
        f"Surviving Experience Entries:\n{experience_payload}\n\n"
        f"Surviving Project Entries:\n{projects_payload}\n\n"
        f"Surviving Education Entries:\n{education_payload}\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        res = client.parse_json_completion(messages, temperature=0.2)
        if not isinstance(res, dict):
            return model

        def update_entry_bullets(
            original_entries: list[RenderEntry],
            raw_entries: list[dict[str, Any]],
        ) -> list[RenderEntry]:
            raw_by_id = {
                item.get("entry_id"): item
                for item in raw_entries
                if isinstance(item, dict) and "entry_id" in item
            }
            updated_entries: list[RenderEntry] = []
            for orig_entry in original_entries:
                item = raw_by_id.get(orig_entry.entry_id)
                if not item:
                    updated_entries.append(orig_entry)
                    continue

                # Update title if localized / harmonized
                new_title = orig_entry.title
                cand_title = item.get("title")
                if isinstance(cand_title, str) and cand_title.strip():
                    new_title = cand_title.strip()

                new_bullets_raw = item.get("bullets", [])
                if not new_bullets_raw or not isinstance(new_bullets_raw, list):
                    updated_entries.append(orig_entry.model_copy(update={"title": new_title}))
                    continue

                rewritten_by_fid: dict[str, str] = {}
                for b_item in new_bullets_raw:
                    if isinstance(b_item, dict):
                        fids = b_item.get("fact_ids", [])
                        txt = b_item.get("text", "").strip()
                        if fids and txt:
                            rewritten_by_fid[str(fids[0])] = txt

                harmonized_bullets: list[RenderBullet] = []
                for idx, orig_b in enumerate(orig_entry.bullets):
                    cand_text = None
                    if orig_b.fact_ids and orig_b.fact_ids[0] in rewritten_by_fid:
                        cand_text = rewritten_by_fid[orig_b.fact_ids[0]]
                    elif idx < len(new_bullets_raw) and isinstance(new_bullets_raw[idx], dict):
                        cand_text = new_bullets_raw[idx].get("text", "").strip()

                    if not cand_text:
                        harmonized_bullets.append(orig_b)
                        continue

                    cand_bullet = RenderBullet(
                        text=cand_text,
                        fact_ids=orig_b.fact_ids,
                        skill_ids=orig_b.skill_ids,
                        priority=orig_b.priority,
                        pinned=orig_b.pinned,
                        position=orig_b.position,
                    )

                    violations = validator.validate_bullet(cand_bullet)
                    if violations:
                        harmonized_bullets.append(orig_b)
                    else:
                        harmonized_bullets.append(cand_bullet)

                updated_entries.append(
                    orig_entry.model_copy(
                        update={"title": new_title, "bullets": harmonized_bullets}
                    )
                )
            return updated_entries

        new_exp = update_entry_bullets(model.experience, res.get("experience", []))
        new_proj = update_entry_bullets(model.projects, res.get("projects", []))
        new_edu = update_entry_bullets(model.education, res.get("education", []))

        new_summary = model.summary
        raw_summary = res.get("summary")
        if isinstance(raw_summary, str) and raw_summary.strip():
            trial_model = model.model_copy(update={"summary": raw_summary.strip()})
            val = validator.validate_model(trial_model)
            summary_violations = [v for v in val.violations if v.section == "summary"]
            if not summary_violations:
                new_summary = raw_summary.strip()

        return model.model_copy(
            update={
                "summary": new_summary,
                "experience": new_exp,
                "projects": new_proj,
                "education": new_edu,
            }
        )
    except Exception:
        return model

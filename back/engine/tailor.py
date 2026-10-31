"""Tailoring engine: intelligent profile adaptation, bullet rewriting, and ATS alignment."""

from __future__ import annotations

from typing import Any

from .anti_hallucination import AntiHallucinationValidator
from .extractor import matches_archetype
from .llm import LLMClient
from .models import (
    MAX_EDUCATION_ENTRIES,
    MAX_EXPERIENCE_ENTRIES,
    MAX_PROJECT_ENTRIES,
    DesignKnobs,
    Entry,
    Fact,
    JobSpec,
    LangCode,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
    RenderSkillGroup,
    Skill,
    ThemeName,
)


def _score_fact_relevance(fact: Fact, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate matching score between a Fact and target job requirements."""
    score = fact.weight
    if fact.pinned:
        score += 50
    if fact.default_selected:
        score += 20
    if archetype and matches_archetype(archetype, fact.tags):
        score += 35

    fact_text_lower = fact.text.lower()
    for kw in keywords_lower:
        if kw in fact_text_lower:
            score += 25
        if any(kw in sk.lower() for sk in fact.skill_ids):
            score += 30
    return score


def _score_entry_affinity(entry: Entry, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate target relevance (keywords + archetype) excluding base position/default weights."""
    affinity = 0
    if archetype and matches_archetype(archetype, entry.archetypes):
        affinity += 40

    for fact in entry.facts:
        if not fact.approved:
            continue
        f_text_low = fact.text.lower()
        for kw in keywords_lower:
            if kw in f_text_low or any(kw in sk.lower() for sk in fact.skill_ids):
                affinity += 15
    return affinity


def _score_entry_relevance(entry: Entry, keywords_lower: set[str], archetype: str | None) -> int:
    """Calculate matching score between an Entry and target job requirements."""
    # Base position score: education positions are often 10..20, so use gentle decay
    score = entry.position * -2
    score += _score_entry_affinity(entry, keywords_lower, archetype)
    if entry.default_selected:
        score += 15

    for fact in entry.facts:
        if not fact.approved:
            continue
        score += _score_fact_relevance(fact, keywords_lower, archetype) // 10
    return score


class TailorEngine:
    """Core engine to adapt a Master Profile to a specific JobSpec."""

    def __init__(
        self,
        profile: Profile,
        client: LLMClient | None = None,
    ) -> None:
        self.profile = profile
        self.client = client or LLMClient()
        self.validator = AntiHallucinationValidator(profile)

    def _select_skills(
        self,
        target_lang: LangCode,
        keywords_lower: set[str],
        archetype: str | None,
    ) -> list[RenderSkillGroup]:
        """Prioritize and group candidate skills matching the target role."""
        grouped: dict[str, list[tuple[int, Skill]]] = {}

        for sk in self.profile.skills:
            if not sk.approved:
                continue
            score = 0
            sk_name_low = sk.name.lower()
            if sk_name_low in keywords_lower:
                score += 50
            if any(alias.lower() in keywords_lower for alias in sk.aliases):
                score += 40
            if archetype and archetype in sk.tags:
                score += 20

            cat = sk.category_label()
            grouped.setdefault(cat, []).append((score, sk))

        skill_groups: list[RenderSkillGroup] = []
        for cat, scored_skills in grouped.items():
            # Sort skills by score descending, then by name
            scored_skills.sort(key=lambda item: (-item[0], item[1].name))
            skills = [s for _, s in scored_skills]
            skill_groups.append(
                RenderSkillGroup(
                    category=cat,
                    items=", ".join(s.display_label() for s in skills),
                    skill_ids=[s.id for s in skills],
                )
            )
        return skill_groups

    def _curate_profile_with_llm(
        self,
        job_spec: JobSpec,
        target_lang: LangCode,
    ) -> dict[str, list[str]] | None:
        """Call LLM once as an elite recruiter to curate entries and facts for the target role.

        Returns a dictionary mapping selected `entry_id` to chosen `fact_ids`, or None on fallback.
        """
        if not self.client.is_configured:
            return None

        candidates = [e for e in self.profile.entries if not e.archived]
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

        system_prompt = (
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

        user_prompt = (
            f"Target Role: {job_spec.role or 'Software Engineer'}\n"
            f"Target Archetype: {job_spec.archetype or 'dev'}\n"
            f"Target Keywords: {', '.join(job_spec.keywords)}\n"
            f"Candidate Entries Pool:\n{entries_manifest}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            res = self.client.parse_json_completion(messages, temperature=0.1)
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

    def _select_entries(
        self,
        kind: str,
        max_count: int,
        keywords_lower: set[str],
        archetype: str | None,
    ) -> list[Entry]:
        """Select top relevant entries for a section up to the ATS slot maximum."""
        candidates = [e for e in self.profile.entries if e.kind == kind and not e.archived]
        if not candidates:
            return []

        scored = []
        for e in candidates:
            aff = _score_entry_affinity(e, keywords_lower, archetype)
            rel = _score_entry_relevance(e, keywords_lower, archetype)
            scored.append((rel, aff, e))

        scored.sort(key=lambda item: (-item[0], item[2].position))

        # Pre-detect if candidate has higher education (university/college/institute)
        higher_education_ids: set[str] = set()
        if kind == "education":
            for e in candidates:
                is_secondary = any(
                    term in (e.org + " " + e.select_title().title).lower()
                    for term in [
                        "secundario",
                        "secundaria",
                        "bachiller",
                        "bachillerato",
                        "polimodal",
                        "high school",
                    ]
                )
                if not is_secondary:
                    higher_education_ids.add(e.id)

        selected: list[Entry] = []

        for _, aff, entry in scored:
            if len(selected) >= max_count:
                break

            # Section-specific rules
            if kind == "education":
                is_secondary = any(
                    term in (entry.org + " " + entry.select_title().title).lower()
                    for term in [
                        "secundario",
                        "secundaria",
                        "bachiller",
                        "bachillerato",
                        "polimodal",
                        "high school",
                    ]
                )
                # If the candidate has university education, do not include secondary school
                # unless secondary school has positive keyword affinity for the job
                if is_secondary and higher_education_ids and aff <= 0:
                    continue

            elif kind == "project":
                # Projects require positive affinity or archetype match; do not force irrelevant projects
                archetype_match = bool(
                    archetype and matches_archetype(archetype, entry.archetypes)
                )
                if aff <= 0 and not (entry.default_selected and archetype_match):
                    continue

            elif kind == "experience":
                # The first entry can be the top relevant/default entry.
                # Additional entries (slot 2 and 3) require affinity > 0 or default + archetype
                if len(selected) >= 1:
                    archetype_match = bool(
                        archetype and matches_archetype(archetype, entry.archetypes)
                    )
                    if aff <= 0 and not (entry.default_selected and archetype_match):
                        continue

            selected.append(entry)

        # Safety floor for experience: if nothing matched at all, provide the top base entry
        if not selected and scored and kind == "experience":
            selected.append(scored[0][2])

        return selected

    def _adapt_bullets_with_llm(
        self,
        entry: Entry,
        selected_facts: list[Fact],
        job_spec: JobSpec,
        target_lang: LangCode,
    ) -> list[RenderBullet]:
        """Use LLM to rewrite selected bullets with action verbs while retaining exact truth."""
        if not self.client.is_configured:
            return self._build_deterministic_bullets(selected_facts, keywords_lower=set())

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
            raw_rewrites = self.client.parse_json_completion(messages, temperature=0.2)
            if not isinstance(raw_rewrites, list):
                if isinstance(raw_rewrites, dict) and "bullets" in raw_rewrites:
                    raw_rewrites = raw_rewrites["bullets"]
                else:
                    return self._build_deterministic_bullets(selected_facts, keywords_lower=set())

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
                violations = self.validator.validate_bullet(candidate_bullet)
                safe_opts = self.validator.suggest_alternatives(
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

            return rewritten_bullets or self._build_deterministic_bullets(
                selected_facts, keywords_lower=set()
            )
        except Exception:
            return self._build_deterministic_bullets(
                selected_facts, keywords_lower=set()
            )

    def _build_deterministic_bullets(
        self,
        selected_facts: list[Fact],
        keywords_lower: set[str],
    ) -> list[RenderBullet]:
        """Build bullets deterministically without LLM."""
        return [
            RenderBullet(
                text=f.text,
                fact_ids=[f.id],
                skill_ids=list(f.skill_ids),
                priority=f.weight,
                pinned=f.pinned,
                position=f.position,
            )
            for f in selected_facts
        ]

    def tailor(
        self,
        job_spec: JobSpec,
        *,
        theme: ThemeName = "classic",
        lang: LangCode | None = None,
        use_llm: bool = True,
    ) -> RenderModel:
        """Tailor the Master Profile to the specified JobSpec."""
        target_lang: LangCode = lang or job_spec.lang or self.profile.default_lang
        font_family = "Liberation Serif" if theme == "engineering" else "Liberation Sans"
        design = DesignKnobs.from_density(0.0, font_family=font_family)
        keywords_lower = {kw.lower() for kw in job_spec.keywords}
        archetype = job_spec.archetype

        # 1. Skills
        skill_groups = self._select_skills(target_lang, keywords_lower, archetype)

        # 2. Entries selection (LLM curation with fallback to deterministic selection)
        curated_map: dict[str, list[str]] | None = None
        if use_llm and self.client.is_configured:
            curated_map = self._curate_profile_with_llm(job_spec, target_lang)

        if curated_map is not None:
            entries_by_id = {e.id: e for e in self.profile.entries if not e.archived}
            exp_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "experience"
            ][:MAX_EXPERIENCE_ENTRIES]
            proj_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "project"
            ][:MAX_PROJECT_ENTRIES]
            edu_entries = [
                entries_by_id[eid]
                for eid in curated_map
                if eid in entries_by_id and entries_by_id[eid].kind == "education"
            ][:MAX_EDUCATION_ENTRIES]
        else:
            exp_entries = self._select_entries(
                "experience", MAX_EXPERIENCE_ENTRIES, keywords_lower, archetype
            )
            proj_entries = self._select_entries(
                "project", MAX_PROJECT_ENTRIES, keywords_lower, archetype
            )
            edu_entries = self._select_entries(
                "education", MAX_EDUCATION_ENTRIES, keywords_lower, archetype
            )

        def process_section(entries: list[Entry]) -> list[RenderEntry]:
            rendered_entries: list[RenderEntry] = []
            for entry in entries:
                selected_title = entry.select_title(archetype=archetype)
                approved_facts = [f for f in entry.facts if f.approved]
                facts_map = {f.id: f for f in approved_facts}

                # Check if curated by LLM
                curated_fids = curated_map.get(entry.id) if curated_map else None
                if curated_fids:
                    chosen_facts = [facts_map[fid] for fid in curated_fids if fid in facts_map]
                else:
                    chosen_facts = []

                if not chosen_facts:
                    # Rank facts by relevance
                    scored_facts = [
                        (_score_fact_relevance(f, keywords_lower, archetype), f)
                        for f in approved_facts
                    ]
                    scored_facts.sort(key=lambda item: (-item[0], item[1].position))
                    facts = [f for _, f in scored_facts]

                    # Respect entry slot limits
                    target_count = min(len(facts), entry.max_bullets or 4)
                    target_count = max(target_count, entry.min_bullets)
                    chosen_facts = facts[:target_count]

                if use_llm and self.client.is_configured:
                    bullets = self._adapt_bullets_with_llm(
                        entry, chosen_facts, job_spec, target_lang
                    )
                else:
                    bullets = self._build_deterministic_bullets(chosen_facts, keywords_lower)

                if entry.kind in {"experience", "project"} and not bullets:
                    # Skip empty entries without bullets to avoid leaving isolated titles
                    continue

                rendered_entries.append(
                    RenderEntry(
                        entry_id=entry.id,
                        title=selected_title.title,
                        title_id=selected_title.id,
                        org=entry.org,
                        location=entry.location,
                        date_label=entry.format_date_range(target_lang),
                        link=entry.link,
                        bullets=bullets,
                        min_bullets=entry.min_bullets,
                        max_bullets=entry.max_bullets,
                    )
                )
            return rendered_entries

        experience = process_section(exp_entries)
        projects = process_section(proj_entries)
        education = process_section(edu_entries)

        summary_text = self.profile.summary

        return RenderModel(
            schema_version="1.0.0",
            theme=theme,
            lang=target_lang,
            full_name=self.profile.full_name,
            contact=self.profile.contact,
            summary=summary_text,
            skills=skill_groups,
            experience=experience,
            projects=projects,
            education=education,
            design=design,
        )

    def harmonize_resume(
        self,
        model: RenderModel,
        job_spec: JobSpec,
    ) -> RenderModel:
        """Single editorial consistency pass over a physically fitted 1-page skeleton.

        Harmonizes tone, active voice, and coherence across the surviving pruned entries
        while strictly preserving atomic fact provenance and zero-hallucination invariants.
        """
        if not self.client.is_configured:
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

        allowed_skills = sorted(self.validator.whitelist)
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
            res = self.client.parse_json_completion(messages, temperature=0.2)
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

                        violations = self.validator.validate_bullet(cand_bullet)
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
                val = self.validator.validate_model(trial_model)
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

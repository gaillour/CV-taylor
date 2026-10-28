"""Deterministic 1-page A4 fit engine: ATS slot enforcement, bullet pruning, stable typography."""

from __future__ import annotations

from dataclasses import dataclass

from .models import (
    MAX_COMFORTABLE_DENSITY,
    SECTION_MAX_ENTRIES,
    DesignKnobs,
    Entry,
    Fact,
    FitReport,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
)
from .renderer import UNDERFILL_THRESHOLD_PCT, measure_fit

DEFAULT_DENSITY_STEPS: int = 5
MAX_SAFE_FILL_PCT: float = 98.0
SECTION_NAMES: tuple[tuple[str, int], ...] = (
    ("experience", 0),
    ("projects", 1),
    ("education", 2),
)
SECTION_PRUNE_RANK: dict[str, int] = {
    "projects": 0,
    "experience": 1,
    "education": 2,
}


@dataclass(frozen=True)
class _PrunedBulletRecord:
    """Metadata required to deterministically restore a pruned bullet if space permits."""

    section_name: str
    entry_id: str
    original_index: int
    bullet: RenderBullet


def _with_density(model: RenderModel, density: float) -> RenderModel:
    """Return a copy of RenderModel with typographic knobs interpolated at `density`."""
    design = DesignKnobs.from_density(density, font_family=model.design.font_family)
    return model.model_copy(update={"design": design})


def _with_relaxed(model: RenderModel, relax: float) -> RenderModel:
    """Return a copy of RenderModel with relaxed typographic knobs for sparse layouts."""
    design = DesignKnobs.from_relaxed(relax, font_family=model.design.font_family)
    return model.model_copy(update={"design": design})


def _finalize_report(
    fit: FitReport,
    *,
    pruned_fact_ids: list[str],
    summary_pruned: bool = False,
) -> FitReport:
    """Attach pruning provenance metadata to a FitReport."""
    return fit.model_copy(
        update={
            "pruned_fact_ids": list(pruned_fact_ids),
            "summary_pruned": summary_pruned,
        }
    )


def _exceeds_section_slots(model: RenderModel) -> bool:
    """Return True if any section exceeds its maximum entry slot count."""
    for sec_name, _ in SECTION_NAMES:
        max_entries = SECTION_MAX_ENTRIES.get(sec_name)
        if max_entries is not None and len(getattr(model, sec_name)) > max_entries:
            return True
    return False


def _enforce_section_entry_slots(
    model: RenderModel,
    pruned_fact_ids: list[str],
) -> RenderModel:
    """Cap each section to `SECTION_MAX_ENTRIES` and record dropped entry fact IDs."""
    updates: dict[str, list[RenderEntry]] = {}
    for sec_name, _ in SECTION_NAMES:
        max_entries = SECTION_MAX_ENTRIES.get(sec_name)
        entries: list[RenderEntry] = list(getattr(model, sec_name))
        if max_entries is not None and len(entries) > max_entries:
            kept = entries[:max_entries]
            dropped = entries[max_entries:]
            for dropped_entry in dropped:
                for b in dropped_entry.bullets:
                    pruned_fact_ids.extend(b.fact_ids)
            updates[sec_name] = kept
    if not updates:
        return model
    return model.model_copy(update=updates)


def binary_search_density_overflow(
    model: RenderModel,
    *,
    low_density: float = 0.0,
    high_density: float = MAX_COMFORTABLE_DENSITY,
    steps: int = DEFAULT_DENSITY_STEPS,
    high_fit: FitReport | None = None,
) -> tuple[RenderModel, FitReport]:
    """Binary search the minimum density in [low_density, high_density] that fits on 1 page."""
    high_model = _with_density(model, high_density)
    best_model = high_model
    best_fit = high_fit if high_fit is not None else measure_fit(high_model)

    lo = low_density
    hi = high_density
    for _ in range(steps):
        mid = round((lo + hi) / 2.0, 4)
        if mid <= lo or mid >= hi:
            break
        mid_model = _with_density(model, mid)
        mid_fit = measure_fit(mid_model)
        if mid_fit.fits_one_page:
            best_model = mid_model
            best_fit = mid_fit
            hi = mid
        else:
            lo = mid

    return best_model, best_fit


def binary_search_density_underfill(
    model: RenderModel,
    *,
    low_density: float = 0.0,
    high_density: float | None = None,
    min_fill_pct: float = UNDERFILL_THRESHOLD_PCT,
    steps: int = DEFAULT_DENSITY_STEPS,
) -> tuple[RenderModel, FitReport]:
    """Relax density towards `low_density` to bring vertical fill >= `min_fill_pct` on 1 page."""
    hi = high_density if high_density is not None else model.design.density
    lo = low_density

    low_model = _with_density(model, lo)
    low_fit = measure_fit(low_model)
    if low_fit.fits_one_page and low_fit.fill_pct <= MAX_SAFE_FILL_PCT:
        return low_model, low_fit

    best_model = model
    best_fit = measure_fit(model)
    if low_fit.fits_one_page:
        best_model = low_model
        best_fit = low_fit

    for _ in range(steps):
        mid = round((lo + hi) / 2.0, 4)
        if mid <= lo or mid >= hi:
            break
        mid_model = _with_density(model, mid)
        mid_fit = measure_fit(mid_model)
        if not mid_fit.fits_one_page:
            lo = mid
        else:
            if mid_fit.fill_pct >= min_fill_pct or (
                best_fit.fill_pct < min_fill_pct and mid_fit.fill_pct > best_fit.fill_pct
            ):
                best_model = mid_model
                best_fit = mid_fit
            if mid_fit.fill_pct < min_fill_pct:
                hi = mid
            elif mid_fit.fill_pct > MAX_SAFE_FILL_PCT:
                lo = mid
            else:
                hi = mid

    return best_model, best_fit


def _binary_search_relaxed_underfill(
    model: RenderModel,
    *,
    min_fill_pct: float = UNDERFILL_THRESHOLD_PCT,
    steps: int = DEFAULT_DENSITY_STEPS,
) -> tuple[RenderModel, FitReport]:
    """Expand typographic parameters within DesignKnobs bounds when d=0.0 is still underfilled."""
    max_model = _with_relaxed(model, 1.0)
    max_fit = measure_fit(max_model)
    if max_fit.fits_one_page and max_fit.fill_pct <= MAX_SAFE_FILL_PCT:
        return max_model, max_fit

    lo = 0.0
    hi = 1.0
    best_model = max_model if max_fit.fits_one_page else model
    best_fit = max_fit if max_fit.fits_one_page else measure_fit(model)

    for _ in range(steps):
        mid = round((lo + hi) / 2.0, 4)
        if mid <= lo or mid >= hi:
            break
        mid_model = _with_relaxed(model, mid)
        mid_fit = measure_fit(mid_model)
        if not mid_fit.fits_one_page:
            hi = mid
        else:
            if mid_fit.fill_pct >= min_fill_pct or (
                best_fit.fill_pct < min_fill_pct and mid_fit.fill_pct > best_fit.fill_pct
            ):
                best_model = mid_model
                best_fit = mid_fit
            if mid_fit.fill_pct < min_fill_pct:
                lo = mid
            else:
                hi = mid

    return best_model, best_fit


def _select_next_prune_candidate(
    model: RenderModel,
    *,
    respect_min_bullets: bool = True,
    only_above_max_bullets: bool = False,
) -> tuple[str, int, int, RenderBullet] | None:
    """Find the single lowest-priority non-pinned bullet to prune next.

    Sort key: `(bullet.priority, section_prune_rank, -entry_idx, -bullet.position, -bullet_idx)`
    so that lower priority is pruned first, and ties break strictly bottom-up:
    last project first, then older experience, then final bullets first.
    """
    candidates: list[tuple[tuple[int, int, int, int, int], str, int, int, RenderBullet]] = []

    for section_name in ("projects", "experience", "education"):
        section_rank = SECTION_PRUNE_RANK.get(section_name, 99)
        entries: list[RenderEntry] = getattr(model, section_name)
        for entry_idx, entry in enumerate(entries):
            if only_above_max_bullets and (
                entry.max_bullets <= 0 or len(entry.bullets) <= entry.max_bullets
            ):
                continue
            min_keep = entry.min_bullets if respect_min_bullets else 0
            if len(entry.bullets) <= min_keep:
                continue
            for bullet_idx, bullet in enumerate(entry.bullets):
                if bullet.pinned:
                    continue
                key = (
                    bullet.priority,
                    section_rank,
                    -entry_idx,
                    -bullet.position,
                    -bullet_idx,
                )
                candidates.append((key, section_name, entry_idx, bullet_idx, bullet))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    _, sec_name, e_idx, b_idx, chosen_bullet = candidates[0]
    return sec_name, e_idx, b_idx, chosen_bullet


def _remove_bullet(
    model: RenderModel,
    section_name: str,
    entry_idx: int,
    bullet_idx: int,
    *,
    drop_empty_entry: bool = False,
) -> RenderModel:
    """Return a copy of `model` with the specified bullet removed."""
    entries: list[RenderEntry] = list(getattr(model, section_name))
    target_entry = entries[entry_idx]
    new_bullets = [b for idx, b in enumerate(target_entry.bullets) if idx != bullet_idx]

    if drop_empty_entry and not new_bullets and section_name in {"experience", "projects"}:
        entries.pop(entry_idx)
    else:
        entries[entry_idx] = target_entry.model_copy(update={"bullets": new_bullets})

    return model.model_copy(update={section_name: entries})


def _try_reinsert_bullet(
    model: RenderModel,
    record: _PrunedBulletRecord,
) -> RenderModel | None:
    """Attempt to re-insert a previously pruned bullet into its entry."""
    entries: list[RenderEntry] = list(getattr(model, record.section_name))
    for idx, entry in enumerate(entries):
        if entry.entry_id == record.entry_id:
            new_bullets = list(entry.bullets)
            insert_pos = min(record.original_index, len(new_bullets))
            new_bullets.insert(insert_pos, record.bullet)
            entries[idx] = entry.model_copy(update={"bullets": new_bullets})
            return model.model_copy(update={record.section_name: entries})
    return None


def _augment_from_profile(
    model: RenderModel,
    profile: Profile,
    *,
    min_fill_pct: float = UNDERFILL_THRESHOLD_PCT,
    allow_new_entries: bool = False,
) -> tuple[RenderModel, FitReport]:
    """Deterministically add unselected facts from active entries respecting ATS slots."""
    current_model = model
    current_fit = measure_fit(current_model)
    if current_fit.fill_pct >= min_fill_pct or not current_fit.fits_one_page:
        return current_model, current_fit

    # 1. Restore summary if absent in model but available in profile
    if not current_model.summary:
        summary_text = (
            profile.summary_en
            if (current_model.lang == "en" and profile.summary_en)
            else profile.summary
        )
        if summary_text:
            trial_model = current_model.model_copy(update={"summary": summary_text})
            trial_fit = measure_fit(trial_model)
            if trial_fit.fits_one_page:
                current_model, current_fit = trial_model, trial_fit
                if current_fit.fill_pct >= min_fill_pct:
                    return current_model, current_fit

    # Collect already-rendered fact IDs
    used_fact_ids: set[str] = set(current_model.summary_fact_ids)
    for sec_name, _ in SECTION_NAMES:
        for r_entry in getattr(current_model, sec_name):
            for b in r_entry.bullets:
                used_fact_ids.update(b.fact_ids)

    profile_entries_by_id: dict[str, Entry] = {e.id: e for e in profile.entries if not e.archived}

    # 2. Gather unselected facts belonging to already-active entries, sorted by (-weight, position)
    extra_candidates: list[tuple[tuple[int, int, int, int], str, str, Fact]] = []
    for sec_name, sec_rank in SECTION_NAMES:
        for entry_idx, r_entry in enumerate(getattr(current_model, sec_name)):
            p_entry = profile_entries_by_id.get(r_entry.entry_id)
            if p_entry is None:
                continue
            lang_facts = [f for f in p_entry.facts if f.lang == current_model.lang] or p_entry.facts
            for f in lang_facts:
                if f.id not in used_fact_ids:
                    sort_key = (-f.weight, f.position, sec_rank, entry_idx)
                    extra_candidates.append((sort_key, sec_name, r_entry.entry_id, f))

    extra_candidates.sort(key=lambda item: item[0])

    for _, sec_name, entry_id, fact in extra_candidates:
        entries: list[RenderEntry] = list(getattr(current_model, sec_name))
        target_entry = next((e for e in entries if e.entry_id == entry_id), None)
        if target_entry is None or (
            target_entry.max_bullets > 0 and len(target_entry.bullets) >= target_entry.max_bullets
        ):
            continue
        new_bullet = RenderBullet(
            text=fact.text,
            fact_ids=[fact.id],
            skill_ids=list(fact.skill_ids),
            priority=fact.weight,
            pinned=fact.pinned,
            position=fact.position,
        )
        for idx, r_entry in enumerate(entries):
            if r_entry.entry_id == entry_id:
                updated_bullets = sorted(
                    [*r_entry.bullets, new_bullet],
                    key=lambda b: b.position,
                )
                entries[idx] = r_entry.model_copy(update={"bullets": updated_bullets})
                break
        trial_model = current_model.model_copy(update={sec_name: entries})
        trial_fit = measure_fit(trial_model)
        if trial_fit.fits_one_page:
            current_model, current_fit = trial_model, trial_fit
            used_fact_ids.add(fact.id)
            if current_fit.fill_pct >= min_fill_pct:
                return current_model, current_fit

    if not allow_new_entries:
        return current_model, current_fit

    # 3. Optional fallback: add unselected non-archived entries respecting SECTION_MAX_ENTRIES
    active_entry_ids: set[str] = {
        r_entry.entry_id
        for sec_name, _ in SECTION_NAMES
        for r_entry in getattr(current_model, sec_name)
    }
    remaining_entries = sorted(
        (e for e in profile.entries if not e.archived and e.id not in active_entry_ids),
        key=lambda e: e.position,
    )
    for p_entry in remaining_entries:
        sec_map = {
            "experience": "experience",
            "project": "projects",
            "education": "education",
        }
        sec_name = sec_map.get(p_entry.kind)
        if sec_name is None:
            continue
        max_sec_entries = SECTION_MAX_ENTRIES.get(sec_name)
        current_sec_entries: list[RenderEntry] = getattr(current_model, sec_name)
        if max_sec_entries is not None and len(current_sec_entries) >= max_sec_entries:
            continue
        selected_title = p_entry.select_title(lang=current_model.lang)
        lang_facts = [f for f in p_entry.facts if f.lang == current_model.lang] or p_entry.facts
        sorted_facts = sorted(lang_facts, key=lambda f: f.position)
        chosen_facts = [f for f in sorted_facts if f.default_selected or f.pinned] or sorted_facts[
            : max(p_entry.min_bullets, 1)
        ]
        if p_entry.max_bullets > 0:
            chosen_facts = chosen_facts[: p_entry.max_bullets]
        bullets = [
            RenderBullet(
                text=f.text,
                fact_ids=[f.id],
                skill_ids=list(f.skill_ids),
                priority=f.weight,
                pinned=f.pinned,
                position=f.position,
            )
            for f in chosen_facts
        ]
        loc = (
            p_entry.location_en
            if (current_model.lang == "en" and p_entry.location_en)
            else p_entry.location
        )
        new_render_entry = RenderEntry(
            entry_id=p_entry.id,
            title=selected_title.title,
            title_id=selected_title.id,
            org=p_entry.org,
            location=loc,
            date_label=p_entry.format_date_range(current_model.lang),
            link=p_entry.link,
            bullets=bullets,
            min_bullets=p_entry.min_bullets,
            max_bullets=p_entry.max_bullets,
        )
        sec_entries = [*current_sec_entries, new_render_entry]
        trial_model = current_model.model_copy(update={sec_name: sec_entries})
        trial_fit = measure_fit(trial_model)
        if trial_fit.fits_one_page:
            current_model, current_fit = trial_model, trial_fit
            if current_fit.fill_pct >= min_fill_pct:
                return current_model, current_fit

    return current_model, current_fit


def fit_render_model(
    render_model: RenderModel,
    *,
    candidate_pool: Profile | None = None,
    min_fill_pct: float = UNDERFILL_THRESHOLD_PCT,
    density_steps: int = DEFAULT_DENSITY_STEPS,
) -> tuple[RenderModel, FitReport]:
    """Guarantee a 1-page A4 RenderModel with fixed ATS structure and bounded slots.

    Invariants:
    - `summary` is a mandatory ATS section and is NEVER pruned (`summary_pruned = False`).
    - Section entry slots are capped at `SECTION_MAX_ENTRIES` (`experience: 3`, `projects: 3`,
      `education: 2`).
    - Overflow is resolved via slot enforcement, deterministic bullet pruning by priority
      (tie-break by position, respecting `pinned=True` and `min_bullets`), and bounded
      typographic micro-adjustment (`density`).
    """
    current_model = render_model
    initial_fit = measure_fit(current_model)

    pruned_fact_ids: list[str] = []
    pruned_records: list[_PrunedBulletRecord] = []

    if (
        initial_fit.fits_one_page
        and initial_fit.fill_pct >= min_fill_pct
        and not _exceeds_section_slots(current_model)
    ):
        return current_model, _finalize_report(
            initial_fit,
            pruned_fact_ids=pruned_fact_ids,
        )

    # =========================================================================
    # CASE 1: OVERFLOW (pages > 1 or section slot overflow)
    # =========================================================================
    if not initial_fit.fits_one_page or _exceeds_section_slots(current_model):
        start_d = current_model.design.density

        # If within section entry slots, check if subtle micro-density alone resolves overflow
        if not _exceeds_section_slots(current_model):
            d_subtle_model = _with_density(current_model, MAX_COMFORTABLE_DENSITY)
            d_subtle_fit = measure_fit(d_subtle_model)
            if d_subtle_fit.fits_one_page and d_subtle_fit.fill_pct <= MAX_SAFE_FILL_PCT:
                current_model, current_fit = binary_search_density_overflow(
                    current_model,
                    low_density=start_d,
                    high_density=MAX_COMFORTABLE_DENSITY,
                    steps=density_steps,
                    high_fit=d_subtle_fit,
                )
                if current_fit.fill_pct < min_fill_pct:
                    current_model, current_fit = binary_search_density_underfill(
                        current_model,
                        low_density=0.0,
                        high_density=current_model.design.density,
                        min_fill_pct=min_fill_pct,
                        steps=density_steps,
                    )
                return current_model, _finalize_report(
                    current_fit,
                    pruned_fact_ids=pruned_fact_ids,
                )

        # Step 1: Enforce section entry slot caps (experience<=3, projects<=3, education<=2)
        current_model = _enforce_section_entry_slots(current_model, pruned_fact_ids)
        current_model = _with_density(current_model, MAX_COMFORTABLE_DENSITY)
        current_fit = measure_fit(current_model)

        # Step 2: Prune non-pinned bullets by priority respecting entry.min_bullets
        # (`summary` is strictly immutable and never pruned)
        while not current_fit.fits_one_page or current_fit.fill_pct > MAX_SAFE_FILL_PCT:
            candidate = _select_next_prune_candidate(
                current_model,
                respect_min_bullets=True,
            )
            if candidate is None:
                break
            sec_name, entry_idx, bullet_idx, bullet = candidate
            entry_obj: RenderEntry = getattr(current_model, sec_name)[entry_idx]
            pruned_records.append(
                _PrunedBulletRecord(
                    section_name=sec_name,
                    entry_id=entry_obj.entry_id,
                    original_index=bullet_idx,
                    bullet=bullet,
                )
            )
            pruned_fact_ids.extend(bullet.fact_ids)
            current_model = _remove_bullet(current_model, sec_name, entry_idx, bullet_idx)
            current_fit = measure_fit(current_model)

        # Step 3: Extreme overflow fallback (if entries at min_bullets still overflow 1 page)
        while not current_fit.fits_one_page:
            candidate = _select_next_prune_candidate(
                current_model,
                respect_min_bullets=False,
            )
            if candidate is None:
                break
            sec_name, entry_idx, bullet_idx, bullet = candidate
            entry_obj = getattr(current_model, sec_name)[entry_idx]
            pruned_records.append(
                _PrunedBulletRecord(
                    section_name=sec_name,
                    entry_id=entry_obj.entry_id,
                    original_index=bullet_idx,
                    bullet=bullet,
                )
            )
            pruned_fact_ids.extend(bullet.fact_ids)
            current_model = _remove_bullet(
                current_model,
                sec_name,
                entry_idx,
                bullet_idx,
                drop_empty_entry=True,
            )
            current_fit = measure_fit(current_model)

        # Step 3b: Post-pruning compensation — re-add shorter bullets if they fit safely
        if len(pruned_records) >= 2:
            for rec in list(reversed(pruned_records[:-1])):
                trial_model = _try_reinsert_bullet(current_model, rec)
                if trial_model is None:
                    continue
                trial_fit = measure_fit(trial_model)
                if trial_fit.fits_one_page and trial_fit.fill_pct <= MAX_SAFE_FILL_PCT:
                    current_model = trial_model
                    current_fit = trial_fit
                    pruned_records.remove(rec)
                    for fid in rec.bullet.fact_ids:
                        if fid in pruned_fact_ids:
                            pruned_fact_ids.remove(fid)

        # Step 4: Trim bullets exceeding entry.max_bullets or tightly packed (> 94%)
        # at MAX_COMFORTABLE_DENSITY so Step 5 can relax density back towards 0.0.
        while current_fit.fits_one_page:
            slot_cand = _select_next_prune_candidate(
                current_model,
                respect_min_bullets=True,
                only_above_max_bullets=True,
            )
            if slot_cand is None and current_fit.fill_pct > MAX_SAFE_FILL_PCT:
                slot_cand = _select_next_prune_candidate(
                    current_model,
                    respect_min_bullets=True,
                )
            if slot_cand is None:
                break
            sec_name, entry_idx, bullet_idx, bullet = slot_cand
            trial_model = _remove_bullet(current_model, sec_name, entry_idx, bullet_idx)
            trial_fit = measure_fit(trial_model)
            if trial_fit.fits_one_page and trial_fit.fill_pct >= 72.0:
                entry_obj = getattr(current_model, sec_name)[entry_idx]
                pruned_records.append(
                    _PrunedBulletRecord(
                        section_name=sec_name,
                        entry_id=entry_obj.entry_id,
                        original_index=bullet_idx,
                        bullet=bullet,
                    )
                )
                pruned_fact_ids.extend(bullet.fact_ids)
                current_model = trial_model
                current_fit = trial_fit
            else:
                break

        # Step 5: Relax density from 1.0 down towards 0.0 to restore base typography
        if current_fit.fill_pct <= MAX_SAFE_FILL_PCT:
            current_model, current_fit = binary_search_density_underfill(
                current_model,
                low_density=0.0,
                high_density=current_model.design.density,
                min_fill_pct=min_fill_pct,
                steps=density_steps,
            )
        if current_fit.fill_pct < min_fill_pct and current_model.design.density == 0.0:
            current_model, current_fit = _binary_search_relaxed_underfill(
                current_model,
                min_fill_pct=min_fill_pct,
                steps=density_steps,
            )

        return current_model, _finalize_report(
            current_fit,
            pruned_fact_ids=pruned_fact_ids,
        )

    # =========================================================================
    # CASE 2: INITIAL UNDERFILL (pages == 1 and fill_pct < min_fill_pct)
    # =========================================================================
    current_fit = initial_fit

    # Step 2a: Re-add unselected facts/entries from Profile candidate_pool if provided
    if candidate_pool is not None:
        current_model, current_fit = _augment_from_profile(
            current_model,
            candidate_pool,
            min_fill_pct=min_fill_pct,
        )

    # Step 2b: Relax density towards 0.0 if density > 0.0 and still underfilled
    if current_fit.fill_pct < min_fill_pct and current_model.design.density > 0.0:
        current_model, current_fit = binary_search_density_underfill(
            current_model,
            low_density=0.0,
            high_density=current_model.design.density,
            min_fill_pct=min_fill_pct,
            steps=density_steps,
        )

    # Step 2c: Relax typographic knobs within DesignKnobs upper bounds if still underfilled at d=0.0
    if current_fit.fill_pct < min_fill_pct and current_model.design.density == 0.0:
        current_model, current_fit = _binary_search_relaxed_underfill(
            current_model,
            min_fill_pct=min_fill_pct,
            steps=density_steps,
        )

    return current_model, _finalize_report(
        current_fit,
        pruned_fact_ids=pruned_fact_ids,
    )

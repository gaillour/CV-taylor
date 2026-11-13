"""ATS slot enforcement, bullet pruning selection, and profile augmentation."""

from __future__ import annotations

from dataclasses import dataclass

from ..models import (
    SECTION_MAX_ENTRIES,
    Entry,
    Fact,
    FitReport,
    Profile,
    RenderBullet,
    RenderEntry,
    RenderModel,
)
from ..renderer import UNDERFILL_THRESHOLD_PCT, measure_fit

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
            active_bullets = entry.bullets
            if section_name in {"projects", "experience"}:
                min_keep = (
                    max(1, entry.min_bullets)
                    if respect_min_bullets
                    else (1 if len(active_bullets) >= 1 else 0)
                )
            else:
                min_keep = entry.min_bullets if respect_min_bullets else 0
            if len(active_bullets) <= min_keep:
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


prune_lowest_priority_bullet = _select_next_prune_candidate


def _drop_zero_bullet_entries(model: RenderModel) -> RenderModel:
    """Ensure no project or experience entry with 0 bullets remains in the RenderModel."""
    updates: dict[str, list[RenderEntry]] = {}
    for sec_name in ("projects", "experience"):
        entries: list[RenderEntry] = list(getattr(model, sec_name))
        filtered = [e for e in entries if len(e.bullets) >= 1]
        if len(filtered) != len(entries):
            updates[sec_name] = filtered
    if not updates:
        return model
    return model.model_copy(update=updates)


def _prune_lowest_priority_entry(
    model: RenderModel,
    pruned_fact_ids: list[str],
) -> RenderModel | None:
    """Prune an entire non-pinned project or experience entry when 1-bullet entries overflow."""
    cleaned = _drop_zero_bullet_entries(model)
    if cleaned is not model:
        return cleaned

    total_entries = len(model.experience) + len(model.projects)
    if total_entries <= 1:
        return None

    candidates: list[tuple[tuple[int, int, int], str, int]] = []
    for section_name in ("projects", "experience"):
        section_rank = SECTION_PRUNE_RANK.get(section_name, 99)
        entries: list[RenderEntry] = getattr(model, section_name)
        if section_name == "experience" and len(entries) <= 1 and len(model.projects) == 0:
            continue
        for entry_idx, entry in enumerate(entries):
            if any(b.pinned for b in entry.bullets):
                continue
            max_prio = max((b.priority for b in entry.bullets), default=0)
            key = (max_prio, section_rank, -entry_idx)
            candidates.append((key, section_name, entry_idx))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    _, sec_name, e_idx = candidates[0]
    sec_entries: list[RenderEntry] = list(getattr(model, sec_name))
    dropped = sec_entries.pop(e_idx)
    for b in dropped.bullets:
        pruned_fact_ids.extend(b.fact_ids)
    return model.model_copy(update={sec_name: sec_entries})


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
        summary_text = profile.summary
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

    # 2. Gather unselected facts belonging to active entries, sorted by (-weight, position)
    extra_candidates: list[tuple[tuple[int, int, int, int], str, str, Fact]] = []
    for sec_name, sec_rank in SECTION_NAMES:
        for entry_idx, r_entry in enumerate(getattr(current_model, sec_name)):
            p_entry = profile_entries_by_id.get(r_entry.entry_id)
            if p_entry is None:
                continue
            for f in p_entry.facts:
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
        selected_title = p_entry.select_title()
        sorted_facts = sorted(p_entry.facts, key=lambda f: f.position)
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
        new_render_entry = RenderEntry(
            entry_id=p_entry.id,
            title=selected_title.title,
            title_id=selected_title.id,
            org=p_entry.org or "",
            role=p_entry.role,
            location=p_entry.location,
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

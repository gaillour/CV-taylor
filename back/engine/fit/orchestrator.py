"""Orchestrator for deterministic 1-page A4 fit pipeline."""

from __future__ import annotations

from ..models import (
    MAX_COMFORTABLE_DENSITY,
    FitReport,
    Profile,
    RenderModel,
)
from ..renderer import UNDERFILL_THRESHOLD_PCT, measure_fit
from .content_shaper import (
    _augment_from_profile,
    _enforce_section_entry_slots,
    _exceeds_section_slots,
    _PrunedBulletRecord,
    _remove_bullet,
    _select_next_prune_candidate,
    _try_reinsert_bullet,
)
from .density_search import (
    DEFAULT_DENSITY_STEPS,
    MAX_SAFE_FILL_PCT,
    _binary_search_relaxed_underfill,
    _finalize_report,
    _with_density,
    binary_search_density_overflow,
    binary_search_density_underfill,
)


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

        # Step 1b: Enforce max_bullets cap per entry if exceeded
        while True:
            slot_cand = _select_next_prune_candidate(
                current_model,
                respect_min_bullets=True,
                only_above_max_bullets=True,
            )
            if slot_cand is None:
                break
            sec_name, entry_idx, bullet_idx, bullet = slot_cand
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

        # Step 4: Relax density from MAX_COMFORTABLE_DENSITY down towards 0.0 to restore base typography
        if current_fit.fill_pct <= MAX_SAFE_FILL_PCT:
            current_model, current_fit = binary_search_density_underfill(
                current_model,
                low_density=0.0,
                high_density=current_model.design.density,
                min_fill_pct=min_fill_pct,
                steps=density_steps,
            )

        # Step 5: Post-pruning compensation — re-add bullets bottom-up if underfilled or space permits
        if pruned_records:
            for rec in list(reversed(pruned_records)):
                sec_entries = getattr(current_model, rec.section_name)
                target = next((e for e in sec_entries if e.entry_id == rec.entry_id), None)
                if (
                    target is not None
                    and target.max_bullets > 0
                    and len(target.bullets) >= target.max_bullets
                ):
                    continue

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

        # Step 5b: If still underfilled (< min_fill_pct) and candidate_pool is available, augment from profile
        if current_fit.fill_pct < min_fill_pct and candidate_pool is not None:
            current_model, current_fit = _augment_from_profile(
                current_model,
                candidate_pool,
                min_fill_pct=min_fill_pct,
                allow_new_entries=False,
            )

        # Step 5c: If still underfilled and density > 0.0, relax density towards 0.0
        if current_fit.fill_pct < min_fill_pct and current_model.design.density > 0.0:
            current_model, current_fit = binary_search_density_underfill(
                current_model,
                low_density=0.0,
                high_density=current_model.design.density,
                min_fill_pct=min_fill_pct,
                steps=density_steps,
            )

        # Step 5d: If still underfilled (< min_fill_pct) at density=0.0 after reincorporation,
        # apply controlled relaxation of spacing to guarantee the 85% threshold without overflowing
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

"""Density search and typographic adjustment algorithms for 1-page fitting."""

from __future__ import annotations

from ..models import (
    MAX_COMFORTABLE_DENSITY,
    DesignKnobs,
    FitReport,
    RenderModel,
)
from ..renderer import UNDERFILL_THRESHOLD_PCT, measure_fit

DEFAULT_DENSITY_STEPS: int = 5
MAX_SAFE_FILL_PCT: float = 98.0
MAX_COMPILATION_BUDGET: int = 10
MIN_ACCEPTABLE_DENSITY: float = 0.0


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

"""Feedback loop: Orchestrating Tailoring, Anti-hallucination, ATS scoring, and 1-page fit."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .anti_hallucination import AntiHallucinationValidator, ValidationReport
from .ats import ATSChecker, ATSReport
from .fit import fit_render_model
from .llm import LLMClient
from .models import JobSpec, LangCode, Profile, RenderBullet, RenderModel, ThemeName
from .renderer import RenderResult, render_cv
from .snapshot import Snapshot
from .tailor import TailorEngine

ATS_SCORE_TARGET_THRESHOLD: float = 85.0
MAX_FEEDBACK_ITERATIONS: int = 3


class TailorPipelineResult(BaseModel):
    """Result of the complete end-to-end tailoring pipeline."""

    model_config = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    pdf_bytes: bytes = Field(exclude=True)
    pdf_sha256: str
    render_model: RenderModel
    fit_report: Any
    ats_report: ATSReport
    validation_report: ValidationReport
    snapshot: Snapshot
    iterations_performed: int
    svg_content: str | None = None


class TailoringPipeline:
    """Feedback loop coordinating tailoring, anti-hallucination, ATS compliance, and fit engine."""

    def __init__(
        self,
        profile: Profile,
        client: LLMClient | None = None,
    ) -> None:
        self.profile = profile
        self.client = client or LLMClient()
        self.tailor_engine = TailorEngine(profile, client=self.client)
        self.validator = AntiHallucinationValidator(profile)
        self.ats_checker = ATSChecker()

    def _model_to_plain_text(self, model: RenderModel) -> str:
        """Convert a RenderModel into a plain-text resume representation for ATS parsing."""
        lines: list[str] = [model.full_name]
        contact = f"{model.contact.email} | {model.contact.phone} | {model.contact.location}"
        lines.append(contact)
        lines.append("")

        if model.summary:
            lines.append("Resumen Profesional" if model.lang == "es" else "Professional Summary")
            lines.append(model.summary)
            lines.append("")

        if model.experience:
            lines.append("Experiencia Laboral" if model.lang == "es" else "Work Experience")
            for exp in model.experience:
                lines.append(f"{exp.title} | {exp.org} | {exp.date_label}")
                for b in exp.bullets:
                    lines.append(f"• {b.text}")
                lines.append("")

        if model.projects:
            lines.append("Proyectos" if model.lang == "es" else "Projects")
            for proj in model.projects:
                lines.append(f"{proj.title} | {proj.org} | {proj.date_label}")
                for b in proj.bullets:
                    lines.append(f"• {b.text}")
                lines.append("")

        if model.education:
            lines.append("Educación" if model.lang == "es" else "Education")
            for edu in model.education:
                lines.append(f"{edu.title} | {edu.org} | {edu.date_label}")
                for b in edu.bullets:
                    lines.append(f"• {b.text}")
                lines.append("")

        if model.skills:
            lines.append("Habilidades" if model.lang == "es" else "Skills")
            for group in model.skills:
                lines.append(f"{group.category}: {group.items}")
            lines.append("")

        return "\n".join(lines)

    def run(
        self,
        job_spec: JobSpec,
        *,
        theme: ThemeName = "classic",
        lang: LangCode | None = None,
        use_llm: bool = True,
        include_svg: bool = False,
    ) -> TailorPipelineResult:
        """Execute full tailoring pipeline with guided ATS feedback loop."""
        iteration = 0
        current_model = self.tailor_engine.tailor(job_spec, theme=theme, lang=lang, use_llm=use_llm)

        while iteration < MAX_FEEDBACK_ITERATIONS:
            iteration += 1

            # 1. Anti-hallucination verification
            val_report = self.validator.validate_model(current_model)
            if not val_report.is_valid:
                # Selectively sanitize only violating bullets with safe source alternatives
                for section in (
                    current_model.experience,
                    current_model.projects,
                    current_model.education,
                ):
                    for entry in section:
                        for idx, b in enumerate(entry.bullets):
                            b_violations = self.validator.validate_bullet(b)
                            if b_violations:
                                safe_opts = self.validator.suggest_alternatives(
                                    b, violations=b_violations
                                )
                                primary_text = safe_opts[0] if safe_opts else b.text
                                entry.bullets[idx] = RenderBullet(
                                    text=primary_text,
                                    fact_ids=b.fact_ids,
                                    skill_ids=b.skill_ids,
                                    priority=b.priority,
                                    pinned=b.pinned,
                                    position=b.position,
                                    suggested_alternatives=safe_opts,
                                )
                val_report = self.validator.validate_model(current_model)

            # 2. ATS evaluation
            plain_text = self._model_to_plain_text(current_model)
            ats_report = self.ats_checker.evaluate(plain_text, target_keywords=job_spec.keywords)

            # Check if ATS score meets the threshold or if we need corrective iteration
            ats_target_met = ats_report.total_score >= ATS_SCORE_TARGET_THRESHOLD
            if ats_target_met or iteration >= MAX_FEEDBACK_ITERATIONS:
                break

            # 3. Corrective iteration: inject missing keywords that the candidate actually has
            candidate_techs = {sk.name.lower(): sk for sk in self.profile.skills}
            remedied = False

            for gap in ats_report.keyword_gaps:
                gap_low = gap.lower()
                if gap_low in candidate_techs:
                    sk = candidate_techs[gap_low]
                    # Check if already present in RenderModel skills
                    already_in = any(
                        sk.name.lower() in group.items.lower() for group in current_model.skills
                    )
                    if not already_in:
                        # Append to matching or first skill group
                        cat_label = sk.category_label(current_model.lang)
                        matched_group = next(
                            (g for g in current_model.skills if g.category == cat_label), None
                        )
                        if matched_group:
                            sk_label = sk.display_label(current_model.lang)
                            matched_group.items = f"{matched_group.items}, {sk_label}"
                            matched_group.skill_ids.append(sk.id)
                            remedied = True

            if not remedied:
                # No further deterministic corrections possible
                break

        # 4. Deterministic 1-page fit engine (computes physical skeleton at d <= 0.35)
        fitted_model, fit_report = fit_render_model(current_model, candidate_pool=self.profile)

        # 4b. Single editorial consistency pass if pruning occurred or language differs
        needs_harmonize = bool(fit_report.pruned_fact_ids) or (
            current_model.lang != self.profile.default_lang
        )
        if use_llm and self.client.is_configured and needs_harmonize:
            harmonized_model = self.tailor_engine.harmonize_resume(fitted_model, job_spec)
            second_model, second_fit = fit_render_model(
                harmonized_model, candidate_pool=self.profile
            )
            merged_pruned = list(
                dict.fromkeys([*fit_report.pruned_fact_ids, *second_fit.pruned_fact_ids])
            )
            fitted_model = second_model
            fit_report = second_fit.model_copy(update={"pruned_fact_ids": merged_pruned})

        # 4c. Final anti-hallucination verification on the fitted document
        val_report = self.validator.validate_model(fitted_model)
        if not val_report.is_valid:
            for section in (
                fitted_model.experience,
                fitted_model.projects,
                fitted_model.education,
            ):
                for entry in section:
                    for idx, b in enumerate(entry.bullets):
                        b_violations = self.validator.validate_bullet(b)
                        if b_violations:
                            safe_opts = self.validator.suggest_alternatives(
                                b, violations=b_violations, lang=fitted_model.lang
                            )
                            primary_text = safe_opts[0] if safe_opts else b.text
                            entry.bullets[idx] = RenderBullet(
                                text=primary_text,
                                fact_ids=b.fact_ids,
                                skill_ids=b.skill_ids,
                                priority=b.priority,
                                pinned=b.pinned,
                                position=b.position,
                                suggested_alternatives=safe_opts,
                            )
            val_report = self.validator.validate_model(fitted_model)

        # 5. Typst compilation
        render_res: RenderResult = render_cv(fitted_model, include_svg=include_svg)
        svg_content: str | None = None
        if include_svg and render_res.svg_pages:
            svg_content = render_res.svg_pages[0].decode("utf-8", errors="replace")

        # 6. Snapshot creation
        snapshot = Snapshot.create(
            job_spec=job_spec,
            render_model=fitted_model,
            pdf_sha256=render_res.pdf_sha256,
            ats_score=ats_report.total_score,
            metadata={
                "fill_pct": fit_report.fill_pct,
                "density": fit_report.density,
                "iterations": iteration,
            },
        )

        return TailorPipelineResult(
            pdf_bytes=render_res.pdf_bytes,
            pdf_sha256=render_res.pdf_sha256,
            render_model=fitted_model,
            fit_report=fit_report,
            ats_report=ats_report,
            validation_report=val_report,
            snapshot=snapshot,
            iterations_performed=iteration,
            svg_content=svg_content,
        )

from pathlib import Path

from ..models import RenderModel
from .models import ATSReport
from .parser import LeverResumeParser
from .patterns import ACTION_VERBS, DATE_RANGE_PATTERN


class ATSChecker:
    """
    Motor evaluador de compatibilidad ATS (Score 0-100%).
    Analiza completitud de estructura, consistencia temporal,
    estatuto de educación y cobertura de habilidades clave.
    """

    def __init__(self):
        self.parser = LeverResumeParser()

    def evaluate(
        self,
        pdf_or_text: Path | str,
        target_keywords: list[str] | None = None,
    ) -> ATSReport:
        resume = self.parser.parse(pdf_or_text)
        issues: list[str] = []

        # 1. Puntaje de Estructura (Base 100%)
        struct_score = 100
        required_sections = ["summary", "experience", "education", "skills"]
        for sec in required_sections:
            if sec not in resume.detected_sections:
                struct_score -= 25
                issues.append(f"Falta sección obligatoria ATS: '{sec}'.")

        if resume.non_canonical_sections:
            struct_score -= 30
            for nc in resume.non_canonical_sections:
                issues.append(f"Título compuesto no canónico penalizado por ATS: '{nc}'.")

        struct_score = max(0, struct_score)

        # 2. Puntaje de Experiencia (Base 100%)
        exp_score = 100
        if not resume.experience:
            exp_score = 0
            issues.append("No se detectaron entradas de experiencia laboral.")
        else:
            if len(resume.experience) < 2:
                exp_score -= 20
                issues.append("Historial laboral corto: se recomiendan al menos 2-3 puestos.")

            for i, exp in enumerate(resume.experience, start=1):
                if not exp.has_valid_date_range and not exp.date_label:
                    exp_score -= 15
                    issues.append(
                        f"Puesto #{i} sin formato explícito de rango (MM/YYYY - MM/YYYY)."
                    )

                if not exp.bullets:
                    exp_score -= 20
                    issues.append(f"Puesto #{i} sin viñetas de logros/responsabilidades.")
                else:
                    # Verificar si inician con verbos de acción
                    has_action_verb = any(
                        any(b.lower().startswith(v) for v in ACTION_VERBS) for b in exp.bullets
                    )
                    if not has_action_verb:
                        exp_score -= 10
                        issues.append(
                            f"Puesto #{i} no inicia viñetas con verbos de acción fuertes."
                        )

        exp_score = max(0, exp_score)

        # 3. Puntaje de Educación (Base 100%)
        edu_score = 100
        if not resume.education:
            edu_score = 0
            issues.append("No se detectó sección de Educación.")
        else:
            for edu in resume.education:
                if len(edu.bullets) > 1:
                    edu_score -= 20
                    issues.append(
                        "Sección de Educación con >1 viñeta (ATS prefiere 0 o 1 viñeta corta)."
                    )

        edu_score = max(0, edu_score)

        # 4. Puntaje de Habilidades / Keywords (Base 100%)
        skills_score = 100
        keyword_matches = []
        keyword_gaps = []

        if not resume.skills:
            skills_score = 0
            issues.append("No se detectaron categorías de habilidades técnicas.")
        elif target_keywords:
            raw_lower = resume.raw_text.lower()
            for kw in target_keywords:
                if kw.lower() in raw_lower:
                    keyword_matches.append(kw)
                else:
                    keyword_gaps.append(kw)

            match_pct = len(keyword_matches) / len(target_keywords)
            skills_score = int(match_pct * 100)
            if keyword_gaps:
                issues.append(f"Faltan keywords de la oferta: {', '.join(keyword_gaps)}.")

        skills_score = max(0, skills_score)

        # Score global ponderado
        total_score = int(
            (struct_score * 0.35) + (exp_score * 0.30) + (edu_score * 0.15) + (skills_score * 0.20)
        )

        passed = total_score >= 80 and struct_score >= 80

        breakdown = {
            "structure": struct_score,
            "experience": exp_score,
            "education": edu_score,
            "skills": skills_score,
        }

        return ATSReport(
            total_score=total_score,
            structure_score=struct_score,
            experience_score=exp_score,
            education_score=edu_score,
            skills_score=skills_score,
            passed=passed,
            issues=issues,
            keyword_matches=keyword_matches,
            keyword_gaps=keyword_gaps,
            parsed_resume=resume,
            breakdown=breakdown,
        )

    def evaluate_render_model(
        self,
        model: RenderModel,
        target_keywords: list[str] | None = None,
    ) -> ATSReport:
        """
        Evalúa compatibilidad ATS directamente sobre RenderModel en memoria.
        No compila Typst ni genera PDF (<5ms).
        """
        issues: list[str] = []

        # 1. Puntaje de Estructura (Base 100%)
        struct_score = 100
        has_summary = bool(model.summary and model.summary.strip())
        active_exp = [e for e in model.experience if getattr(e, "selected", True)]
        has_exp = len(active_exp) > 0
        active_edu = [e for e in model.education if getattr(e, "selected", True)]
        has_edu = len(active_edu) > 0
        has_skills = any(bool(g.items and g.items.strip()) for g in model.skills)

        if not has_summary:
            struct_score -= 25
            issues.append("Falta sección obligatoria ATS: 'summary'.")
        if not has_exp:
            struct_score -= 25
            issues.append("Falta sección obligatoria ATS: 'experience'.")
        if not has_edu:
            struct_score -= 25
            issues.append("Falta sección obligatoria ATS: 'education'.")
        if not has_skills:
            struct_score -= 25
            issues.append("Falta sección obligatoria ATS: 'skills'.")

        struct_score = max(0, struct_score)

        # 2. Puntaje de Experiencia (Base 100%)
        exp_score = 100
        if not active_exp:
            exp_score = 0
            issues.append("No se detectaron entradas activas de experiencia laboral.")
        else:
            if len(active_exp) < 2:
                exp_score -= 20
                issues.append("Historial laboral corto: se recomiendan al menos 2 puestos activos.")

            for i, exp in enumerate(active_exp, start=1):
                has_valid_date_range = (
                    bool(DATE_RANGE_PATTERN.search(exp.date_label)) if exp.date_label else False
                )
                if not has_valid_date_range:
                    exp_score -= 15
                    issues.append(
                        f"Puesto #{i} ('{exp.title}') sin formato explícito de rango (MM/YYYY - MM/YYYY)."
                    )

                active_bullets = [
                    b.text.strip()
                    for b in exp.bullets
                    if getattr(b, "selected", True) and b.text.strip()
                ]
                if not active_bullets:
                    exp_score -= 20
                    issues.append(
                        f"Puesto #{i} ('{exp.title}') sin viñetas activas de logros/responsabilidades."
                    )
                else:
                    has_action_verb = any(
                        any(b.lower().startswith(v) for v in ACTION_VERBS)
                        for b in active_bullets
                    )
                    if not has_action_verb:
                        exp_score -= 10
                        issues.append(
                            f"Puesto #{i} ('{exp.title}') no inicia viñetas con verbos de acción fuertes."
                        )

        exp_score = max(0, exp_score)

        # 3. Puntaje de Educación (Base 100%)
        edu_score = 100
        if not active_edu:
            edu_score = 0
            issues.append("No se detectó sección de Educación.")
        else:
            for i, edu in enumerate(active_edu, start=1):
                active_bullets = [
                    b for b in edu.bullets if getattr(b, "selected", True) and b.text.strip()
                ]
                if len(active_bullets) > 1:
                    edu_score -= 20
                    issues.append(
                        f"Entrada de Educación #{i} con >1 viñeta (ATS prefiere 0 o 1 viñeta corta)."
                    )

        edu_score = max(0, edu_score)

        # 4. Puntaje de Habilidades / Keywords (Base 100%)
        skills_score = 100
        keyword_matches: list[str] = []
        keyword_gaps: list[str] = []

        if not has_skills:
            skills_score = 0
            issues.append("No se detectaron categorías de habilidades técnicas.")
        elif target_keywords:
            corpus_parts: list[str] = []
            if model.summary and model.summary.strip():
                corpus_parts.append(model.summary)
            for g in model.skills:
                if g.items:
                    corpus_parts.append(g.items)
            for exp in active_exp:
                corpus_parts.append(exp.title)
                corpus_parts.append(exp.org)
                corpus_parts.extend(
                    [b.text for b in exp.bullets if getattr(b, "selected", True)]
                )
            active_proj = [p for p in model.projects if getattr(p, "selected", True)]
            for prj in active_proj:
                corpus_parts.append(prj.title)
                corpus_parts.append(prj.org)
                corpus_parts.extend(
                    [b.text for b in prj.bullets if getattr(b, "selected", True)]
                )
            for edu in active_edu:
                corpus_parts.append(edu.title)
                corpus_parts.append(edu.org)
                corpus_parts.extend(
                    [b.text for b in edu.bullets if getattr(b, "selected", True)]
                )

            raw_lower = " ".join(corpus_parts).lower()
            for kw in target_keywords:
                if kw.lower() in raw_lower:
                    keyword_matches.append(kw)
                else:
                    keyword_gaps.append(kw)

            match_pct = len(keyword_matches) / len(target_keywords) if target_keywords else 1.0
            skills_score = int(match_pct * 100)
            if keyword_gaps:
                issues.append(f"Faltan keywords de la oferta: {', '.join(keyword_gaps)}.")

        skills_score = max(0, skills_score)

        # Score global ponderado
        total_score = int(
            (struct_score * 0.35) + (exp_score * 0.30) + (edu_score * 0.15) + (skills_score * 0.20)
        )
        passed = total_score >= 80 and struct_score >= 80

        breakdown = {
            "structure": struct_score,
            "experience": exp_score,
            "education": edu_score,
            "skills": skills_score,
        }

        return ATSReport(
            total_score=total_score,
            structure_score=struct_score,
            experience_score=exp_score,
            education_score=edu_score,
            skills_score=skills_score,
            passed=passed,
            issues=issues,
            keyword_matches=keyword_matches,
            keyword_gaps=keyword_gaps,
            parsed_resume=None,
            breakdown=breakdown,
        )


def check_ats_compliance(
    pdf_or_text: Path | str,
    target_keywords: list[str] | None = None,
) -> ATSReport:
    """Función de alto nivel para chequeo ATS determinista."""
    checker = ATSChecker()
    return checker.evaluate(pdf_or_text, target_keywords=target_keywords)

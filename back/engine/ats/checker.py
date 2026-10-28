from pathlib import Path

from .models import ATSReport
from .parser import LeverResumeParser
from .patterns import ACTION_VERBS


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
        )


def check_ats_compliance(
    pdf_or_text: Path | str,
    target_keywords: list[str] | None = None,
) -> ATSReport:
    """Función de alto nivel para chequeo ATS determinista."""
    checker = ATSChecker()
    return checker.evaluate(pdf_or_text, target_keywords=target_keywords)

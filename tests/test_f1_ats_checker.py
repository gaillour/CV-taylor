from pathlib import Path

from back.engine import check_ats_compliance


def test_ats_checker_on_dev_pdf():
    pdf_path = Path("out/juan_dev_modern.pdf")
    if not pdf_path.exists():
        # Fallback to tempo output if out pdf not available
        pdf_path = Path("tempo/basic-resume/output.pdf")

    report = check_ats_compliance(pdf_path)
    assert report.structure_score >= 75
    assert report.total_score >= 70
    assert report.parsed_resume is not None
    assert "summary" in report.parsed_resume.detected_sections
    assert "experience" in report.parsed_resume.detected_sections


def test_ats_checker_detects_penalized_compound_title():
    text_sample = """
Juan Ignacio Gaillour
juangaillour.8@gmail.com | +54 223 506-0690 | Mar del Plata, AR

Resumen Profesional
Estudiante avanzado de software.

Educación y Formación
Universidad Nacional de Mar del Plata
03/2022 - Presente

Experiencia Laboral
Desarrollador Full Stack | 06/2025 - Presente
Simple MDQ
• Diseñé e implementé APIs con FastAPI.

Habilidades
Python, FastAPI, SQL
"""
    report = check_ats_compliance(text_sample)
    assert any("compuesto no canónico" in issue for issue in report.issues)
    assert report.structure_score < 100

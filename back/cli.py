"""CLI entrypoint for cv-tailor (`cvt`)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from back.engine import (
    ATSChecker,
    LLMClient,
    Profile,
    RenderModel,
    TailoringPipeline,
    extract_job_spec,
    fit_render_model,
    render_cv,
)


def _colored(text: str, color_code: str) -> str:
    """Wrap text in ANSI escape sequence if stdout is a TTY."""
    if sys.stdout.isatty():
        return f"\033[{color_code}m{text}\033[0m"
    return text


def _bold(text: str) -> str:
    return _colored(text, "1")


def _green(text: str) -> str:
    return _colored(text, "32")


def _yellow(text: str) -> str:
    return _colored(text, "33")


def _cyan(text: str) -> str:
    return _colored(text, "36")


def _red(text: str) -> str:
    return _colored(text, "31")


def cmd_tailor(args: argparse.Namespace) -> int:
    """Tailor a CV to a specific job posting."""
    offer_path_or_url: str = args.offer
    profile_path = Path(args.profile)
    out_pdf_path = Path(args.out)
    out_snap_path = Path(args.snapshot) if args.snapshot else out_pdf_path.with_suffix(".json")

    if not offer_path_or_url.startswith(("http://", "https://")):
        offer_file = Path(offer_path_or_url)
        if not offer_file.exists():
            print(
                _red(f"Error: No se encontró el archivo de oferta en '{offer_path_or_url}'"),
                file=sys.stderr,
            )
            return 1
        offer_text = offer_file.read_text(encoding="utf-8")
    else:
        offer_text = offer_path_or_url

    if not profile_path.exists():
        print(_red(f"Error: No se encontró el perfil en '{profile_path}'"), file=sys.stderr)
        return 1

    profile = Profile.from_file(profile_path)
    print(_bold(f"==> Procesando perfil: {profile.full_name} ({len(profile.entries)} entradas)"))

    llm_client = LLMClient() if not args.no_llm else None

    # 1. Extracción de JobSpec
    print(_cyan("==> Analizando oferta laboral..."))
    job_spec = extract_job_spec(offer_text, client=llm_client)
    if args.lang:
        job_spec = job_spec.model_copy(update={"lang": args.lang})

    kw_summary = ", ".join(job_spec.keywords[:8])
    print(f"    • Rol detectado: {_bold(job_spec.role or 'General')}")
    print(f"    • Empresa: {_bold(job_spec.company or 'Confidencial')}")
    print(f"    • Idioma: {_bold(job_spec.lang.upper())}")
    print(f"    • Keywords extraídas ({len(job_spec.keywords)}): {kw_summary}")

    # 2. Pipeline con Loop de Feedback ATS
    print(_cyan("==> Ejecutando pipeline de tailoring y loop ATS..."))
    pipeline = TailoringPipeline(profile, client=llm_client)
    res = pipeline.run(
        job_spec,
        theme=args.theme,
        lang=args.lang or job_spec.lang,
        use_llm=not args.no_llm,
    )

    # 3. Validación Anti-alucinación
    if res.validation_report.is_valid:
        n_chk = res.validation_report.checked_bullets
        print(_green(f"    ✓ Validación anti-alucinación superada ({n_chk} viñetas verificadas)."))
    else:
        n_viol = len(res.validation_report.violations)
        print(_yellow(f"    ⚠ Advertencia: {n_viol} advertencias fácticas sanitizadas."))

    # 4. Reporte ATS
    ats = res.ats_report
    score_color = _green if ats.total_score >= 85 else _yellow
    ats_msg = (
        f"    ✓ Score de compatibilidad ATS: {ats.total_score:.1f}% "
        f"(Iteraciones: {res.iterations_performed})"
    )
    print(score_color(ats_msg))
    if ats.keyword_matches:
        print(f"      - Keywords matcheadas: {', '.join(ats.keyword_matches[:6])}")
    if ats.keyword_gaps:
        print(f"      - Gaps identificados: {', '.join(ats.keyword_gaps[:4])}")

    # 5. Fit Engine 1 Página
    fit = res.fit_report
    fit_msg = (
        f"    ✓ Control de 1 página A4: {fit.pages} pág "
        f"(Llenado vertical: {fit.fill_pct:.1f}%, Densidad: {fit.density})"
    )
    print(_green(fit_msg))

    # 6. Guardar artefactos
    out_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    out_pdf_path.write_bytes(res.pdf_bytes)
    res.snapshot.save(out_snap_path)

    print(_bold(_green("\n[OK] PDF emitido exitosamente:")) + f" {out_pdf_path}")
    snap_msg = f" {out_snap_path} (SHA-256: {res.pdf_sha256[:12]}...)"
    print(_bold(_green("[OK] Snapshot inmutable guardado:")) + snap_msg)
    return 0


def cmd_check_ats(args: argparse.Namespace) -> int:
    """Evaluate ATS compatibility of an existing PDF or text resume."""
    target_path = Path(args.target)
    keywords = [k.strip() for k in args.keywords.split(",")] if args.keywords else None

    checker = ATSChecker()
    report = checker.evaluate(target_path, target_keywords=keywords)

    print(_bold(f"=== Reporte de Compatibilidad ATS para: {target_path.name} ==="))
    print(f"Puntaje Total: {report.total_score:.1f}%")
    print(f"  • Estructura:  {report.structure_score:.1f}%")
    print(f"  • Experiencia: {report.experience_score:.1f}%")
    print(f"  • Educación:   {report.education_score:.1f}%")
    print(f"  • Habilidades: {report.skills_score:.1f}%")

    if report.issues:
        print(_yellow("\nObservaciones y Penalizaciones:"))
        for issue in report.issues:
            print(f"  - {issue}")

    if report.keyword_matches:
        kw_matched = ", ".join(report.keyword_matches)
        print(_green(f"\nKeywords encontradas ({len(report.keyword_matches)}): ") + kw_matched)
    if report.keyword_gaps:
        kw_missing = ", ".join(report.keyword_gaps)
        print(_red(f"Keywords faltantes ({len(report.keyword_gaps)}): ") + kw_missing)

    return 0


def cmd_render(args: argparse.Namespace) -> int:
    """Direct render of a Master Profile without job tailoring."""
    profile_path = Path(args.profile)
    out_path = Path(args.out)

    if not profile_path.exists():
        print(_red(f"Error: Perfil no encontrado en '{profile_path}'"), file=sys.stderr)
        return 1

    profile = Profile.from_file(profile_path)
    model = RenderModel.from_profile(profile, lang=args.lang, theme=args.theme)
    fitted_model, fit_report = fit_render_model(model)
    res = render_cv(fitted_model)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(res.pdf_bytes)

    print(_green(f"✓ CV renderizado en 1 página: {out_path} (Llenado: {fit_report.fill_pct:.1f}%)"))
    return 0


def main(argv: list[str] | None = None) -> int:
    """CLI argument parser router."""
    parser = argparse.ArgumentParser(
        prog="cvt",
        description="cv-tailor: Deterministic 1-page AI CV tailoring engine and CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcomando: tailor
    tailor_p = subparsers.add_parser("tailor", help="Adapt Master Profile to a job posting")
    tailor_p.add_argument("offer", help="Job posting text file path or URL")
    tailor_p.add_argument(
        "-p",
        "--profile",
        default="fixtures/profile_juan.json",
        help="Path to Master Profile JSON (default: fixtures/profile_juan.json)",
    )
    tailor_p.add_argument("-l", "--lang", choices=["es", "en"], help="Target language (es/en)")
    tailor_p.add_argument(
        "-t",
        "--theme",
        choices=["classic", "modern", "engineering"],
        default="classic",
        help="Typst layout theme (default: classic)",
    )
    tailor_p.add_argument(
        "-o",
        "--out",
        default="out/tailored_cv.pdf",
        help="Output PDF path (default: out/tailored_cv.pdf)",
    )
    tailor_p.add_argument(
        "-s",
        "--snapshot",
        help="Output snapshot JSON path (default: out/<name>.json)",
    )
    tailor_p.add_argument(
        "--no-llm",
        action="store_true",
        help="Run in offline deterministic mode without calling LLM endpoints",
    )
    tailor_p.set_defaults(func=cmd_tailor)

    # Subcomando: check-ats
    check_p = subparsers.add_parser("check-ats", help="Evaluate ATS score of a PDF or text resume")
    check_p.add_argument("target", help="Path to PDF or plain text resume")
    check_p.add_argument("-k", "--keywords", help="Comma-separated target keywords")
    check_p.set_defaults(func=cmd_check_ats)

    # Subcomando: render
    render_p = subparsers.add_parser("render", help="Render Master Profile without job tailoring")
    render_p.add_argument(
        "-p",
        "--profile",
        default="fixtures/profile_juan.json",
        help="Path to Master Profile JSON",
    )
    render_p.add_argument("-l", "--lang", choices=["es", "en"], default="es")
    render_p.add_argument(
        "-t",
        "--theme",
        choices=["classic", "modern", "engineering"],
        default="classic",
    )
    render_p.add_argument("-o", "--out", default="out/cv.pdf", help="Output PDF path")
    render_p.set_defaults(func=cmd_render)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

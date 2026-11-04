#!/usr/bin/env python3
"""Batch parser test and benchmark script.

Tests the existing PDF text extractor and structured profile parser
WITHOUT modifying any codebase engine logic.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from pypdf import PdfReader

# Import existing parser components without modification
from back.engine.importer import (
    MAX_RESUME_CHARS,
    SYSTEM_PROMPT,
    _build_profile_from_dict,
    _detect_two_columns,
    _extract_page_spans,
    _parse_profile_heuristic,
    extract_text_from_pdf,
    parse_profile_from_text,
)
from back.engine.llm import LLMClient
from back.engine.models import Profile


@dataclass
class FileResult:
    filename: str
    pages: int
    char_count: int
    words_count: int
    two_column_pages: int
    is_scanned_or_empty: bool
    extract_time_ms: float
    extract_error: str | None = None

    # Structuring metrics (Fase B)
    parsed: bool = False
    used_llm: bool = False
    llm_char_input: int = 0
    parse_time_ms: float = 0.0
    parse_error: str | None = None
    full_name: str | None = None
    base_lang: str | None = None
    has_contact: bool = False
    skills_count: int = 0
    experience_count: int = 0
    education_count: int = 0
    project_count: int = 0


def analyze_pdf_layout(pdf_path: Path) -> tuple[int, int]:
    """Inspect page count and how many pages have a 2-column layout."""
    reader = PdfReader(str(pdf_path))
    pages = len(reader.pages)
    two_col_count = 0
    for page in reader.pages:
        try:
            width = float(page.mediabox.width)
            spans = _extract_page_spans(page)
            if spans and _detect_two_columns(spans, width) is not None:
                two_col_count += 1
        except Exception:
            pass
    return pages, two_col_count


def run_benchmark(
    pdf_files: list[Path],
    *,
    text_only: bool = False,
    use_llm: bool = False,
    out_dir: Path,
    save_text: bool = False,
    save_parsed: bool = False,
) -> list[FileResult]:
    out_dir.mkdir(parents=True, exist_ok=True)
    text_dir = out_dir / "extracted_text"
    parsed_dir = out_dir / "parsed_profiles"
    if save_text:
        text_dir.mkdir(parents=True, exist_ok=True)
    if save_parsed:
        parsed_dir.mkdir(parents=True, exist_ok=True)

    llm_client = LLMClient() if use_llm else None
    results: list[FileResult] = []

    print(f"\n[+] Procesando {len(pdf_files)} PDFs de prueba...")
    print(f"    Modo: {'Solo Extracción de Texto (Fase A)' if text_only else ('Fase A + LLM (Gemini)' if use_llm else 'Fase A + Heurística (Sin LLM)')}")
    print("-" * 80)

    for idx, pdf_path in enumerate(pdf_files, 1):
        res = FileResult(
            filename=pdf_path.name,
            pages=0,
            char_count=0,
            words_count=0,
            two_column_pages=0,
            is_scanned_or_empty=False,
            extract_time_ms=0.0,
        )

        # Fase A: Extracción de texto
        t0 = time.perf_counter()
        raw_text = ""
        try:
            pages, two_cols = analyze_pdf_layout(pdf_path)
            res.pages = pages
            res.two_column_pages = two_cols

            raw_text = extract_text_from_pdf(pdf_path)
            res.extract_time_ms = round((time.perf_counter() - t0) * 1000, 1)
            res.char_count = len(raw_text)
            res.words_count = len(raw_text.split())

            if res.char_count < 100:
                res.is_scanned_or_empty = True

            if save_text and raw_text:
                (text_dir / f"{pdf_path.stem}.txt").write_text(raw_text, encoding="utf-8")

        except Exception as e:
            res.extract_time_ms = round((time.perf_counter() - t0) * 1000, 1)
            res.extract_error = f"{type(e).__name__}: {e}"
            results.append(res)
            print(f"[{idx:02d}/{len(pdf_files):02d}] ❌ {pdf_path.name[:35]:35s} | ERROR: {res.extract_error}")
            continue

        # Fase B: Parsing estructurado a Profile (opcional)
        if not text_only and not res.is_scanned_or_empty:
            t1 = time.perf_counter()
            try:
                if use_llm and llm_client and llm_client.is_configured:
                    res.used_llm = True
                    # Riguroso: llamar al LLM con el SYSTEM_PROMPT de importer.py
                    # e indicar si hubo truncamiento por la ventana de 12k de importer.py
                    prompt_text = raw_text[:MAX_RESUME_CHARS]
                    res.llm_char_input = len(prompt_text)
                    messages = [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt_text},
                    ]
                    raw_data = llm_client.parse_json_completion(messages, temperature=0.1)
                    if save_parsed:
                        (parsed_dir / f"{pdf_path.stem}.llm_raw.json").write_text(
                            json.dumps(raw_data, indent=2, ensure_ascii=False), encoding="utf-8"
                        )
                    profile = _build_profile_from_dict(raw_data)
                    # Respetar rate limits de API
                    time.sleep(1.0)
                else:
                    profile = _parse_profile_heuristic(raw_text)

                res.parse_time_ms = round((time.perf_counter() - t1) * 1000, 1)
                res.parsed = True
                res.full_name = profile.full_name
                res.base_lang = profile.base_lang
                res.has_contact = bool(profile.contact.email or profile.contact.phone)
                res.skills_count = len(profile.skills)

                for e in profile.entries:
                    if e.kind == "experience":
                        res.experience_count += 1
                    elif e.kind == "education":
                        res.education_count += 1
                    elif e.kind == "project":
                        res.project_count += 1

                if save_parsed:
                    (parsed_dir / f"{pdf_path.stem}.json").write_text(
                        profile.model_dump_json(indent=2), encoding="utf-8"
                    )

            except Exception as e:
                res.parse_time_ms = round((time.perf_counter() - t1) * 1000, 1)
                res.parse_error = f"{type(e).__name__}: {e}"

        status_flag = "⚠️ VACÍO/OCR" if res.is_scanned_or_empty else "✅ OK"
        layout_flag = f"2-col({res.two_column_pages})" if res.two_column_pages > 0 else "1-col"
        extra_info = ""
        if res.parsed:
            extra_info = f" | {res.full_name or 'Sin Nombre'} | Exp:{res.experience_count} Edu:{res.education_count} Skills:{res.skills_count}"
        elif res.parse_error:
            extra_info = f" | ParseErr: {res.parse_error[:30]}"

        print(
            f"[{idx:02d}/{len(pdf_files):02d}] {status_flag:11s} | {pdf_path.name[:30]:30s} | "
            f"Págs:{res.pages:2d} | {layout_flag:8s} | Chars:{res.char_count:5d} ({res.extract_time_ms:5.1f}ms){extra_info}"
        )

        results.append(res)

    return results


def print_summary_table(results: list[FileResult], text_only: bool) -> None:
    total = len(results)
    if total == 0:
        return

    failed_extract = [r for r in results if r.extract_error]
    scanned_or_empty = [r for r in results if r.is_scanned_or_empty]
    success_extract = [r for r in results if not r.extract_error and not r.is_scanned_or_empty]
    two_cols = [r for r in results if r.two_column_pages > 0]

    avg_chars = sum(r.char_count for r in success_extract) / max(len(success_extract), 1)
    avg_ext_time = sum(r.extract_time_ms for r in results) / total

    print("\n" + "=" * 80)
    print(" RESUMEN DEL BENCHMARK".center(80))
    print("=" * 80)
    print(f"Total PDFs testeados:      {total}")
    print(f"Extracción exitosa:        {len(success_extract)} / {total} ({(len(success_extract)/total)*100:.1f}%)")
    print(f"Errores de lectura/PDF:    {len(failed_extract)}")
    print(f"Vacíos o imágenes (OCR?):  {len(scanned_or_empty)}")
    print(f"Layouts de 2 columnas:     {len(two_cols)}")
    print(f"Promedio caracteres/CV:    {int(avg_chars)}")
    print(f"Tiempo medio extracción:   {avg_ext_time:.1f} ms / archivo")

    if not text_only:
        parsed_ok = [r for r in results if r.parsed]
        failed_parse = [r for r in results if r.parse_error]
        avg_parse_time = sum(r.parse_time_ms for r in parsed_ok) / max(len(parsed_ok), 1)

        print("-" * 80)
        print(f"Perfiles estructurados OK: {len(parsed_ok)} / {len(success_extract)}")
        print(f"Errores de parsing:        {len(failed_parse)}")
        print(f"Tiempo medio de parsing:   {avg_parse_time:.1f} ms / archivo")
        if parsed_ok:
            total_exp = sum(r.experience_count for r in parsed_ok)
            total_skills = sum(r.skills_count for r in parsed_ok)
            print(f"Promedio Experiencias:     {total_exp / len(parsed_ok):.1f}")
            print(f"Promedio Skills:           {total_skills / len(parsed_ok):.1f}")

    print("=" * 80 + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch test CV extractor and parser.")
    parser.add_argument("--dir", default="test_pdfs", help="Directory with PDF resumes")
    parser.add_argument("--sample", type=int, default=10, help="Number of files to sample (0 for all)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic sampling")
    parser.add_argument("--files", nargs="+", help="Specific filenames inside --dir to test")
    parser.add_argument("--text-only", action="store_true", help="Run only Fase A (text extraction)")
    parser.add_argument("--llm", action="store_true", help="Enable LLM parsing (default is heuristic / no-llm)")
    parser.add_argument("--save-text", action="store_true", help="Save extracted text files")
    parser.add_argument("--save-parsed", action="store_true", help="Save parsed Profile JSON files")
    parser.add_argument("--out-dir", default="out/parsing_benchmark", help="Directory for reports")

    args = parser.parse_args()
    source_dir = Path(args.dir)

    if not source_dir.is_dir():
        print(f"❌ Error: El directorio '{source_dir}' no existe.", file=sys.stderr)
        return 1

    if args.files:
        pdf_files = [source_dir / f for f in args.files if (source_dir / f).is_file()]
        missing = [f for f in args.files if not (source_dir / f).is_file()]
        if missing:
            print(f"⚠️ Archivos no encontrados: {missing}", file=sys.stderr)
    else:
        all_pdfs = sorted(list(source_dir.glob("*.pdf")) + list(source_dir.glob("*.PDF")))
        if not all_pdfs:
            print(f"❌ Error: No se encontraron archivos PDF en '{source_dir}'.", file=sys.stderr)
            return 1

        if args.sample > 0 and args.sample < len(all_pdfs):
            rng = random.Random(args.seed)
            pdf_files = rng.sample(all_pdfs, args.sample)
        else:
            pdf_files = all_pdfs

    out_dir = Path(args.out_dir)
    results = run_benchmark(
        pdf_files,
        text_only=args.text_only,
        use_llm=args.llm,
        out_dir=out_dir,
        save_text=args.save_text,
        save_parsed=args.save_parsed,
    )

    print_summary_table(results, text_only=args.text_only)

    # Save summary report JSON
    report_file = out_dir / "report.json"
    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total": len(results),
        "text_only": args.text_only,
        "use_llm": args.llm,
        "results": [asdict(r) for r in results],
    }
    report_file.write_text(json.dumps(report_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[i] Reporte completo guardado en: {report_file}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

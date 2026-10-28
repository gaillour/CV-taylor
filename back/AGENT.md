# back/AGENT.md — Directivas Operativas Backend (`engine` + `api`)

## Estructura y Contratos (SSOT)
- Inspeccionar esquemas de dominio, cupos (`SECTION_MAX_ENTRIES`, `min_bullets`, `max_bullets`) y `DesignKnobs` exclusivamente en `back/engine/models.py`.
- Inspeccionar compilador Typst y cálculo de `FitReport` en `back/engine/renderer.py`.
- Inspeccionar fit loop determinista basado en slots de sección/viñetas y micro-ajuste de `density` en `back/engine/fit.py`.
- Inspeccionar plantillas tipográficas ATS-Strict en `back/engine/templates/` (`classic.typ`, `modern.typ`, `engineering.typ`).
- Inspeccionar validador y parser ATS (Lever-compatible) en `back/engine/ats/` (`ATSChecker`, `check_ats_compliance`).
- Inspeccionar adaptador LLM, extractor y tailoring en `back/engine/llm.py`, `extractor.py`, `anti_hallucination.py`, `tailor.py` y `feedback_loop.py`.
- Inspeccionar CLI `cvt` (`tailor`, `check-ats`, `render`) en `back/cli.py`.

## Reglas de Implementación (`back/engine`)
- Compilar siempre vía `typst.Compiler` con `ignore_system_fonts=True`, `font_paths=[FONTS_DIR]` y `timestamp=0` para garantizar hashes SHA-256 deterministas.
- Pasar el `RenderModel` serializado en memoria mediante `sys.inputs.data` (`json(bytes(sys.inputs.data))`).
- Mantener estructura fija ATS en todas las plantillas `.typ`: usar encabezados nativos `= Nombre` (`<H1>`) y `== Sección` (`<H2>`), nombres de sección canónicos simples (prohibidos compuestos como 'Educación y Formación'), orden lineal `Puesto — Empresa | Fecha | Ubicación`, y prohibir `#grid`.
- Respetar umbrales mínimos ATS: fuente `>= 9.2pt`, sección Educación con máx. 1 viñeta concisa, y fechas con guion estándar `MM/YYYY - MM/YYYY` o `Presente`.
- Prohibido podar `summary` en `back/engine/fit.py` (`summary_pruned` debe permanecer en `False`). Ajustar el encaje de 1 página respetando `SECTION_MAX_ENTRIES`, podando viñetas no ancladas por menor `priority` dentro de `[min_bullets, max_bullets]` y acotando `DesignKnobs`.
- Formatear rangos de fecha siempre con separador explícito `MM/YYYY - MM/YYYY` o `Presente`/`Present` cuando `end_date` esté definido (inclusive si `start_date == end_date`).
- Preservar al final de toda plantilla `.typ` el bloque `#v(0pt, weak: true)#context [#metadata(counter(page).final().first()) <pages>#metadata(here().position()) <end>]`.
- Prohibido renderizar `EntryTitle` con `source="ai"` si `approved=False` o `approved_at=None`.
- Prohibido agregar dependencias que descarguen paquetes de `@preview` (Typst Universe) en tiempo de ejecución.

## Comandos de Verificación
- Instalar/sincronizar entorno: `uv sync`
- Ejecutar tests: `uv run pytest`
- Linter y formato: `uv run ruff check . && uv run ruff format --check .`

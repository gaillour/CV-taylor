# TODO.md — Roadmap Operativo (`cv-tailor`)

## Fase Activa: F3 — Web App MVP (FastAPI + Next.js + Typst Engine)
> Arquitectura y metodología: **Vertical Slicing** (*Thin Vertical Slices*).
> Especificación técnica: `brain/9512bd84-4ac2-462d-b4dd-09660ce469cf/plan_f3_vertical_slices_web_app.md`.

### Slices de Ejecución

- [x] **Slice 1: Tracer Bullet — Render en Vivo y Telemetría de Llenado**
  - [x] Dependencias API (`fastapi`, `uvicorn[standard]`) en `pyproject.toml` sincronizadas con `uv`.
  - [x] Backend FastAPI (`back/api/main.py`) con CORS habilitado para `:3000`.
  - [x] Endpoint `POST /api/render/preview` (`back/api/routes/render.py`) que compila `RenderModel` a SVG vía Typst y retorna `FitReport`.
  - [x] Frontend Next.js 16 (App Router + Tailwind CSS v4 + TypeScript) en `front/` con `pnpm`.
  - [x] Store Zustand (`useCvStore`) con carga reactiva de preview.
  - [x] Componente `CvPreview` con canvas SVG y controles de zoom.
  - [x] Componente `FillGauge` con semáforo de llenado A4 (reubicado compacto horizontal en el header, verde 85-96%, amarillo <85%, rojo >100%).
  - [x] Tests automatizados de API en `tests/test_api_render.py` (53 tests pasando al 100%).
  - [x] Compilación y linter frontend verificados (`pnpm --dir front build` y `pnpm --dir front lint`).

- [x] **Slice 2: Edición Reactiva — Tarjetas Interactivas sin Latencia IA**
  - [x] Paneles de edición por bloques con acordeones (`CvEditor`, `HeaderSection`, `SummarySection`, `SkillsSection`, `ExperienceSection`, `ProjectsSection`, `EducationSection`).
  - [x] Toggles para viñetas individuales (`selected=True/False`) y edición inline de texto (`BulletList`).
  - [x] Toggles para activar/desactivar entradas completas de experiencia, proyectos y educación.
  - [x] Debounce de 150ms al tipear texto y llamadas inmediatas en toggles $\to$ `POST /api/render/preview` $\to$ actualización fluida sin LLM (~15-30ms).
  - [x] Tests automatizados de API en `tests/test_api_render.py` (55 tests pasando al 100%).
  - [x] Verificación de frontend (`pnpm --dir front build` y `pnpm --dir front lint` limpios).

- [x] **Slice 3: Flujo de Adaptación — Oferta Laboral a CV Adaptado**
  - [x] Endpoint `POST /api/tailor` conectado a `TailoringPipeline` con compilación Typst y extracción de JobSpec.
  - [x] Modal en frontend (`TailorModal`) para pegar oferta, elegir tema, idioma y switch de modo rápido sin LLM.
  - [x] Visualización de progreso con stepper animado y resumen de ATS match (score, keywords, rol detectado).
  - [x] Tests automatizados de API en `tests/test_api_tailor.py` (59 tests globales pasando al 100%).
  - [x] Compilación y linter de frontend verificados sin errores.

- [x] **Slice 4: Exportación & Inmutabilidad — PDF y Snapshots**
  - [x] Endpoint `POST /api/export/pdf` (descarga directa binaria WYSIWYG con Typst) y `POST /api/export/snapshot` (`out/snapshots/<id>.json`).
  - [x] Botones de acción directa en frontend ("Descargar PDF", "Guardar" versión con hash SHA-256 y toast de confirmación).
  - [x] Suite de tests automatizados en `tests/test_api_export.py` (63 tests globales pasando al 100%).
  - [x] Compilación y linter de frontend impecables (`pnpm --dir front build` y `pnpm --dir front lint`).

- [x] **Slice 5: Shell Multi-página + Galería de CVs**
  - [x] Topbar con tabs `CVs` (`/`, landing) · `Perfil` (`/perfil`) · `Editor` (`/editor/[id]`).
  - [x] Campo `parent_id: str | None` en `Snapshot` (`back/engine/snapshot.py`).
  - [x] Endpoints `GET /api/snapshots` (listado liviano) y `GET /api/snapshots/{id}`.
  - [x] Galería agrupada por empresa/rol: tarjeta con última versión + historial desplegable (cadena `parent_id`). Sin miniaturas; preview grande en modal al click.
  - [x] "Editar" = fork: carga el `RenderModel` como borrador; guardar crea snapshot nuevo con `parent_id`. Inmutabilidad estricta del original.
  - [x] "Nuevo CV" en galería abre `TailorModal` $\to$ navega a `/editor/nuevo`. `/editor` sin borrador redirige a `/`.
  - [x] Borrador único en Zustand persistido (`localStorage`); indicador de cambios sin guardar en tab Editor; abrir otro pide confirmar descarte.
  - [x] Suite de tests backend (`tests/test_api_snapshots.py`, 68 tests globales pasando al 100%).
  - [x] Build y lint limpios en frontend (`pnpm build` y `pnpm lint`).

- [x] **Slice 6: Perfil Maestro — CRUD Manual**
  - [x] Endpoints `GET/PUT /api/profile` sobre `out/profile.json` con fallback y sembrado automático desde `fixtures/profile_juan.json`.
  - [x] Persistencia desacoplada en `back/engine/profile_store.py` consumida por `render.py` y `tailor.py`.
  - [x] Vista completa `/perfil` en Next.js con pestañas Datos Generales, Habilidades, Experiencia, Proyectos y Educación.
  - [x] Soporte para múltiples títulos por entrada con arquetipos (`EntryTitle`), hechos atómicos (`Fact`) con pesos y catálogo de habilidades.
  - [x] Pestaña Perfil desbloqueada en `TopNav` y estado de guardado con detector de cambios (`dirty`).
  - [x] Tests automatizados de API en `tests/test_api_profile.py` (72 tests globales pasando al 100%).
  - [x] Frontend compilando y validando limpio (`pnpm build` y `pnpm lint`).

- [x] **Slice 7: Ingesta y Onboarding — Upload de CV Previo**
  - [x] Endpoint `POST /api/profile/import` (PDF/TXT $\to$ `importer.py` $\to$ `Profile` sin persistir en disco).
  - [x] Subcomando CLI `cvt import <archivo.pdf|txt> -o <perfil.json> [--lang es|en] [--no-llm]`.
  - [x] Componente `CvDropzone` y vista protagonista de Onboarding en `/perfil` cuando el perfil está vacío con opción de modo manual.
  - [x] Modal "Importar CV" accesible en el header de `/perfil` para re-importar en cualquier momento.
  - [x] Banner CTA y redirección controlada en `/` (Galería) si el perfil maestro está vacío.
  - [x] 76 tests pasando al 100% (`tests/test_api_profile.py`), linter `ruff` y build de frontend limpios.

- [x] **Slice 8: Asistencias IA en Perfil**
  - [x] Destilar: texto libre de una entry $\to$ facts propuestos.
  - [x] Sugerir títulos alternativos por arquetipo.
  - [x] Mejorar fact existente sin inventar datos (validación anti-alucinación).
  - [x] Detectar skills mencionadas ausentes del catálogo.
  - [x] Todo output IA entra como `source="ai"`, `approved=False` hasta aprobación manual.
  - [x] Presupuesto acotado de IA: 1 pasada opcional de "Acomodar con IA" habilitada exclusivamente tras importar un CV (`canEnhanceAfterImport`), sin botón libre en el header.
  - [x] Fix de scroll vertical en `/perfil` y limpieza de Topbar en Editor (retiro de `snap_id`, badge ATS limpio `ATS X%` y retiro de switch `ES/EN` inefectivo en borrador).

- [ ] **Slice 9: Persistencia Cloud — Supabase + Retorno al Perfil**
  - [ ] Integración de Supabase Auth, Postgres y Storage para perfil y snapshots inmutables.
  - [ ] Botón por viñeta en Editor "Guardar en Perfil" (crea/actualiza fact aprobado). Ediciones del editor son locales al CV por defecto.

---

## Deuda Técnica / Optimizaciones Pendientes
- [ ] **Soporte real de Idioma (`es` / `en`) y Traducción de Contenido:**
  - El switch `ES/EN` del editor se retiró porque `RenderModel` está desnormalizado (cambiar `lang` en el editor solo alteraba encabezados de sección sin traducir viñetas ni títulos).
  - Solución prevista: gestionar el idioma objetivo al generar el CV (`TailorModal` / `POST /api/tailor` traduciendo/seleccionando hechos en el idioma destino) o sumar variantes bilingües asistidas en el Perfil Maestro.
- [ ] **Desacoplar estado de inputs en CvEditor para eliminar lag de tipeo:**
  - Actualmente cada pulsación de tecla en `BulletList` / inputs emite a Zustand y dispara compilación Typst a 150ms provocando re-renders del árbol completo.
  - Solución prevista: manejar estado local desacoplado en cada input/textarea con sincronización al store únicamente en `onBlur` o debounce local mayor sin re-renderizar componentes padre.

---

## Fases Concluidas

### Fase F1/F2: Fitting Confortable (1 Página A4), Poda Bottom-Up, Ingesta PDF y Armonización IA
- [x] Extractor de texto crudo desde PDF multi-columna (`pypdf>=5.0.0`) y estructurador IA (`importer.py`).
- [x] Motor de telemetría y medición física en Typst (`measure_fit`, `end_y_pt`, `fill_pct`, `usable_height_pt`).
- [x] Interpolación de variables tipográficas en `DesignKnobs` (`from_density` y `from_relaxed`).
- [x] Cupos máximos de entradas por sección (`SECTION_MAX_ENTRIES`: experiencia $\le 3$, proyectos $\le 3$, educación $\le 2$).
- [x] Tope de densidad confortable `MAX_COMFORTABLE_DENSITY = 0.35` en `models.py` y `fit.py`.
- [x] Poda determinista Bottom-Up por prioridad y posición (`projects` antes que `experience`, viñetas finales primero, `summary` inmutable).
- [x] Presupuesto orientativo de 16 a 24 palabras por viñeta y estilo nominal en prompts.
- [x] Pasada de consistencia editorial post-poda (`harmonize_resume`) con validación anti-alucinación estricta.
- [x] Unificación 100% a JSON nativo: eliminación total de `yaml`.
- [x] Suite de 53 tests pasando al 100% con linter impecable (`uv run ruff check .`).

---

## Fases Futuras (Resumen Operativo)

### F3 — Web App MVP (FastAPI + Supabase + Next.js)
- API backend en `back/api/`: endpoints `/api/profile`, `/api/tailor`, `/api/import-cv`.
- Editor visual de tarjetas interactivas con renderizado SVG en tiempo real (~15 ms).
- Barra de estado de llenado vertical en vivo ($85\% - 96\%$ verde, $>100\%$ alerta de 2 páginas).
- Edición libre del usuario en frontend sin llamadas a la IA en el loop de tipeo.
- Persistencia de snapshots inmutables en Supabase Storage/Postgres.

### F4 — Validación y Feedback Real
- Pruebas con perfiles reales y ofertas activas en portales de empleo.
- Medición de parsing en plataformas ATS reales (Lever, Greenhouse, Workday).

### F5 — Monetización
- Modelo de Pase de Temporada (acceso fijo por 14 o 30 días) o paquetes de créditos.
- Integración de pasarela de pago (MercadoPago / Lemon Squeezy).

### F6 — Expansión Técnica
- Compilación Typst directa en navegador vía WebAssembly (`typst.ts`).
- Editor de código en crudo (Monaco con JSON Schema del `RenderModel`).

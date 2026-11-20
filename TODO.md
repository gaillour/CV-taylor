# TODO.md — Roadmap Operativo (`cv-tailor`)

## P0 — Bugs de Onboarding y Flujo de Borrador (Feedback)

- [x] **Onboarding de cuenta existente redirige a `/editor` en lugar de `/perfil`:**
  - Investigar el flujo post-onboarding cuando el usuario ya tiene una cuenta existente; debe abrir `/perfil` y no saltar directo a `/editor`.
- [x] **Pedir login recién al intentar guardar el perfil:**
  - El onboarding no debe exigir autenticación antes de tiempo; permitir completar/editar el perfil en modo borrador y solicitar login únicamente al momento de guardar.
- [x] **Clarificar aviso y copy del borrador local:**
  - Reformular el mensaje y las acciones del aviso/modal de borrador pendiente para que se entienda claramente qué pasó con los datos cargados y qué implica cada opción.


## P1 — Refinamiento de Datos y Modelo de Proyectos

- [x] **Modal de sincronización selectiva al guardar CV (Editor ➔ Perfil Base SSOT):**
  - Al hacer click en "Guardar CV", presentar la opción de elegir qué cambios puntuales (nuevos proyectos agregados, viñetas modificadas) se desean impactar y persistir también en el perfil base.


## P2 — E2E Onboarding, Checkout y Dashboard

- [ ] **Reacomodación del Dashboard (`/cvs`):**
  - Definir y diseñar UX para estado vacío y flujo de creación (botón unificado con prompt vs botón doble base/adaptado).
- [ ] **Test E2E del flujo de conversión completo:**
  - Validar el pipeline integral: landing → dropzone parsing → editor anónimo (`draft.ts`) → login → migración de borrador a Supabase → disparo de paywall al superar cuota.
- [ ] **Checkout y monetización:**
  - Definir e integrar pasarela/proveedor de checkout para la compra del Pase.
- [x] **Perfeccionar cursor fantasma en Landing Sección 04 (`ProfileFlyDemo.tsx`):**
  - Pulir trayectoria y timing del cursor; al agregar el último bloque desbordado (`extra`), hacer que el cursor se corra hacia la derecha (como evaluando/"pensando" frente a la hoja A4) y luego vuelva sobre la tarjeta para hacer click y quitarlo.


## P3 — Plantillas Typst & Compatibilidad ATS

- [ ] **Auditoría de orden de lectura y jerarquía ATS:**
  - Validar flujo de lectura lineal y jerarquía semántica del texto extraído contra parsers reales (Lever, Greenhouse, Workday, `pdftotext`), especialmente en plantillas de dos columnas.
- [ ] **Calibración / Decisión template `vercanard`:**
  - Evaluar rendimiento de layout a dos columnas (bajo porcentaje de llenado) y definir si se redistribuyen bloques o se retira del catálogo activo.


## Completados Recientes (`feat/todo-autonomo`)

- [x] **Borrador local no guardado (modal ambiguo):** Reemplazado por modal claro con merge aditivo determinista (`POST /profile/merge`, *"Sumar a mi perfil"* vs *"Descartar borrador"*).
- [x] **Proyectos/experiencias con 0 viñetas:** Ingesta y curador extraen al menos 2 viñetas por defecto (o 1 si el CV original tenía 1, partiendo párrafos descriptivos si no había bullets), el fitter nunca poda por debajo de 1 viñeta (`len(entry.bullets) > 1`) y la UI advierte si una entrada manual queda sin viñetas.
- [x] **Flujo de onboarding (`Carga ➔ Perfil ➔ Generar CV`):** Dropzone redirige a `/perfil` soportando modo borrador anónimo editable (`draft.ts`) con CTA destacado *"Generar CV →"* hacia `/editor`.
- [x] **Nombres de proyectos vs rol/empresa:** `titles[]` representa estrictamente el nombre del proyecto (en negrita), mientras que `org` (empresa/institución) y `role` (rol desempeñado) son opcionales (`str | None = None`) y se renderizan sin guiones ni separadores huérfanos.
- [x] **Detección y formato de links (`github`, `linkedin`, `website`, `link`):** Normalizados determinísticamente (`github.com/<user>`, `linkedin.com/in/<user>`, dominio limpio sin `https://` duplicado) con enlaces `#link("https://...")[url_limpia]` clickeables y compatibles con ATS/`pdftotext`.
- [x] **Fechas duplicadas (`2026 - 2026`) o `"Presente"` inventado:** Si `start_date == end_date` o `end_date` está vacío, se colapsa a una única fecha (`2026`), preservando `"Presente"` únicamente si figura explícitamente en el CV.
- [x] **Diagnóstico e instrucciones compartidas (Ingesta vs Adaptación):** Centralizadas las directivas en `back/engine/prompts/rules.py` (`SHARED_DATA_HYGIENE_RULES`), inyectadas tanto en `text_parser.py` como en `llm_curator.py`, y unificado `RenderModel.from_profile` en backend (`POST /anonymous/render-model`) como única fuente de verdad.
- [x] **Fix guardado de CV (error 404 snapshot not found):** Investigar y resolver error 404 al persistir o actualizar el snapshot en backend/Supabase.
- [x] **Fix ordenamiento de proyectos en editor:** Corregir las flechas de reordenamiento por prioridad en la lista de proyectos que actualmente no responden.
- [x] **Fix detección de avatar en recomendación de template:** Corregir la condición en el editor que sigue sugiriendo "se debería usar con foto" aunque el perfil ya cuente con un avatar cargado (evitando requerir un guardado manual forzado).
- [x] **Empresa y rol opcionales en proyectos:** Permitir que los campos de empresa/institución y rol sean completamente opcionales en el formulario y asegurar que los templates de Typst rendericen sin guiones o espacios huérfanos si faltan.
- [x] **Desactivar hyphenation (guionado automático) en Typst:** Configurar `#set text(hyphenate: false)` en las plantillas Typst para evitar que las palabras se corten con guión al final de línea (`ejem- \n plo`), garantizando lectura limpia para parsers ATS.
- [x] **Polish visual en plantillas Typst:** Corregir inconsistencias de espaciado, márgenes y pesos tipográficos reportados en plantillas visuales.
- [x] **Auditoría de licencias:** Documentar licencias (MIT, Apache 2.0, etc.) de las plantillas integradas en `back/engine/templates/`.


## Historial de Fases Concluidas

| Fase / Hito | Descripción | Estado |
|---|---|---|
| **Landing Page & Hero Polish** | The Mirror con dock EN 3D, animación de 3 pasos por scroll continuo, simplificación de Hero (retiro de cinta A4, ajuste de sello Bespoke y limpieza de copys instructivos residuales). | Concluido |
| **Navegación Landing vs Editor** | Desactivado redirect forzado `/` ➔ `/editor` para usuarios autenticados al navegar a la landing. | Concluido |
| **Onboarding Anónimo & Conversión** | Endpoints anónimos (parse/render), rate-limiting por IP, borrador local (`draft.ts`), cuota de adaptaciones (migración `004_`), paywall modal y migración post-login. | Concluido |
| **Infraestructura & Despliegue** | Dockerfile multi-stage con Python 3.12 y `uv`, CORS dinámico, setup Supabase Cloud (DB + Storage) y deploy frontend en Vercel. | Concluido |
| **Fase F7: Base UI & Ingesta GitHub** | Tokens y paleta sastre (`/cvs`, `/perfil`, `/editor`), refactor de componentes atómicos y extracción determinista de proyectos desde GitHub con síntesis IA. | Concluido |
| **Fase F6: Plantillas Visuales & Avatar** | Soporte de foto/avatar (local + Supabase), 5 nuevas plantillas Typst (`modern-cv`, `vercanard`, `impressive-impression`, `modern-resume`, `metronic`), selector categorizado y aviso amigable en editor. | Concluido |
| **Fase F5: Consistencia de Editor e Ingesta** | Importación integral en editor, anti-redundancia en asistente IA, calibración de las 6 plantillas Typst, extracción exhaustiva y desacople de edición en perfil. | Concluido |
| **Fase F4: Fitting 85-100% & Usabilidad** | Rango garantizado 85-100%, selector binario de idioma, ATS live, reordenamiento de secciones y títulos de artefacto en proyectos. | Concluido |
| **Fase F1 / F2: Fitting & Motor Físico** | Medición física en Typst, poda determinista Bottom-Up y fitting en 1 página A4. | Concluido |
| **Slice 11: Espejo Bilingüe** | Perfil base SSOT con espejo derivado incremental (`mirror.py`, `translator.py`), glosario determinista e integración en editor/tailoring. | Concluido |
| **Slice 10: Pulido UX & Anti-Alucinación** | Validador estricto anti-alucinación en summary, importación de proyectos en editor y loading dashboard. | Concluido |
| **Slice 9: Persistencia Cloud** | Capa Repository (local + Supabase Postgres/Storage), Auth JWT y soft delete de snapshots. | Concluido |
| **Slice 8: Asistencias IA en Perfil** | Destilación de viñetas, sugerencias de títulos y normalización de skills con aprobación manual. | Concluido |
| **Slice 7: Ingesta y Onboarding** | Upload y extracción de CV previo (PDF/TXT) vía LLM/pypdf con CLI y vista dropzone. | Concluido |
| **Slice 6: Perfil CRUD Manual** | Estructuración del perfil base con arquetipos de títulos, hechos y catálogo de skills. | Concluido |
| **Slice 5: Shell Multi-página** | Topbar con navegación CVs / Perfil / Editor, galería agrupada e historial de versiones. | Concluido |
| **Slice 4: Exportación & Inmutabilidad** | Descarga binaria de PDF vía Typst y snapshots inmutables con hash SHA-256. | Concluido |
| **Slice 3: Flujo de Adaptación** | Pipeline de tailoring con extracción de oferta, matching ATS y modal de progreso. | Concluido |
| **Slice 2: Edición Reactiva** | Tarjetas interactivas con toggles de viñetas y debounce sin latencia IA. | Concluido |
| **Slice 1: Tracer Bullet** | Render en vivo a SVG vía Typst, telemetría de llenado A4 y shell Next.js. | Concluido |

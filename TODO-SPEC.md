# TODO-SPEC.md — Especificación Técnica Cerrada (`feat/todo-autonomo`)

## Resumen de Decisiones del Grill-Me
- **0A**: Working tree comiteado (`refactor:`) y rama `feat/todo-autonomo` creada (`[x] T0`).
- **1A**: Flujo de onboarding: Dropzone ➔ `/perfil` (soportando modo borrador anónimo `draft.ts` editable con CTA "Generar CV" ➔ `/editor`).
- **2A**: Modal de borrador local: copy claro + acción **"Sumar a mi perfil"** (merge aditivo determinista) vs **"Descartar borrador"**.
- **3A**: Modelo de proyectos: `titles[]` es el **nombre del proyecto** (en negrita + variantes/artefacto). `org` pasa a ser opcional (`str | None = None`, empresa/institución) y `role: str | None = None` opcional en `Entry` y `RenderEntry`. Renderizado en templates y editor sin separadores huérfanos (`—`, `|`) cuando `role` u `org` faltan.
- **4A**: Viñetas: mínimo 2 por defecto para experiencia y proyectos, pero si el CV original tenía 1 queda en 1 (sin inventar). Si viene con 0 y hay descripción/párrafo, se parte en viñetas; si queda en 0, aviso en UI. El motor de fit nunca poda una entrada por debajo de 1 viñeta.
- **5A**: Fechas: si no hay `end_date`, mostrar solo `start_date` (nunca agregar "Presente" salvo que `end_date` diga explícitamente `Presente`/`Present`/`current`). Si `start_date == end_date`, colapsar a una sola fecha (`2026`, nunca `2026 - 2026`).
- **6B**: Links: normalizar `github` (`github.com/<user>`), `linkedin` (`linkedin.com/in/<user>`) y `website`/`link` (sin `https://` duplicado en el texto visible y con `https://` válido en el destino del `link(...)` de Typst), mostrando la URL normalizada visible como texto clickeable para compatibilidad ATS / `pdftotext`.
- **7A**: Eliminar duplicación TS/Python de `profileToRenderModel`: el frontend obtiene el `RenderModel` desde el backend (`POST /anonymous/render-model` o incluido en `/anonymous/parse` y endpoint liviano de conversión), manteniendo a `RenderModel.from_profile` en Python como única fuente de verdad (SSOT).
- **8A**: Módulo compartido `back/engine/prompts/rules.py` con directivas comunes (fechas, links, proyectos `title`=nombre / `org`=empresa opcional / `role`=rol opcional, viñetas exhaustivas sin dejar 0 cuando hay texto) inyectado en ingesta (`text_parser.py`) y adaptación (`llm_curator.py`), respaldado por normalización determinista en Python.
- **9C**: Modal de sincronización selectiva Editor ➔ Perfil Base: **Pospuesto / Diferido**.
- **10B**: Auditoría ATS externa: **Pospuesto / Diferido**.
- **11C**: Decisión sobre template `vercanard`: **Pospuesto / Diferido**.
- **12B**: Polish visual en plantillas Typst: pasada genérica de consistencia tipográfica, márgenes y espaciados.
- **13A**: Auditoría de licencias en `back/engine/templates/LICENSES.md`.

---

## Tickets de Ejecución Autónoma (Subagentes Hydrogen)

### [x] T0 — Preparación de rama y actualización de referencias SSOT
- **Estado**: Completado (`a48db8f` en `feat/todo-autonomo`).

---

### [x] T1 — Desactivar hyphenation (`hyphenate: false`) en todas las plantillas Typst
- **Objetivo**: Evitar corte de palabras con guion al final de línea en las 11 plantillas Typst para lectura limpia ATS.
- **Archivos a modificar**:
  - `back/engine/templates/basic.typ`
  - `back/engine/templates/classic.typ`
  - `back/engine/templates/engineering.typ`
  - `back/engine/templates/impressive-impression.typ`
  - `back/engine/templates/kire.typ`
  - `back/engine/templates/metronic.typ`
  - `back/engine/templates/modern-cv.typ`
  - `back/engine/templates/modern-resume.typ`
  - `back/engine/templates/modern.typ`
  - `back/engine/templates/vercanard.typ`
  - `back/engine/templates/yuan.typ`
  - `tests/` (agregar o actualizar test que verifique `hyphenate: false` y compilación de las 11 plantillas).
- **Especificación**:
  - En cada `.typ`, incluir `hyphenate: false` en la directiva principal `#set text(...)`.
- **Verificación**:
  - `uv run pytest`
  - `uv run ruff check .`

---

### [x] T2 — Modelo de Proyectos: `titles[]` como nombre, `org` y `role` opcionales en Backend, Templates y Frontend
- **Objetivo**: Garantizar que en entradas `kind == "project"` el título (`titles[]` / `RenderEntry.title`) sea el nombre del proyecto, mientras que `org` (empresa/institución/contexto) y `role` (rol desempeñado) sean opcionales (`str | None = None`) y se rendericen sin guiones ni barras huérfanas.
- **Archivos a modificar**:
  - `back/engine/models/profile.py`:
    - En `Entry`: cambiar `org: str = ""` (o `str | None = None` normalizado a `""` o `None`, asegurando retrocompatibilidad con JSONs existentes donde `org` sea string vacío o `None`), agregar `role: str | None = None`. Cambiar `min_bullets` default en proyectos/experiencias si aplica o mantener `min_bullets: int = Field(default=2, ge=0)` para `experience` y `project` (respetando si tiene 1 fact real).
  - `back/engine/models/render.py`:
    - En `RenderEntry`: permitir `org: str = ""` (o `str | None = None`, default `""`), agregar `role: str | None = None`.
    - En `RenderModel.from_profile`: poblar `role=entry.role` y `org=entry.org or ""`.
  - `back/engine/templates/*.typ` (las 11 plantillas):
    - En la sección de proyectos de cada plantilla, renderizar el nombre del proyecto (`proj.title`) en negrita, y mostrar `proj.role` y `proj.org` solo si están presentes y no son vacíos (ni iguales a `proj.title`), sin dejar `—` ni `|` huérfanos. También en experiencia/educación evitar `—` huérfano si `org` está vacío.
  - `front/src/types/cv.ts`:
    - Actualizar interfaces `Entry` y `RenderEntry` con `org?: string | null` (o `string`) y `role?: string | null`.
  - `front/src/components/profile/tabs/EntriesTab.tsx` y `front/src/components/profile/tabs/entries/EntryCardItem.tsx` (y subcomponentes relacionados):
    - Para `kind === "project"`, etiquetar el título principal como "Nombre del proyecto", y ofrecer campos opcionales "Rol (opcional)" (`entry.role`) y "Empresa / Institución (opcional)" (`entry.org`, default vacío `""` al crear un proyecto nuevo en vez de `"Proyecto o Repositorio"`).
  - `front/src/components/editor/` (donde se editen proyectos/entradas):
    - Permitir `org` y `role` opcionales sin romper el render.
- **Verificación**:
  - `uv run pytest`
  - `uv run ruff check .`
  - `pnpm --dir front build`

---

### [x] T3 — Reglas compartidas de Prompts (`back/engine/prompts/rules.py`) e inyección en Ingesta y Adaptación
- **Objetivo**: Centralizar las directivas invariantes de extracción y estructuración en `back/engine/prompts/rules.py` y usarlas tanto en `back/engine/importer/text_parser.py` como en `back/engine/tailor/llm_curator.py`.
- **Archivos a crear/modificar**:
  - Crear `back/engine/prompts/__init__.py` y `back/engine/prompts/rules.py` con bloques claros:
    - `SHARED_PROJECT_AND_ENTRY_RULES`: Para `kind="project"`, `title` DEBE ser el nombre propio del proyecto/producto/sistema (NUNCA un cargo genérico como "Desarrollador Backend"). Si hay un rol ("Desarrollador Full Stack"), va en `role`. Si hay una empresa/universidad/cliente asociado, va en `org` (si no hay, `null` o `""`).
    - `SHARED_DATE_RULES`: Formato `YYYY-MM` o `YYYY`. Prohibido `start_date == end_date` como rango repetido; si no hay fecha de fin explícita ni dice "Presente"/"Actualidad", `end_date` debe ser `null` (no inventar "Presente").
    - `SHARED_LINK_RULES`: `github` siempre como `github.com/<username>`, `linkedin` siempre como `linkedin.com/in/<handle>`, `website` y `link` como dominio/ruta limpia sin protocolo (`ejemplo.com/proyecto` o `github.com/user/repo`).
    - `SHARED_BULLET_RULES`: Ningún proyecto ni experiencia puede quedar con 0 viñetas (`bullets: []`) si existe texto descriptivo o párrafo; desglosar párrafos en al menos 2 viñetas atómicas (o 1 si es una oración breve única), sin inventar datos.
  - Modificar `back/engine/importer/text_parser.py`:
    - Incorporar las reglas compartidas en `SYSTEM_PROMPT` y actualizar el schema JSON de ejemplo de `entries` para incluir `"role": "Optional role in project or null"` y aclarar `"title"` vs `"org"`.
  - Modificar `back/engine/tailor/llm_curator.py`:
    - Incorporar las reglas compartidas pertinentes en `CURATE_PROFILE_SYSTEM_PROMPT` y en el prompt de armonización (`harmonize_resume_with_llm`), asegurando que nunca reemplace el nombre de un proyecto por un cargo ni deje 0 viñetas.
- **Verificación**:
  - `uv run pytest`
  - `uv run ruff check .`

---

### [x] T4 — Normalizador determinista Post-LLM (Links, Fechas, Proyectos, Viñetas y Poda >= 1 en Fit)
- **Objetivo**: Garantizar por código determinista en Python que ningún error del LLM o del parser heurístico produzca links rotos, fechas `2026 - 2026`, proyectos con el nombre en `org` y el rol en `title`, o entradas con 0 viñetas en el CV generado.
- **Archivos a modificar**:
  - `back/engine/importer/text_parser.py` y/o `back/engine/profile_assistant/deterministic.py`:
    - **Links**: Función normalizadora `normalize_contact_link(val, kind)`:
      - `github`: si recibe `"gaillour"` o `"@gaillour"` o `"https://github.com/gaillour/"` ➔ `"github.com/gaillour"`.
      - `linkedin`: si recibe `"juan-perez"` o `"https://www.linkedin.com/in/juan-perez/"` ➔ `"linkedin.com/in/juan-perez"`.
      - `website` / `entry.link`: quitar `https://` / `http://` y slash final redundante.
    - **Fechas**:
      - Si `end_date` normalizado es igual a `start_date` (ej. `start_date="2026"`, `end_date="2026"`), setear `end_date = None`.
      - Verificar que `Entry.format_date_range` devuelva una única fecha cuando `end_date is None` o `start_str == end_str`.
    - **Proyectos (`kind == "project"`)**:
      - Heurística defensiva en `_build_profile_from_dict` y `clean_and_deduplicate_profile`: si en un `project` el `title` coincide con un patrón de cargo/rol (`^(desarrollador|developer|software engineer|backend|frontend|fullstack|full-stack|ingeniero|pasante|intern|líder|lead|creador|autor)\b` case-insensitive) y `org` tiene un nombre de proyecto distinto (no vacío y que no sea `"Institución"`), intercambiar: el nombre del proyecto pasa a `title`, el cargo pasa a `entry.role`, y `entry.org` queda `""` (o la institución si había otra).
      - Si `org == title` en un proyecto, limpiar `org = ""`.
    - **Viñetas (4A)**:
      - Si una entrada `experience` o `project` viene con `bullets` vacías pero tiene texto en `context` o descripción, partir por oraciones (`. ` / `; `) en `Fact`s separados.
      - Default `min_bullets = 2` para `experience` y `project` cuando tienen `>= 2` facts; si tiene exactamente 1 fact, `min_bullets = 1` (no inventar).
  - `back/engine/fit/orchestrator.py` y `back/engine/fit/content_shaper.py`:
    - En el Paso 3 de overflow extremo (`respect_min_bullets=False`), nunca podar los bullets de una entrada seleccionada a `0`: el piso absoluto de viñetas de cualquier entrada visible (`experience` o `project`) que tenga al menos 1 fact es `1` viñeta (`min_keep = max(1, entry.min_bullets) if respect_min_bullets else 1`). Si aún así desborda, el shaper ya recorta entradas completas antes de dejar un encabezado de proyecto/experiencia huérfano con 0 viñetas.
  - Tests unitarios en `tests/` validando todos los casos (links `gaillour` ➔ `github.com/gaillour`, fecha `2026 - 2026` ➔ `2026`, swap de proyecto cuando `title="Desarrollador Backend"` y `org="CV Tailor"`, y fit piso de 1 viñeta).
- **Verificación**:
  - `uv run pytest`
  - `uv run ruff check .`

---

### [x] T5 — SSOT de `RenderModel`: Endpoint Backend y Eliminación de Duplicación en `profileTransform.ts`
- **Objetivo**: Evitar que el frontend construya `RenderModel` con lógica divergente (como `2026 – Presente` cuando no hay `end_date` o `2026 – 2026`).
- **Archivos a modificar**:
  - `back/engine/models/api_dtos.py` y `back/api/routes/anonymous.py`:
    - Incluir `render_model: RenderModel` directamente en `AnonymousParseResponse` (generado con `RenderModel.from_profile(extracted)`).
    - Agregar endpoint liviano `POST /anonymous/from-profile` (sin rate-limit agresivo de parseo PDF, o con límite amplio de render) que reciba `{ profile: Profile, theme?: ThemeName }` y devuelva `RenderModel.from_profile(profile, theme=theme)`.
  - `front/src/lib/api.ts`:
    - Exponer `convertProfileToRenderModel(profile, theme)` llamando al backend, y actualizar `parseAnonymousCv` para aprovechar `response.render_model` si viene incluido.
  - `front/src/lib/profileTransform.ts`:
    - Alinear la función local de fallback `profileToRenderModel` con las reglas exactas de `Entry.format_date_range` del backend:
      - Si no hay `end_date`, devolver solo `start_date` (NUNCA agregar `– Presente`).
      - Si `start_date === end_date`, devolver solo `start_date`.
      - Usar guion simple `-` (`MM/YYYY - MM/YYYY` o `YYYY - YYYY`), mapeando `role: e.role || null` y `org: e.org || ""`.
    - Usar el endpoint del backend como fuente principal al pasar de Perfil a Editor.
- **Verificación**:
  - `uv run pytest`
  - `pnpm --dir front build`

---

### [x] T6 — Normalización y Renderizado de Links en las 11 Plantillas Typst (6B)
- **Objetivo**: Asegurar que todas las plantillas Typst construyan URLs válidas (`https://...` sin duplicar `https://https://`) y muestren como texto visible la URL limpia (`github.com/gaillour`, `linkedin.com/in/...`, etc.) tanto en contacto como en `proj.link`.
- **Archivos a modificar**:
  - `back/engine/templates/*.typ` (las 11 plantillas):
    - Crear helper en cada template (ej. `#let make_url(raw)` y `#let clean_label(raw)`): si `raw` ya empieza con `http://` o `https://`, el destino `link` usa `raw` tal cual y el label visible le quita el prefijo `https://` / `http://`; si no empieza con `http`, el destino le antepone `"https://"` y el label muestra `raw`.
    - Aplicar tanto a `c.linkedin`, `c.github`, `c.website` como a `proj.link`.
  - Tests en `tests/` verificando compilación y extracción de texto con links con y sin `https://`.
- **Verificación**:
  - `uv run pytest`
  - `uv run ruff check .`

---

### [x] T7 — Flujo de Onboarding: Dropzone ➔ `/perfil` (Modo Borrador Anónimo) ➔ "Generar CV" ➔ `/editor` (1A + 4A UI Warning)
- **Objetivo**: Cambiar el flujo de onboarding para que al subir un CV en la landing (o empezar de cero) el usuario pase primero por `/perfil` para revisar/completar su perfil (incluso sin cuenta, operando sobre `draft.ts`), con un botón primario claro **"Generar CV"** que lo lleve a `/editor`. Además, mostrar un aviso visual en entradas que tengan 0 viñetas.
- **Archivos a modificar**:
  - `front/src/components/landing/HeroDropzone.tsx`:
    - Cambiar `router.push("/editor")` por `router.push("/perfil")` tras `saveDraft(response.profile)` y en `handleStartFromScratch`.
  - `front/src/app/perfil/page.tsx`, `front/src/store/useProfileStore.ts` (y `front/src/components/profile/header/ProfileTopBar.tsx`):
    - Soportar modo anónimo en `/perfil`: si no hay sesión activa en Supabase, cargar el perfil desde `loadDraft()` en `draft.ts` (o un perfil base vacío si no hay draft) y al editar/guardar en modo anónimo persistir automáticamente en `saveDraft(profile)`.
    - Agregar CTA destacado en `ProfileTopBar`: **"Generar CV →"** que guarde los cambios actuales (en `draft.ts` si es anónimo o en backend si está autenticado), construya el `RenderModel` y navegue a `/editor`.
  - `front/src/components/profile/tabs/entries/EntryCardItem.tsx` (y/o `EditorView.tsx`):
    - Mostrar un badge/aviso de advertencia si una entrada de experiencia o proyecto tiene 0 viñetas ("Sin viñetas: agregá al menos 1 logro para que se luzca en tu CV").
- **Verificación**:
  - `pnpm --dir front build`
  - `pnpm --dir front lint`

---

### [x] T8 — Modal de Borrador Local con Merge Aditivo ("Sumar a mi perfil" vs "Descartar") (2A)
- **Objetivo**: Reemplazar el confuso modal de "Borrador local no guardado" por un diálogo claro que permita fusionar aditivamente el borrador local con el perfil en la nube (usando la lógica determinista de merge) o descartarlo.
- **Archivos a modificar**:
  - `back/api/routes/profile.py` y `back/engine/models/api_dtos.py`:
    - Agregar endpoint `POST /profile/merge` que reciba un `Profile` entrante (el borrador local), ejecute `merge_profiles(existing_profile, incoming_profile)` + `clean_and_deduplicate_profile`, persista el perfil resultante y lo devuelva.
  - `front/src/lib/api.ts`:
    - Agregar cliente `mergeProfileWithDraft(draftProfile: Profile): Promise<Profile>`.
  - `front/src/app/editor/page.tsx` y `front/src/app/perfil/page.tsx`:
    - Actualizar el diálogo `confirmDialog`:
      - `title`: `"Encontramos un CV cargado en este navegador"`
      - `message`: `"Ya tenés un perfil guardado en tu cuenta. ¿Querés sumar los datos nuevos de este borrador a tu perfil actual (sin perder lo que ya tenías) o descartar el borrador?"`
      - `confirmText`: `"Sumar a mi perfil"`
      - `cancelText`: `"Descartar borrador"`
    - Al confirmar, llamar a `mergeProfileWithDraft(localDraft.profile)`, actualizar `useProfileStore`, limpiar el draft (`clearDraft()`) y renderizar el CV actualizado.
- **Verificación**:
  - `uv run pytest`
  - `pnpm --dir front build`

---

### [x] T9 — Polish Visual de Consistencia en Plantillas Typst (12B)
- **Objetivo**: Realizar una pasada de consistencia tipográfica, márgenes, interlineado y espaciado entre bloques en las plantillas visuales (`modern-cv.typ`, `impressive-impression.typ`, `modern-resume.typ`, `metronic.typ`) y clásicas sin alterar contratos ATS ni el bloque final `<pages><end>`.
- **Archivos a modificar**:
  - `back/engine/templates/modern-cv.typ`
  - `back/engine/templates/impressive-impression.typ`
  - `back/engine/templates/modern-resume.typ`
  - `back/engine/templates/metronic.typ`
- **Especificación**:
  - Homogeneizar espaciados verticales entre entradas (`above`/`below`), alineación de fechas/metadatos y contraste de grises secundarios, asegurando que ninguna plantilla falle los tests de renderizado, fitting ni ATS (`>= 9.2pt`).
- **Verificación**:
  - `uv run pytest`

---

### [x] T10 — Auditoría y Documentación de Licencias de Plantillas Typst (13A)
- **Objetivo**: Documentar el origen, autor y licencia (MIT, Apache-2.0, etc.) de cada una de las 11 plantillas en `back/engine/templates/LICENSES.md` y actualizar `TODO.md`.
- **Archivos a crear/modificar**:
  - `back/engine/templates/LICENSES.md`
  - `TODO.md` (marcar como completados `[x]` los ítems resueltos en esta tanda).
- **Verificación**:
  - `uv run pytest`
  - `pnpm --dir front build`

---

## Tickets Diferidos (Por decisión del usuario en Grill-Me)
- **P1 — Modal de sincronización selectiva al guardar CV (Editor ➔ Perfil Base SSOT)**: Diferido (**9C**).
- **P2 — Checkout, Paywall E2E y Dashboard**: Fuera de alcance de esta corrida.
- **P3 — Auditoría ATS externa (Lever/Greenhouse/Workday)**: Diferido (**10B**).
- **P3 — Decisión sobre template `vercanard`**: Diferido (**11C**).

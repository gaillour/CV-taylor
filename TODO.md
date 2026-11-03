# TODO.md — Roadmap Operativo (`cv-tailor`)

## Fase Activa: F5 — Consistencia de Editor, Importación y Normalización

### P0 — Crítico & Bugs Inmediatos

- [x] **Fechas idénticas inicio/fin en entradas:**
  - [x] En `back/engine/models.py` (`Entry.format_date_range`), si `start_str == end_str`, devolver un único punto temporal (ej. `"2024"` o `"03/2024"`) en lugar de duplicar `"2024 - 2024"`.
  - [x] Validar compatibilidad en diagnósticos ATS y tests de renderizado.
- [x] **Selección y orden de proyectos al crear CV en blanco:**
  - [x] En `RenderModel.from_profile`, aplicar criterio de selección determinista para proyectos (orden de perfil, pineados y mayor cantidad de viñetas) limitando a `MAX_PROJECT_ENTRIES`.
  - [x] Asegurar que el fitting inicial no reduzca a 0 las viñetas de los proyectos seleccionados dejando títulos aislados.
  - [x] Permitir reordenamiento posicional de entradas (subir/bajar) directamente en el Perfil con persistencia reactiva.

---

### P1 — Core UX & Modularidad en Editor

- [ ] **Importación integral desde Perfil en Editor:**
  - [ ] Permitir importar experiencias laborales y categorías de habilidades desde el Perfil (maestro o espejo bilingüe), replicando el flujo ya existente en proyectos.
- [ ] **Consistencia de acciones y espaciado en Dropdowns:**
  - [ ] Corregir padding superior de botones de añadir/importar dentro de los dropdowns del editor.
  - [ ] Unificar diseño y componentes de acción para que experiencias, habilidades y educación compartan el estándar de proyectos.
- [ ] **Toggle para excluir Resumen Profesional:**
  - [ ] Incorporar switch o control en el editor para ocultar/excluir la sección de resumen profesional (quitando `summary` de `section_order` o vaciando el texto sin perder datos).

---

### P2 — Calidad de Perfil & Consistencia de Renderizado

- [ ] **Detección y eliminación completa de viñetas redundantes:**
  - [ ] Refinar prompt en `back/engine/profile_assistant.py` para que ante viñetas idénticas o fuertemente redundantes recomiende su eliminación completa vía `redundant_facts` en vez de reescrituras vacías en `improved_facts`.
- [ ] **Consistencia de % de llenado entre plantillas Typst:**
  - [ ] Calibrar márgenes base y espaciados verticales entre las 6 plantillas (`basic`, `classic`, `engineering`, `kire`, `modern`, `yuan`) para reducir saltos drásticos en el porcentaje de llenado (fill ratio) al alternar entre estilos.

---

### P3 — Plantillas y Validación Externa

- [ ] **Nuevas plantillas Typst:**
  - [ ] Diseños editoriales modernos y versátiles (roles de producto, diseño o consultoría) más allá del estilo estrictamente ingenieril.
- [ ] **Soporte opcional para foto de perfil / avatar (`nth fotos`):**
  - [ ] Soporte opcional de imagen en cabecera para plantillas compatibles.
- [ ] **Validación en ATS:**
  - [ ] Pruebas de compatibilidad y parsing con plataformas ATS de reclutamiento (Lever, Greenhouse, Workday).

---

## Historial de Fases Concluidas

| Fase / Slice | Descripción | Estado |
|---|---|---|
| **Slice 1: Tracer Bullet** | Render en vivo a SVG vía Typst, telemetría de llenado A4 y shell Next.js. | Concluido |
| **Slice 2: Edición Reactiva** | Tarjetas interactivas con toggles de viñetas y debounce sin latencia IA. | Concluido |
| **Slice 3: Flujo de Adaptación** | Pipeline de tailoring con extracción de oferta, matching ATS y modal de progreso. | Concluido |
| **Slice 4: Exportación & Inmutabilidad** | Descarga binaria de PDF vía Typst y snapshots inmutables con hash SHA-256. | Concluido |
| **Slice 5: Shell Multi-página** | Topbar con navegación CVs / Perfil / Editor, galería agrupada e historial de versiones. | Concluido |
| **Slice 6: Perfil CRUD Manual** | Estructuración del perfil base con arquetipos de títulos, hechos y catálogo de skills. | Concluido |
| **Slice 7: Ingesta y Onboarding** | Upload y extracción de CV previo (PDF/TXT) vía LLM/pypdf con CLI y vista dropzone. | Concluido |
| **Slice 8: Asistencias IA en Perfil** | Destilación de viñetas, sugerencias de títulos y normalización de skills con aprobación manual. | Concluido |
| **Slice 9: Persistencia Cloud** | Capa Repository (local + Supabase Postgres/Storage), Auth JWT y soft delete de snapshots. | Concluido |
| **Slice 10: Pulido UX & Anti-Alucinación** | Validador estricto anti-alucinación en summary, importación de proyectos en editor y loading dashboard. | Concluido |
| **Slice 11: Perfil Monolingüe & Espejo Bilingüe** | Perfil base SSOT con espejo derivado incremental (`mirror.py`, `translator.py`), glosario determinista e integración en editor/tailoring. | Concluido |
| **Fase F1 / F2: Fitting & Motor Físico** | Medición física en Typst, poda determinista Bottom-Up y fitting en 1 página A4. | Concluido |
| **Fase F4: Fitting 85-100%, ATS en vivo y Usabilidad** | Rango garantizado 85-100%, selector binario de idioma, ATS live, reordenamiento de secciones y títulos de artefacto en proyectos. | Concluido |

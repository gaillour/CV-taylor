# TODO.md — Roadmap Operativo (`cv-tailor`)

## Fase Activa: F4 — Pulido de Fitting, ATS Reactivo y Usabilidad

### P0 — Crítico / Bloqueante

- [x] **Motor de Fitting — Rango 85%-100% de llenado garantizado:**
  - [x] Ajustar algoritmo de convergencia en `back/engine/fit.py` y `renderer.py`: evitar que el CV quede underfilled (<85%) tras poda de viñetas.
  - [x] Implementar reincorporación bottom-up de hechos o relajación controlada de espaciados si el fill ratio queda por debajo del umbral mínimo sin romper el límite de 1 página A4.
- [ ] **Asistente de Perfil — Títulos contextuales en Proyectos:**
  - [ ] En `back/engine/profile_assistant.py`, filtrar sugerencias según `entry.kind == 'project'`.
  - [ ] Prohibir cargos de empleo (ej. sugerir "Software Developer" a un simulador de físicas) y orientar a nombres descriptivos del artefacto/producto.

---

### P1 — Core UX & Adaptación

- [ ] **ATS Reactivo en Editor:**
  - [ ] Crear endpoint liviano `POST /api/ats/evaluate` en backend para evaluar puntaje, keywords presentes y ausentes sobre `CurriculumData` sin compilar PDF/Typst.
  - [ ] Conectar `useCvStore.ts` y gauge visual en `CvEditor.tsx` con debounce de 500ms al alternar viñetas o editar textos.
- [ ] **Tailoring — Selección binaria obligatoria de idioma:**
  - [ ] Eliminar detección "auto" en `front/src/components/tailor/TailorModal.tsx`.
  - [ ] Forzar selección binaria manual explícita (`Español` / `English`) por parte del usuario antes de disparar el pipeline.
- [ ] **IA — Poda de bloques completos irrelevantes:**
  - [ ] Permitir que el curador IA / heurística descarte un bloque/entrada completo (`experience` o `project`) si su relevancia frente a la oferta es nula, evitando dejar títulos aislados sin viñetas.

---

### P2 — Usabilidad en Editor y Perfil

- [ ] **Editor — Reordenamiento de Secciones e Items:**
  - [ ] Permitir alterar el orden de secciones (ej. ubicar Proyectos antes de Experiencia) mediante `section_order` en `CurriculumData`.
  - [ ] Controles para subir/bajar la posición relativa de experiencias y proyectos dentro de sus secciones.
- [ ] **Perfil — Visibilidad contextual de "Mejorar con IA":**
  - [ ] Ocultar o condicionar el botón/banner fijo de optimización para que aparezca únicamente tras importar un CV o cuando haya viñetas/skills pendientes de normalizar.

---

### P3 — Plantillas y Validación Externa

- [ ] **Nuevas plantillas Typst:**
  - [ ] Diseños editoriales modernos y versátiles (roles de producto, diseño o consultoría) más allá del estilo estrictamente ingenieril.
  - [ ] Soporte opcional para foto de perfil / avatar en plantillas compatibles.
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

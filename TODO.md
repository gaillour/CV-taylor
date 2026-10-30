# TODO.md — Roadmap Operativo (`cv-tailor`)

## Fase Activa: F4 — Pulido de Perfil, Templates Typst y Validación ATS

### Tareas en Curso
- [x] **Rediseño y alivio visual de `/perfil`:**
  - [x] Modularizar el monolito de `perfil/page.tsx` en subcomponentes por tab (`GeneralTab`, `SkillsTab`, `EntriesTab`).
  - [x] Aligerar tarjetas de experiencia, proyectos y educación con acordeones limpios y vista resumida por defecto.
  - [x] Eliminar jerga técnica interna ("hechos atómicos", "perfil maestro") y explicaciones redundantes de la interfaz.
- [ ] **Nuevas plantillas Typst:**
  - [ ] Diseños editoriales modernos y versátiles (roles de producto, diseño o consultoría) más allá del estilo estrictamente ingenieril.
  - [ ] Soporte opcional para foto de perfil / avatar en plantillas compatibles.
- [ ] **Validación en ATS:**
  - [ ] Pruebas de compatibilidad y parsing con plataformas ATS de reclutamiento (Lever, Greenhouse, Workday).

---

## Deuda Técnica & Backlog UI
- [x] **Editor — Acordeones colapsados por defecto:** Inicializar secciones de `CvEditor.tsx` cerradas al abrir un borrador.
- [x] **Editor — Limpieza de jerarquía:** Eliminar contenedor "Editor de Contenido (Slice 4)" en `editor/[id]/page.tsx` para quitar anidamiento cebolla.
- [x] **Editor — Título editable de CV:** Permitir renombrar el título del CV / target role directamente en la barra superior.
- [x] **Editor — Importación de Proyectos en Bloque:** Modal para seleccionar e insertar proyectos del perfil directamente en el CV.
- [ ] **Tailoring — Selección explícita de idioma:** Quitar la detección "auto" de idioma al adaptar CV desde oferta de empleo; forzar selección binaria manual (ES / EN) por parte del usuario.
- [ ] **Soporte Multilingüe:** Flujo para traducir/adaptar on-the-fly con LLM proyectos o contenido en caso de CVs bilingües.
- [ ] **IA — Eliminación de bloques completos:** Permitir que la IA recomiende eliminar bloques/entradas completos (actualmente detecta viñetas duplicadas/redundantes y sugiere borrarlas individualmente, pero no remueve el bloque completo).

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
| **Fase F1 / F2: Fitting & Motor Físico** | Medición física en Typst, poda determinista Bottom-Up y fitting en 1 página A4. | Concluido |

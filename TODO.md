# TODO.md — Roadmap Operativo (`cv-tailor`)

- Aveces se tilda el visor de pdf en el editor ni bien se entra pero al minimo cambio se actualiza y anda bien. Pej cambio la densidad y al instante se ve bien. 
- Estoy viendo en este momento la recomendación de q el template se debería usar con foto y mi foto ya esta puesta. Cambiando de templates sigue apareciendo. Guardando se va igual.
- El template Vercanard tiene considerablemente menos % de relleno q el resto, considerar sacarlo. No permite poner cosas en el lateral. Solo podría ir skills contacto y educación creo. Pero nose. Claro las dos columnas son todo un temita.. pero creo q con decidir q hacer podemos agregar mas templates.
- Chequear licencias de typst templates!!!!
- Esta medio raro algunas cosas de los templates, necesita medio un polish.
- Landing:
    - El cv del principio esta cuadrado, o rectangularlo o sacarlo.
    - El logo en la esup izq esta raro
    - Typst Engine • Deterministic 1-Page Layout Lo sacaría eso
    - El cv q gira sacar los cosos del costado. Quedo muy pegado abajo al stopscroll, que quede mas arriba.
    - Podriamos poner una tijera cortando el cv desbordado de cosas q pase a limpio
    - El nombre q no sea alex morgan

## Fase Activa: F7 — Rediseño Visual & Modernización UI

### Paso 1: Restyling del flujo operativo (Dashboard, Perfil, Editor)

- [ ] **Tokens y paleta unificada de color:**
  - [ ] Adopción de tokens y paleta unificada de color (que siga el estilo de la landing).
- [ ] **Componentes atómicos interactivos:**
  - [ ] Refactor de componentes atómicos interactivos (cards, modales, botones, micro-interacciones inspiradas en la landing).
- [ ] **Reacomodación del home sin cvs:**
  - [ ] Definir si va a haber un solo boton para crear cv (solo con prompt) o dos. 
---

### Paso 2: Landing Page alineada a la nueva identidad

- [x] **Base de la landing page con sistema de tokens versátil:**
  - [x] Portada del producto integrada en Next.js (`front/src/app/page.tsx` y módulos en `src/components/landing/`).
  - [x] Bloque central de tokens en `globals.css` que permite cambiar fuentes y paleta completa en pocas líneas sin tocar JSX.
- [ ] **The Mirror interactivo / comparativa de idiomas:**
  - [ ] Replantear la sección "The Mirror" para comparar versiones de idiomas (CV en español vs. inglés del espejo bilingüe de Fase 11) o agregar animación interactiva de scroll tipo espejo / slider split-screen de antes/después.

---

## Próximas Fases Planificadas

### Fase F8 — Validación Externa ATS

- [ ] **Pruebas y compatibilidad ATS:**
  - [ ] Testing de PDFs generados contra plataformas reales (Lever, Greenhouse, Workday) para garantizar 100% de parseabilidad.

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
| **Fase F5: Consistencia de Editor, Ingesta y Plantillas** | Importación integral en editor, anti-redundancia en asistente IA, calibración de las 6 plantillas Typst, extracción exhaustiva y desacople de edición en perfil. | Concluido |
| **Fase F6: Plantillas Visuales & Avatar** | Soporte de foto/avatar (local + Supabase), 5 nuevas plantillas Typst (`modern-cv`, `vercanard`, `impressive-impression`, `modern-resume`, `metronic`), selector categorizado y aviso amigable en editor. | Concluido |

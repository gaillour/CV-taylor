# TODO.md — Roadmap Operativo (`cv-tailor`)




## P0 — Infraestructura, Despliegue & Landing Page

- [x] **Dockerfile Backend (FastAPI):**
  - [x] Crear Dockerfile multi-stage con Python 3.12 y `uv`.
  - [x] Validar compatibilidad de rueda `typst` y empaquetado de fuentes/templates.
  - [x] Configurar bind de host `0.0.0.0` y puerto variable `$PORT` (Railway / Render / Fly.io / VPS).
- [x] **CORS dinámico en Backend:**
  - [x] Parametrizar `allow_origins` en `back/api/main.py` mediante variable de entorno `CORS_ORIGINS` / `FRONTEND_URL`.
- [x] **Setup de Instancia Supabase Cloud:**
  - [x] Ejecutar migraciones SQL (`supabase/migrations/001_slice_9b_supabase.sql`, `002_profile_mirror.sql`, `003_avatars_storage.sql`) en el SQL Editor de Supabase.
  - [x] Crear y verificar buckets de Supabase Storage: `cv-snapshots` y `avatars`.
  - [x] Configurar credenciales en Backend y Frontend.
- [x] **Deploy Frontend en Vercel:**
  - [x] Conectar repositorio con `Root Directory: front`.
  - [x] Configurar variables de entorno de producción (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- [x] **Landing Page (Polish Scroll-Driven & Simplificación):**
  - [x] Corregir alineación del CV en el bloque EN al scrollear en The Mirror.
  - [x] Reducir tamaño del sello/botón Bespoke en Hero.
  - [x] Sacar regla/cinta de "Corte milimétrico A4" en Hero.
  - [x] Sacar el EN verde por dorado en The Mirror.
  - [x] Los 3 pasos: simplificar al extremo y animar 100% con scroll continuo (01 -> 02 -> 03) sin sobrecarga ni frenos.
  - [x] Versionado: rediseñar con animación por scroll, sin tecnicismos, con V1/V2/V3/V4 bien grandes (Base -> Junior -> Semi Senior -> Senior) y evolución visual evidente.

---

## P1 — Bugs Críticos de UX en Editor

- [ ] **Fix visor de PDF en carga inicial (`/editor/[id]`):**
  - [ ] Resolver delay/congelamiento del visor al entrar por primera vez (actualmente requiere forzar cambio de densidad u otro trigger de estado para despabilar el render).
- [ ] **Fix detección de foto/avatar en recomendación de template:**
  - [ ] Corregir la condición en el editor que sigue sugiriendo "se debería usar con foto" aunque el perfil ya tenga un avatar cargado (evitando que requiera un guardado manual para ocultarse).
- [ ] **Login:**
  - [ ] Definir si se va a poder usar sin loguearse y como. Actualizar login, que siga el estilo de la landing.


---

## P2 — Calibración y Legal de Plantillas Typst

- [ ] **Calibración / Decisión template `vercanard`:**
  - [ ] Evaluar el comportamiento de dos columnas (actualmente tiene significativamente menos % de llenado que el resto y restringe el lateral a skills/contacto/educación).
  - [ ] Definir si se calibra la distribución de bloques o se remueve del catálogo activo.
- [ ] **Polish visual general en plantillas Typst:**
  - [ ] Corregir inconsistencias de espaciado, pesos tipográficos y márgenes detectados en plantillas visuales.
- [ ] **Auditoría de licencias de plantillas:**
  - [ ] Chequear y documentar licencias (MIT, Apache 2.0, etc.) de las plantillas incorporadas en `back/engine/templates/`.

---

## P3 — Fase F7: Rediseño Visual & Modernización UI (Dashboard, Perfil, Editor)

- [ ] **Tokens y paleta unificada de color:**
  - [ ] Extender tokens y paleta de la landing (ámbar `#d4973b`, verde sastre `#1b4332`, bg dark sastre) a `/cvs`, `/perfil` y `/editor`.
- [ ] **Componentes atómicos interactivos:**
  - [ ] Refactor de cards, modales, botones y micro-interacciones de la app interna alineadas con la estética de la landing.
- [ ] **Reacomodación del Dashboard (`/cvs`):**
  - [ ] Definir UX de creación de CVs en estado vacío (botón unificado con prompt vs doble botón base/adaptado).

---

## P4 — Fase F8: Validación Externa ATS

- [ ] **Pruebas y compatibilidad ATS:**
  - [ ] Testing de PDFs generados contra plataformas reales (Lever, Greenhouse, Workday) para garantizar 100% de parseabilidad.

---

## Historial de Fases Concluidas

| Fase / Slice | Descripción | Estado |
|---|---|---|
| **Landing Page & The Mirror** | Portada completa, tokens versátiles, ScrollReveal y The Mirror con traducción continua y traslado 3D a dock EN. | Concluido |
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

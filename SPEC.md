# SPEC.md — Especificación de Sistema: CV Tailor

## 1. Visión y Propuesta de Valor
Plataforma de adaptación quirúrgica de currículums técnicos ante ofertas laborales concretas. Resuelve el desborde y la deformación visual de los editores tradicionales garantizando **exactamente 1 página A4 ATS-Strict** mediante un motor tipográfico programable (Typst), eliminando el 100% de alucinaciones mediante validación determinista contra el perfil maestro del candidato.

---

## 2. Stack Tecnológico
- **Core / Engine:** Python 3.12+ gestionado con `uv`.
  - Modelado y validación de datos: `pydantic v2`.
  - Formato de perfiles: `JSON` (serialización y validación nativa en Pydantic).
  - Ingesta de CVs: `pypdf` + LLM structured ingestion.
  - Compilación tipográfica y telemetría geométrica: `typst` (bindings nativos de Python) con fuentes vendoreadas (`Liberation Sans`, `Liberation Serif`).
- **Backend API (F3):** FastAPI + Supabase (PostgreSQL, Auth, Storage).
- **Frontend (F3):** Next.js (TypeScript, Tailwind CSS, `pnpm`).
- **Integración LLM:** OpenAI-compatible (Gemini, OpenRouter, Ollama) con fallback determinista sin IA.

---

## 3. Arquitectura Base y Flujo de Datos

```
[CV Previo (PDF/Texto)] ──► [Importer (IA + Pydantic)] ──► [Master Profile (JSON/DB)]
                                                                    │
                                         [JobSpec (Texto/URL)] ────┤
                                                                    ▼
                                                             [TailorEngine] ──(1 llamada LLM: selección y verbos, 16-24 pal)
            │
            ▼
[AntiHallucinationValidator] ──(Verificación estricta: fact_ids, números, whitelist tech)
            │
            ▼
       [FitEngine] ──(Typst measure_fit local ~15ms, densidad confortable d <= 0.35)
            │
            ├─► Si desborda: Poda determinista Bottom-Up (última entrada/viñeta menor peso)
            ├─► Si queda corto: Aumentación determinista con facts del perfil maestro
            │
            ▼
    [Harmonization Pass] ──(1 llamada LLM: pulido de tono y consistencia global del esqueleto)
            │
            ▼
    [Typst Compiler] ──(Generación PDF binario + SVG preview + telemetría de fill_pct)
            │
            ▼
  [Snapshot Inmutable] ──(JSON desnormalizado + PDF + SHA256 + métricas de ajuste)
```

---

## 4. Contratos e Invariantes del Sistema
- **SSOT de Datos:** Todos los contratos residen en `back/engine/models.py`. Prohibido duplicar esquemas en Markdown.
- **Perfil Maestro Acumulativo:** El Perfil Maestro es un banco histórico estrictamente aditivo; al importar CVs previos (`merge_profiles`) nunca se eliminan ni pisan experiencias, proyectos, variantes de puesto (`EntryTitle`), hechos (`Fact`) ni habilidades existentes.
- **Anti-Alucinación Estricta:** Toda viñeta renderizada debe trazar obligatoriamente a uno o más `fact_ids` del perfil maestro. Métricas numéricas y nombres de herramientas deben existir exactamente en el perfil o en `skills.aliases`.
- **Estructura Fija ATS-Strict:** Encabezados semánticos nativos (`<H1>`, `<H2>`) sin `#grid` para preservar orden lineal en parsers. Sección `summary` obligatoria e inmutable.
- **Límite de 1 Página Confortable:** Densidad acotada a $d \le 0.35$. Se prohíbe forzar $d = 1.0$ para comprimir texto; el espacio vertical excedente se resuelve podando contenido secundario.
- **Snapshots Inmutables:** Los CVs generados son de solo lectura. Queda prohibido modificar (`UPDATE`) o eliminar (`DELETE`) un snapshot persistido.

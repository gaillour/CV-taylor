# CV Tailor (`cv-tailor`)


> Cargá toda tu carrera una sola vez. Generá el CV perfecto para cada oferta en 15 segundos.

Motor determinista de adaptación de currículums técnicos a ofertas de empleo concretas. Garantiza **exactamente 1 página A4 ATS-Strict** mediante maquetado tipográfico en [Typst](https://typst.app/) y elimina alucinaciones validando cada viñeta contra hechos reales del perfil maestro.

---

## Características Principales


* **1 Página A4 Estricta:** Motor de ajuste geométrico y densidad vertical en Typst. Sin desbordes a una segunda página ni espaciados forzados antiestéticos.
* **Validación Anti-Alucinación:** Verificación estricta de viñetas contra `fact_ids`, métricas numéricas y herramientas existentes en el perfil maestro.
* **Perfil Maestro Acumulativo:** Almacén histórico de experiencias, proyectos, variantes de títulos y hechos en JSON que nunca se pisan al importar nuevos CVs.
* **Optimización ATS en Loop:** Parser y scorer heurístico que evalúa estructura, keywords y consistencia frente a la descripción del puesto.
* **Soporte Bilingüe:** Perfiles monolingües o espejo (Español / Inglés) con armonización de tono.
* **CLI Rápido y Fullstack:** CLI en Python (`cvt`) para flujos terminal y aplicación web interactiva (FastAPI + Next.js).

---

## Arquitectura y Stack


* **Engine & CLI (`back/` y `back/engine/`):** Python 3.12+ gestionado con `uv`.
  * `typst`: Compilación tipográfica nativa de PDFs y telemetría de ocupación.
  * `pydantic v2`: Modelos y contratos estrictos ([models.py](file:///home/juan/Documents/proj/cvs/cv-tailor/back/engine/models.py)).
  * `pypdf`: Extracción de texto desde CVs previos.
* **Backend API (`back/api/`):** FastAPI + Supabase (Auth, Storage, PostgreSQL).
* **Frontend (`front/`):** Next.js 15 (App Router), TypeScript, Tailwind CSS, gestionado con `pnpm`.

---

## Estructura del Repositorio


```text
.
├── back/
│   ├── api/            # API REST con FastAPI
│   ├── cli.py          # CLI 'cvt'
│   └── engine/         # Core: tipografía Typst, fit loop, ATS checker, validación
├── fixtures/           # Perfiles y ofertas de prueba
├── front/              # Frontend en Next.js y Tailwind CSS
├── supabase/           # Migraciones y esquema de base de datos
├── pyproject.toml      # Configuración de workspace y dependencias uv
├── SPEC.md             # Especificación técnica del sistema
└── BUSINESS.md         # Estrategia de producto y monetización
```

---

## Instalación y Uso Local


### Prerrequisitos


* [uv](https://docs.astral.sh/uv/) (gestor de paquetes Python)
* [pnpm](https://pnpm.io/) y Node.js >= 20 (para la interfaz web)
* [Typst](https://typst.app/) (opcional si se usa el binding empaquetado)


### 1. Motor y CLI (`cvt`)


Instalar dependencias del workspace:

```bash
uv sync
```

Comandos principales del CLI:

```bash
# Importar CV previo (PDF o TXT) y estructurar perfil maestro
uv run cvt import mi_cv.pdf -o out/profile.json

# Adaptar perfil a una oferta laboral concreta
uv run cvt tailor oferta.txt -p out/profile.json -l es -t classic -o out/cv_adaptado.pdf

# Evaluar score ATS contra keywords específicas
uv run cvt check-ats out/cv_adaptado.pdf -k "python,fastapi,docker"

# Renderizar perfil maestro directo sin adaptación
uv run cvt render -p out/profile.json -l es -t modern -o out/cv.pdf
```


### 2. Backend API


Iniciar el servidor FastAPI de desarrollo:

```bash
uv run uvicorn back.api.main:app --reload --port 8000
```


### 3. Frontend Web


```bash
cd front
pnpm install
pnpm dev
```

La aplicación quedará accesible en `http://localhost:3000`.

---

## Tests y Calidad de Código


```bash
# Ejecutar suite de pruebas
uv run pytest

# Verificación de linter y formato en backend
uv run ruff check . && uv run ruff format --check .

# Verificación en frontend
pnpm --dir front lint && pnpm --dir front build
```

---

## Licencia


Este proyecto está bajo la licencia **Functional Source License, Version 1.1, MIT Future License (FSL-1.1-MIT)**.

* Libre para uso personal, educativo, investigación, auditoría y auto-alojamiento (self-hosting).
* Prohibida la explotación comercial directa de servicios o productos competitivos derivados durante los primeros 2 años.
* Cumplido el segundo aniversario de publicación, pasa irrevocablemente a licencia MIT.

Para más detalles, consultar [LICENSE](file:///home/juan/Documents/proj/cvs/cv-tailor/LICENSE).

# Plan de Arquitectura: Fitting Físico Determinista + Pasada de Consistencia y Pulido por IA

## Goal Description
Garantizar que el CV cumpla la estricta regla de **1 página A4 sin apelmazamiento ($d \le 0.35$)**, combinando el cálculo geométrico exacto de Python/Typst con una **pasada final de consistencia y armonización editorial por IA** antes de entregarlo al usuario.

```
+---------------------------------------------------------------------------------------------------------+
|                                    PIPELINE HÍBRIDO (BACKEND - PRE-ENTREGA)                             |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   1. Tailoring Inicial (IA)                                                                             |
|      - Límite aproximado/orientativo de longitud por viñeta (~16-24 palabras).                          |
|                                                                                                         |
|   2. Medición Física y Selección de Esqueleto (Python + Typst) [~15ms]                                  |
|      - Mide a densidad visual confortable ($d \le 0.35$).                                               |
|      - Si desborda: Poda determinista Bottom-Up (del último proyecto/exp hacia arriba)                  |
|        hasta que el contenido quepa geométricamente en el presupuesto de 1 página.                     |
|      - Si queda corto (< 85%): Suma hechos no seleccionados del perfil maestro.                         |
|                                                                                                         |
|   3. Pasada de Consistencia y Pulido Editorial (IA)                                                     |
|      - Recibe exactamente el set de viñetas que ya sabemos que entran en la página.                     |
|      - Armoniza el tono, estilo y fluidez global del documento para que no se sienta "mutilado"        |
|        ni parchado por la poda.                                                                         |
|                                                                                                         |
|   4. Validación y Renderizado Final (Python + Typst)                                                    |
|      - Chequeo anti-alucinación estricto de números y facts.                                            |
|      - Compilación final a PDF y entrega al usuario con telemetría en vivo.                             |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

---

## User Review Required

> [!IMPORTANT]
> **Por qué conviene "Python ajusta primero y la IA hace la consistencia final":**
> Si mandamos a la IA a "achicar a ciegas" sin Python:
> 1. El LLM no sabe cuántos píxeles ocupa cada letra de *Liberation Sans*; puede dejar una línea huérfana de una sola palabra que desborda igual.
> 2. Requiere loops de reintento impredecibles (2 a 4 llamadas a la API, 20 segundos de espera).
> 
> En cambio, **Python define qué viñetas entran físicamente en 15 ms**, y la **IA hace una única pasada de pulido** sobre ese conjunto garantizado. Máximo 2 llamadas a la IA en todo el proceso, cero riesgo de desborde y consistencia total.

---

## Proposed Changes

### Core Engine (`back/engine`)

#### [MODIFY] [models.py](file:///home/juan/Documents/proj/cvs/cv-tailor/back/engine/models.py)
- Incorporar `MAX_COMFORTABLE_DENSITY: float = 0.35`.

#### [MODIFY] [fit.py](file:///home/juan/Documents/proj/cvs/cv-tailor/back/engine/fit.py)
- Refactorizar `fit_render_model`:
  - Limitar la búsqueda de densidad al rango confortable $[0.0, 0.35]$.
  - Implementar poda gradual de abajo hacia arriba respetando `min_bullets` y `pinned`.

#### [MODIFY] [tailor.py](file:///home/juan/Documents/proj/cvs/cv-tailor/back/engine/tailor.py)
- Agregar el método `harmonize_resume(model: RenderModel, job_spec: JobSpec) -> RenderModel`:
  - Prompt especializado en armonización de estilo, tono activo y consistencia del CV podado, manteniendo estrictamente los `fact_ids` y métricas numéricas.

#### [MODIFY] [feedback_loop.py](file:///home/juan/Documents/proj/cvs/cv-tailor/back/engine/feedback_loop.py)
- Integrar la secuencia:
  1. `tailor(...)` (IA inicial)
  2. `fit_render_model(...)` (Python + Typst determina el esqueleto físico)
  3. Si hubo poda o ajuste significativo: `harmonize_resume(...)` (IA pule consistencia)
  4. `AntiHallucinationValidator` + Render final Typst.

---

## Verification Plan

### Automated Tests
1. **Poda y consistencia con doble pasada:**
   ```bash
   uv run pytest tests/test_f1_fit_engine.py
   uv run pytest tests/test_f2_pipeline.py
   ```
   Comprobar que perfiles con desborde converjan a $d \le 0.35$ de 1 página con texto armonizado.
2. **Anti-alucinación en la pasada de armonización:**
   Verificar que la pasada de pulido de la IA no altere números ni introduzca tecnologías no autorizadas.

### Manual Verification
- Ejecutar el comando CLI:
  ```bash
  uv run cvt tailor fixtures/oferta_ejemplo.txt --lang es
  ```
  Comprobar que el documento final tenga 1 sola página, lectura fluida y tipografía aireada.

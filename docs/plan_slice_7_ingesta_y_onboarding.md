# Plan Técnico — Correcciones Slice 7: Resiliencia en Ingesta, Feedback de Errores y Navbar

## 1. Contexto y Problemas Detectados
1. **Error de validación Pydantic al importar CV:**
   `Error al estructurar el perfil: 1 validation error for Entry kind Input should be 'experience', 'project', 'education', 'certification' or 'other' [type=literal_error, input_value='projects', input_type=str]`
   Causa: en `back/engine/importer.py` se hardcodeaba `"projects"` (en plural) mientras que `EntryKind` en `back/engine/models.py` exige `"project"` (singular). Además, si un header o sección viene con una palabra no identificada, el parser debe ser tolerante y dejar en blanco lo no reconocido en vez de romper la importación con 500.
2. **Error mudo en el Dropzone / Modal:**
   Al fallar la importación, el modal se quedaba congelado sin mostrar el error. Había que cerrar el modal para ver el error en el header sticky.
   Causa: `CvDropzone.tsx` no consumía `error` de `useProfileStore` y solo mostraba validaciones locales.
3. **Barra de navegación duplicada en `/perfil`:**
   `front/src/app/layout.tsx` ya incluye `<TopNav />` globalmente. `front/src/app/perfil/page.tsx` volvía a renderizar `<TopNav />` en 4 lugares.

---

## 2. Solución Técnica

### Backend (`back/engine/importer.py`)
- Corregir `SYSTEM_PROMPT` con `"kind": "experience" | "project" | "education"`.
- Implementar `_normalize_entry_kind(raw_kind: str | None) -> EntryKind`:
  - Mapear `"proj*"` a `"project"`, `"exp*"` a `"experience"`, `"edu*"` a `"education"`, `"cert*"` a `"certification"`.
  - Fallback por defecto ante cualquier texto o header desconocido: `"experience"` (nunca arroja excepción).
- Hacer `_build_profile_from_dict` y `parse_profile_from_text` tolerantes a fallos (*graceful degradation*): si el LLM o un bloque viene con formato inesperado, se capturan las excepciones y se recurre al parser heurístico offline, devolviendo siempre un `Profile` válido con lo que haya podido extraer y dejando en blanco lo no reconocido.

### Frontend
- **`front/src/components/profile/CvDropzone.tsx`:**
  - Consumir `const { importProfile, importing, error } = useProfileStore();`.
  - Mostrar el banner de error (`localError || error`) inmediatamente adentro del modal/dropzone con estilo rojo y permitir reintentar sin congelar la UI.
- **`front/src/app/perfil/page.tsx`:**
  - Eliminar el import de `TopNav` y sus 4 llamadas dentro del componente.

---

## 3. Comandos de Verificación
```bash
.venv/bin/pytest tests/test_f3_importer.py tests/test_api_profile.py
.venv/bin/pytest tests/ && .venv/bin/ruff check .
npx pnpm --dir front build && npx pnpm --dir front lint
```

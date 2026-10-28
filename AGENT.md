# AGENT.md — Directivas Globales y Límites Operativos

## Principios Operativos y SSOT
- Inspeccionar contratos y schemas exclusivamente en `back/engine/models.py`. Prohibido duplicar tipos en Markdown.
- Mantener documentación sincronizada: actualizar `TODO.md` al completar o reorganizar tareas, y consultar `SPEC.md` para especificaciones del sistema.
- Resolver puntualmente lo solicitado con diffs limpios: prohibido tocar imports ajenos, reformatear código no relacionado o introducir abstracciones o dependencias innecesarias.
- Registrar vía `graph-memory` exclusivamente decisiones estructurales de peso (stack, base de datos, arquitectura base). Prohibido registrar micro-decisiones.

## Restricciones y Seguridad
- Inmutabilidad de snapshots: prohibido ejecutar operaciones `UPDATE` o `DELETE` sobre registros de snapshots exportados.
- Prohibido leer o modificar variables de entorno (`.env`) o credenciales.
- Git defensivo: prohibido ejecutar `git push --force`, `git reset --hard` o realizar commits directos a ramas protegidas sin orden expresa.

## Entorno y Comandos de Verificación
- Gestionar Python exclusivamente mediante `uv`:
  - Ejecutar tests: `uv run pytest`
  - Chequeo de formato y linter: `uv run ruff check . && uv run ruff format --check .`
  - Ejecutar CLI: `uv run cvt tailor <oferta.txt> --lang <es|en>`
- Gestionar frontend exclusivamente mediante `pnpm` en `front/`:
  - Desarrollo: `pnpm --dir front dev`
  - Compilación y linter: `pnpm --dir front build && pnpm --dir front lint`

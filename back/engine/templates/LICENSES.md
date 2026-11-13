# Auditoría de Licencias — Plantillas Typst y Recursos Tipográficos (`cv-tailor`)

## 1. Arquitectura y Naturaleza de las Plantillas

Todas las plantillas `.typ` alojadas en `back/engine/templates/` son **implementaciones propias desde cero (*clean-room*)** desarrolladas específicamente para el motor determinista de `cv-tailor` y distribuidas bajo la licencia raíz del repositorio (**FSL-1.1-MIT**, Functional Source License 1.1 con conversión a MIT; Copyright 2026 Juan Gaillour, ver [`LICENSE`](../../../LICENSE)).

- **Cero dependencias externas (`@preview`)**: Ninguna plantilla importa paquetes de Typst Universe (`#import "@preview/..."`) ni reutiliza código fuente de terceros.
- **Contrato determinista propio**: Todas consumen directamente el payload serializado en `sys.inputs.data` (`RenderModel`), implementan el bloque de telemetría física `<pages><end>` para el algoritmo de *fitting* A4 (85–100%), desactivan el guionado automático (`hyphenate: false`) y normalizan enlaces/fechas según las reglas del motor.
- **Diseños de referencia (Typst Universe)**: Ocho de las once plantillas toman inspiración estética o de disposición visual (*layout*) de paquetes públicos de la comunidad en Typst Universe. A continuación se documenta el autor y la licencia *upstream* de cada diseño de referencia, así como el estado de cumplimiento legal.

---

## 2. Catálogo de Plantillas (`back/engine/templates/*.typ`)

| Archivo Plantilla | Categoría | Origen / Paquete de Referencia (Typst Universe) | Autor de Referencia (*Upstream*) | Licencia *Upstream* (Referencia) | Licencia del Código en `cv-tailor` | Estado de Cumplimiento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `classic.typ` | ATS-Strict (Sin foto) | Diseño original `cv-tailor` (clásico de 1 columna con jerarquía lineal) | Juan Gaillour (`cv-tailor`) | N/A (Diseño propio) | `FSL-1.1-MIT` | 100% autocontenida, sin `@preview` |
| `modern.typ` | ATS-Strict (Sin foto) | Diseño original `cv-tailor` (sans-serif contemporáneo de 1 columna) | Juan Gaillour (`cv-tailor`) | N/A (Diseño propio) | `FSL-1.1-MIT` | 100% autocontenida, sin `@preview` |
| `engineering.typ` | ATS-Strict (Sin foto) | Diseño original `cv-tailor` (técnico serif compacto de alta densidad) | Juan Gaillour (`cv-tailor`) | N/A (Diseño propio) | `FSL-1.1-MIT` | 100% autocontenida, sin `@preview` |
| `basic.typ` | ATS-Strict (Sin foto) | Inspirada visualmente en `@preview/basic-resume` | Stephen Xu (`stuxf`) | `Unlicense` (Dominio Público) | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `kire.typ` | ATS-Strict (Sin foto) | Inspirada visualmente en `@preview/kiresume` (*kirei*) | Angus Pointer (`angus.buzz`) | `Unlicense` (Dominio Público) | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `yuan.typ` | ATS-Strict (Sin foto) | Inspirada visualmente en `@preview/yuan-resume` | Mariano Mollo | `MIT` | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `modern-cv.typ` | Visual / Con Foto | Inspirada visualmente en `@preview/modern-cv` (estilo *Awesome-CV*) | Paul Tsouchlos (`ptsouchlos`) | `MIT` | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `vercanard.typ` | Visual / Con Foto | Inspirada visualmente en `@preview/vercanard` (layout sidebar de 2 columnas) | Paquete comunitario Typst Universe (`vercanard`) | `GPL-3.0` (solo en el paquete upstream no vinculado) | `FSL-1.1-MIT` | 100% *clean-room* propio, sin código ni imports de `@preview/vercanard` |
| `impressive-impression.typ` | Visual / Con Foto | Inspirada visualmente en `@preview/impressive-impression` | Paquete comunitario Typst Universe (`impressive-impression`) | `MIT` | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `modern-resume.typ` | Visual / Con Foto | Inspirada visualmente en `@preview/modern-resume` | Peter Egger | `Unlicense` (Dominio Público) | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |
| `metronic.typ` | Visual / Con Foto | Inspirada visualmente en `@preview/metronic` (`metronic-cv`) | Paquete comunitario Typst Universe (`metronic`) | `MIT` | `FSL-1.1-MIT` | 100% reimplementada, sin `@preview` |

> **Nota sobre `vercanard.typ`**: Aunque el paquete de referencia `@preview/vercanard` en Typst Universe declara licencia `GPL-3.0`, el archivo `back/engine/templates/vercanard.typ` de este repositorio no contiene ni deriva código fuente alguno de dicho paquete: fue escrito íntegramente desde cero sobre la cuadrícula y primitivas nativas de Typst (`grid`, `block`, `sys.inputs.data`) replicando únicamente el concepto general de diseño a dos columnas con barra lateral, el cual no está sujeto a copyright de código fuente.

---

## 3. Fuentes Tipográficas Vendoreadas (`back/engine/fonts/`)

Para garantizar compilación reproducible y determinista en cualquier entorno (desarrollo local, CI y contenedores Docker sin acceso a red), el motor embebe la familia **Liberation Fonts** en `back/engine/fonts/`:

| Familia Tipográfica | Archivos en `back/engine/fonts/` | Licencia | Uso en Plantillas |
| :--- | :--- | :--- | :--- |
| **Liberation Sans** | `LiberationSans-{Regular,Bold,Italic,BoldItalic}.ttf` | **SIL Open Font License 1.1 (OFL-1.1)** (v2.00.0+) / GPLv2 + Font Exception | Fuente principal por defecto en `classic`, `modern`, `basic`, `kire`, `yuan`, `modern-cv`, `vercanard`, `impressive-impression`, `modern-resume`, `metronic` y fallback general. |
| **Liberation Serif** | `LiberationSerif-{Regular,Bold,Italic,BoldItalic}.ttf` | **SIL Open Font License 1.1 (OFL-1.1)** (v2.00.0+) / GPLv2 + Font Exception | Fuente principal por defecto en `engineering.typ`. |
| **Liberation Mono** | `LiberationMono-{Regular,Bold,Italic,BoldItalic}.ttf` | **SIL Open Font License 1.1 (OFL-1.1)** (v2.00.0+) / GPLv2 + Font Exception | Bloques monoespaciados y metadatos técnicos opcionales. |

Tanto **SIL OFL 1.1** como **GPLv2 con Font Embedding Exception** permiten la distribución de los archivos `.ttf` junto con el software y la incrustación (*embedding*) de los glifos dentro de los documentos PDF/SVG generados por los usuarios sin imponer restricciones de licencia sobre los CVs exportados.

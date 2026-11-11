# CV-Tailor — guía de diseño

Esta guía describe el sistema visual del frontend y la landing. La implementación de referencia vive en `front/src/app/globals.css` y en `front/src/components/landing/`.

## Dirección visual

CV-Tailor se siente como un atelier digital: preciso, editorial y cálido, sin el aspecto de un dashboard genérico. La página cuenta una historia al desplazarse: perfil → método → adaptación ES/EN → evolución profesional → planes.

- **Fondo:** grafito cálido, no negro puro.
- **Acento principal:** ámbar de sastrería para acciones y foco.
- **Acento secundario:** verde ciprés para progreso, adaptación y estados complementarios.
- **Contraste de material:** la interfaz es oscura; las hojas del CV son papel blanco A4 y conservan texto oscuro.
- **Composición:** títulos editoriales amplios, rótulos técnicos pequeños, bordes finos y resplandores localizados. La decoración acompaña al contenido; no lo compite.

## Tokens de color

Usar los tokens CSS en vez de repetir valores hexadecimales en componentes.

| Token | Valor actual | Uso |
| --- | --- | --- |
| `--bg-canvas` | `#0b0a09` | Fondo principal |
| `--bg-surface` | `#151310` | Secciones y superficies secundarias |
| `--bg-surface-raised` | `#1d1a16` | Elementos activos o elevados |
| `--text-primary` | `#f5f3ef` | Texto principal |
| `--text-ivory` | `#f6efe4` | Títulos de alto contraste |
| `--text-secondary` | `#a8a29e` | Descripciones y texto de apoyo |
| `--text-muted` | `#736e68` | Metadatos, numeración y etiquetas |
| `--accent` | `#e1a34a` | CTA principal, progreso y foco |
| `--green-accent` | `#1e3328` | Superficies verdes |
| `--green-text` | `#94c9a9` | Progreso y acento verde legible |
| `--sheet-bg` | `#ffffff` | Papel del CV |
| `--sheet-text` | `#111827` | Texto sobre papel |
| `--danger` | `#b5525c` | Errores y acciones destructivas |
| `--warning` | `#c9908a` | Advertencias |

Las variantes sutiles, bordes y halos (`--accent-subtle`, `--accent-border`, `--halo-color`, `--green-subtle`, `--green-border`, `--green-halo`) también se definen en `globals.css`. Preferirlas a transparencias inventadas por componente.

## Tipografía

- **Display — Playfair Display:** títulos editoriales y titulares de sección. Usar contraste de tamaño y cursiva con moderación.
- **Interfaz — Plus Jakarta Sans:** párrafos, botones, formularios y navegación.
- **Técnica — `ui-monospace`:** números de etapa, labels, medidas, precios y microcopy.

Las fuentes principales se cargan en `front/src/app/layout.tsx`; las utilidades `.font-display`, `.font-body` y `.font-mono-custom` y sus equivalentes de Tailwind se definen en `globals.css`.

## Estructura de la landing

La secuencia vive en `front/src/app/page.tsx` y debe conservar este orden narrativo:

1. **Hero — `HeroSection` / `HeroDropzone`:** una promesa breve, carga de CV y muestra A4. Mantener el área despejada; los detalles secundarios no deben repetirse en una lista de beneficios.
2. **Método — `WorkflowSection`:** tres pasos. En escritorio se comparan en paralelo; en móvil se enfoca el paso activo mientras el scroll avanza.
3. **The Mirror — `TheMirrorSection`:** demostración visual del paso de ES a EN. El movimiento y el ámbar→verde llevan la mirada del original a la adaptación.
4. **Versiones — `VersionTimelineSection`:** cuatro enfoques del mismo historial, con controles para saltar entre etapas y una hoja de CV que cambia con el progreso.
5. **Planes — `PricingSection`:** tres niveles con una jerarquía clara para el recomendado. Precios, características, CTA y condiciones se mantienen en `front/src/lib/pricing.ts`, no se duplican en la vista.
6. **Cierre — `LandingFooter`:** marca, acceso a la app y enlaces de referencia.

La navegación apunta a `#metodo`, `#the-mirror`, `#versiones` y `#pricing`. Si se renombra un `id`, actualizar también `LandingNav`.

## Layout y adaptación

- Diseñar primero para móvil: una columna, controles cómodos y una sola idea principal por viewport.
- A partir de `md`, las comparaciones y tarjetas pueden pasar a grillas; en `lg`, ampliar los márgenes y la composición editorial.
- Priorizar Flexbox para alineación y Grid para comparaciones bidimensionales.
- Las secciones de método, espejo y versiones usan scroll narrativo con contenido sticky. Mantener el contenido dentro del viewport, especialmente en móvil, y ofrecer botones para los cambios de etapa que dependan del scroll.
- Reservar el blanco puro para la hoja A4. Las tarjetas de interfaz permanecen en la gama de superficies oscuras.
- Usar líneas y bordes de un píxel, radios discretos y un halo localizado. Evitar sombras pesadas, gradientes multicolor y tarjetas decorativas sin función.

## Movimiento

- La entrada del hero usa `.hero-enter`; el subrayado ámbar se dibuja con `.hero-underline`.
- `ScrollReveal` revela contenido al entrar en el área visible. El método, The Mirror y versiones calculan progreso desde `#main-scroll` para sincronizar foco y demostraciones con el desplazamiento.
- El movimiento debe señalar el paso actual, no ser un requisito para entender el contenido. No agregar parallax intenso ni animaciones automáticas que distraigan.
- Respetar `prefers-reduced-motion`: `globals.css` desactiva transiciones/revelados y cambia el scroll suave a automático. Toda transición importante debe seguir siendo comprensible sin animación.

## Accesibilidad e interacción

- Usar headings en orden, landmarks semánticos y botones/enlaces reales para acciones. Dar nombre accesible a los controles de etapa y a la zona de carga.
- La carga de archivos debe seguir funcionando con teclado; los indicadores visuales no reemplazan instrucciones ni estados accesibles.
- Mantener anillos `focus-visible` visibles y contraste suficiente para texto secundario, estados y controles.
- Marcar como decorativos los brillos e iconos que no aportan información (`aria-hidden`); agregar texto alternativo a imágenes informativas.
- No hacer que la selección de una etapa, idioma o plan dependa exclusivamente de hover o de color.

## Voz y contenido

- Español rioplatense en la interfaz: «Cargá», «Subí», «Empezá».
- Preferir frases cortas y concretas. Evitar repetir privacidad, A4, descargas, open source o beneficios en varias zonas del hero.
- El CV se adapta a la oferta sin inventar experiencia. No introducir promesas de resultados, tiempos o capacidades que no estén respaldadas por el producto.
- Mantener nombres, precios, condiciones y prestaciones sincronizados con su fuente de datos; no modificarlos como parte de un ajuste visual.

## Componentes de referencia

- `front/src/app/globals.css` — tokens, tema Tailwind, materiales y movimiento.
- `front/src/app/layout.tsx` — idioma, metadatos y carga de fuentes.
- `front/src/app/page.tsx` — orden de la landing.
- `front/src/components/landing/` — hero, navegación, método, espejo, versiones, pricing, footer y `ScrollReveal`.
- `front/src/lib/pricing.ts` — fuente de verdad para planes.

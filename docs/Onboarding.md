# Onboarding — Flujo de Adquisición y Conversión

Tiers y precios: ver `BUSINESS.md` (SSOT). Este documento define solo el flujo.

## Principio Rector

- Evitar el patrón "subí tu PDF → paywall para descargar". El free es real: edición y descarga PDF ilimitadas sin cuenta.
- Único gate pago: adaptación IA contra oferta (2 free por cuenta). Plantillas y snapshots ilimitados en free.
- Nunca pedir tarjeta fuera de la compra explícita del Pase.

## Flujo

```
Landing (/) ──dropzone Hero──► Parsing ──► /editor (anónimo, borrador local)
                                                │
                                   Guardar / Adaptar con IA
                                                │
                              /login?next=/editor&action=<save|tailor>
                                                │
                        Migración borrador ──► ejecuta acción pendiente
                                                │
                         Contador "N adaptaciones restantes"
                                                │
                              3ª adaptación ──► Paywall (modal)
```

## 1. Landing (`/`)

- Mostrar solo a usuarios no autenticados. Usuario autenticado que entra a `/` → redirect a `/editor`.
- Hero con dropzone (PDF/TXT) como CTA principal. Debajo:
  - Microcopy: "Sin cuenta. No guardamos nada hasta que vos lo pidas."
  - Link "Open source — ver código" (GitHub).
  - CTA secundario "o empezá de cero" → `/editor` vacío.
  - Mensaje explícito: descarga PDF gratis e ilimitada.
- `PricingSection` al fondo con `id="pricing"`. Link "Pricing" en `LandingNav` que scrollea a `#pricing`. Sin ruta `/pricing`.

## 2. Carga y Parsing (anónimo)

- Parsing LLM permitido sin cuenta con rate-limit por IP (~3/día) en backend.
- Al exceder el límite: sugerir login (sin bloquear "empezá de cero").
- Resultado → `/editor` con el perfil parseado.

## 3. Editor Anónimo

- Perfil persistido en `localStorage` (sobrevive refresh y redirect OAuth).
- Permitido sin cuenta: editar, elegir cualquier plantilla, descargar PDF.
- Requiere cuenta: guardar en la nube, snapshots, adaptación IA.

## 4. Login Gate

- Disparadores: "Guardar" o "Adaptar a oferta".
- Redirect a `/login?next=/editor&action=<save|tailor>` (reusar login existente: email/password, GitHub, Google).
- Al volver autenticado:
  1. Sin perfil cloud → migrar borrador local en silencio.
  2. Con perfil cloud → modal: "Tenés un borrador local, ¿reemplazar perfil o descartar borrador?".
  3. Limpiar `localStorage`.
  4. Ejecutar la acción pendiente automáticamente.

## 5. Pricing Post-Login

- Sin popup ni pantalla de pricing al loguearse.
- Contador visible "N adaptaciones IA restantes" + link "Ver planes" en `AppSidebar`.
- Paywall solo al intentar la 3ª adaptación.
- "Ver planes" y paywall abren un modal in-app que reusa los tiers de `PricingSection` (sin duplicar precios).

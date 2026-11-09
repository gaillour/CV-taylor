# BUSINESS.md — Estrategia de Negocio y Producto (`cv-tailor`) o Taylor CV


## Propuesta de Valor y Posicionamiento

* **One-Liner:** "Cargá toda tu carrera una sola vez. Generá el CV perfecto para cada oferta en 15 segundos."
* **Foso Defensivo:**
  * Compilación tipográfica determinista en Typst (garantía física estricta de 1 página A4 sin desbordes).
  * Validación anti-alucinación contra hechos reales del perfil maestro.
  * Cero fricción de maquetado manual en Word/Docs por cada postulación.
* **Target Inicial:** Desarrolladores, ingenieros y perfiles IT (valoran texto plano, Markdown, diseño sobrio y postulaciones internacionales con filtro ATS). Expansión posterior a otros rubros profesionales.

---

## Identidad Visual y Dirección de Arte (Sartorial Heritage)

* **Metáfora Rectora:** Sastrería de precisión, artesanía británica (*Savile Row*) y atelier tipográfico. Ruptura total con los clichés de terminal hacker (negro puro OLED + verde neón) o clones genéricos de SaaS (degradados violetas).

---

## Modelo Open Source Comercial (Open Core)

* **Repositorio Público (Self-Hostable):**
  * Código abierto para auditar, correr local vía Docker y configurar con API keys propias.
  * Vector de tracción orgánica, validación técnica, estrellas en GitHub y comunidad (Reddit, Hacker News, X).
* **Versión Cloud Administrada (`cvtailor.dev`):**
  * Para usuarios que priorizan conveniencia inmediata: login con Google, almacenamiento en Supabase y adaptaciones listas en 2 clics.
* **Licencia de Software:**
  * **Opciones viables:** `AGPLv3` (obliga a liberar código a quien monte un servicio web derivado) o `FSL / Buskill` (código abierto para uso personal/auditoría, con restricción de explotación comercial directa). Por ahora quedemonos con FSL / Buskill. 
  * **Descartadas:** MIT / Apache 2.0 (evita que terceros cierren el código o creen wrappers comerciales sin aportar).

---

## Esquema de Monetización

Supera el modelo predatorio de suscripciones semanales/mensuales con cobros transparentes y no recurrentes:

| Nivel | Precio | Alcance |
|---|---|---|
| **Free (Generoso)** | $0 | Perfil maestro completo, edición reactiva, todas las plantillas, snapshots ilimitados, descargas PDF ilimitadas (sin cuenta) y 2 adaptaciones IA de prueba. |
| **Pase Búsqueda Activa** | $9 - $12 USD *(Pago único, 60-90 días)* | Adaptaciones IA ilimitadas contra ofertas. Sin cobros automáticos sorpresivos. |
| **Early Adopters (Lifetime)** | $29 - $39 USD *(Pago único de por vida)* | Cupo limitado (primeros 100-200 usuarios) para capitalización inicial y conformación de la base de evangelizadores. |

---

## Economía Unitaria y Costos Operativos

* **Costo por Adaptación (Gemini Flash):**
  * Insumo: ~2.500 tokens input / ~700 tokens output $\approx$ **$0.0006 USD** por llamada.
  * 1 USD cubre más de 1.500 adaptaciones de CVs.
* **Cobertura Inicial:**
  * Crédito mensual ($10 USD de Google AI Studio) cubre holgadamente más de 8.000 pruebas gratuitas al mes.
  * Infraestructura base (Vercel + Supabase Free Tier + backend liviano en VPS/PaaS) mantiene el costo fijo inicial en prácticamente $0 USD.

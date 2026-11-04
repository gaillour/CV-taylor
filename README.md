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

## Licencia


Este proyecto está bajo la licencia **Functional Source License, Version 1.1, MIT Future License (FSL-1.1-MIT)**.

* Libre para uso personal, educativo, investigación, auditoría y auto-alojamiento (self-hosting).
* Prohibida la explotación comercial directa de servicios o productos competitivos derivados durante los primeros 2 años.
* Cumplido el segundo aniversario de publicación, pasa irrevocablemente a licencia MIT.

Para más detalles, consultar [LICENSE](file:///home/juan/Documents/proj/cvs/cv-tailor/LICENSE).

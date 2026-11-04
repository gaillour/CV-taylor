"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Sparkles, ArrowRightLeft, Check, ShieldCheck, Languages, Cpu, Layers } from "lucide-react";
import { MirrorCvCard } from "./MirrorCvCard";
import type { MirrorCvData } from "./types";

const ES_SAMPLE_CV: MirrorCvData = {
  lang: "es",
  badge: "Español (Base)",
  name: "Alex Morgan",
  title: "Tech Lead Backend & Arquitecturas Distribuidas",
  location: "Buenos Aires, AR",
  contact: "alex.morgan@dev.io • linkedin.com/in/alex-morgan",
  summary:
    "Ingeniero de Software enfocado en arquitectura de baja latencia, contratos inmutables y procesamiento distribuido de alto rendimiento. Conducción técnica de equipos cross-functional y diseño de microservicios resilientes.",
  experience: [
    {
      role: "Tech Lead",
      company: "Prisma Cloud Logistics",
      period: "2023 — Presente",
      bullets: [
        "Rediseño de pipeline transaccional en Go y FastAPI, reduciendo latencia p99 en 38% sobre 15M req/día.",
        "Migración sin downtime de base relacional a PostgreSQL particionado, optimizando costos cloud en $24k/año.",
      ],
    },
    {
      role: "Senior Backend Developer",
      company: "Aura Fintech",
      period: "2021 — 2023",
      bullets: [
        "Implementación de arquitectura hexagonal para procesamiento de pagos concurrentes con garantías de idempotencia.",
        "Diseño e instrumentación de observabilidad distribuida con OpenTelemetry y Prometheus.",
      ],
    },
  ],
  skills: [
    "Go",
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Kubernetes",
    "Kafka",
    "Typst",
    "Arquitectura Hexagonal",
  ],
};

const EN_SAMPLE_CV: MirrorCvData = {
  lang: "en",
  badge: "English (Mirror)",
  name: "Alex Morgan",
  title: "Staff Backend Engineer & Distributed Systems Lead",
  location: "Buenos Aires, AR (Remote US/EU)",
  contact: "alex.morgan@dev.io • linkedin.com/in/alex-morgan",
  summary:
    "Software Engineer specializing in low-latency distributed architectures, immutable data contracts, and high-throughput transaction pipelines. Proven track record leading cross-functional teams and designing fault-tolerant microservices.",
  experience: [
    {
      role: "Tech Lead",
      company: "Prisma Cloud Logistics",
      period: "2023 — Present",
      bullets: [
        "Architected core high-throughput pipeline using Go & FastAPI, slashing p99 latency by 38% across 15M daily requests.",
        "Spearheaded zero-downtime migration to partitioned PostgreSQL, trimming cloud spend by $24k annually.",
      ],
    },
    {
      role: "Senior Backend Developer",
      company: "Aura Fintech",
      period: "2021 — 2023",
      bullets: [
        "Built hexagonal architecture for concurrent payment settlement with strict idempotency guarantees.",
        "Instrumented end-to-end distributed tracing using OpenTelemetry & Prometheus across 30+ services.",
      ],
    },
  ],
  skills: [
    "Go",
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Kubernetes",
    "Kafka",
    "Typst",
    "Distributed Systems",
  ],
};

export function TheMirrorSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Manejo de cálculo de scroll en container o main-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;

    const totalScrollable = containerHeight - viewportHeight;
    if (totalScrollable <= 0) return;

    // Distancia scrolleada desde que el tope del contenedor toca el tope del viewport
    const scrolled = -rect.top;
    const rawRatio = scrolled / totalScrollable;
    const clamped = Math.min(Math.max(rawRatio, 0), 1);
    setProgress(clamped);
  }, []);

  useEffect(() => {
    const scrollParent = document.getElementById("main-scroll") || window;

    // Disparar en frame inicial
    handleScroll();

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  // Función para forzar toggle manual suave
  const toggleLanguage = (target: "es" | "en") => {
    if (!containerRef.current) return;
    const scrollParent = document.getElementById("main-scroll") || window;
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const totalScrollable = containerHeight - viewportHeight;

    const targetScroll = target === "es" ? containerTop : containerTop + totalScrollable;

    scrollParent.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  // Cálculo de rotación y apertura de espejos laterales
  const isEnView = progress > 0.5;
  const triptychAngle = Math.min(progress * 28, 24); // Ángulo de apertura de las alas laterales

  return (
    <section
      id="the-mirror"
      ref={containerRef}
      className="relative min-h-[220vh] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      {/* Contenedor Sticky que se clava en la pantalla durante el recorrido de scroll */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between py-6 sm:py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Cabecera Editorial */}
        <div className="text-center max-w-3xl mx-auto shrink-0 z-10">
          <span className="font-script text-2xl sm:text-3xl text-[var(--accent)] block mb-1">
            El Espejo Bilingüe
          </span>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] font-bold tracking-tight">
            The Mirror: Un Perfil, Dos Culturas Profesionales
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto">
            Editá tu carrera en tu idioma base. El motor espeja tu dossier a inglés técnico nativo para ATS internacionales con diagramación Typst idéntica.
          </p>
        </div>

        {/* Tríptico de 3 Espejos de Sastrería */}
        <div className="flex-1 flex items-center justify-center my-auto w-full max-w-6xl mx-auto relative">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* ALA OESTE: ESPEJO 1 (Reflejo Terminológico & Matices ATS) */}
            <div
              className="hidden lg:block lg:col-span-3 transition-all duration-300 transform-gpu"
              style={{
                transform: `perspective(1000px) rotateY(${triptychAngle}deg)`,
                opacity: 0.85 + progress * 0.15,
              }}
            >
              <div className="p-4 sm:p-5 rounded-lg bg-[var(--bg-surface)]/85 backdrop-blur-md border border-[var(--border-hairline)] shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border-hairline)]">
                  <Languages className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
                    Matiz Cultural ATS
                  </span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                      Cargo / Seniority
                    </span>
                    <p className="text-[var(--text-secondary)] line-through text-[10px] mb-0.5">
                      Líder Técnico
                    </p>
                    <p className="text-[var(--accent)] font-semibold flex items-center gap-1 font-mono text-[11px]">
                      <Check className="w-3 h-3 shrink-0" />
                      Staff Backend Lead
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                      Verbo de Acción
                    </span>
                    <p className="text-[var(--text-secondary)] line-through text-[10px] mb-0.5">
                      Rediseño de pipeline...
                    </p>
                    <p className="text-[var(--accent)] font-semibold flex items-center gap-1 font-mono text-[11px]">
                      <Check className="w-3 h-3 shrink-0" />
                      Architected core pipeline...
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase block mb-1">
                      Impacto de Negocio
                    </span>
                    <p className="text-[var(--text-primary)] font-mono text-[10px]">
                      Métricas cuantificadas (-38% p99) respetadas al 100%.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                  <span>Traducción Técnica:</span>
                  <span className="text-[var(--accent)] font-semibold">Zero-Literal Slop</span>
                </div>
              </div>
            </div>

            {/* ESPEJO CENTRAL: EL CV FLOTANTE ROTANDO EN 3D */}
            <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center relative">
              
              {/* Halos de luz rasante */}
              <div
                className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none transition-all duration-500 -z-10"
                style={{
                  background: `radial-gradient(circle, var(--accent-subtle) 0%, transparent 70%)`,
                  transform: `scale(${1 + Math.sin(progress * Math.PI) * 0.25})`,
                  filter: "blur(50px)",
                }}
              />

              {/* El CV 3D de dos caras */}
              <MirrorCvCard
                progress={progress}
                esCv={ES_SAMPLE_CV}
                enCv={EN_SAMPLE_CV}
              />
            </div>

            {/* ALA ESTE: ESPEJO 3 (Garantía de Sincronización Inmutable) */}
            <div
              className="hidden lg:block lg:col-span-3 transition-all duration-300 transform-gpu"
              style={{
                transform: `perspective(1000px) rotateY(-${triptychAngle}deg)`,
                opacity: 0.85 + progress * 0.15,
              }}
            >
              <div className="p-4 sm:p-5 rounded-lg bg-[var(--bg-surface)]/85 backdrop-blur-md border border-[var(--border-hairline)] shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border-hairline)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
                    Inmutabilidad Typst
                  </span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] mb-1">
                      <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Single Source of Truth</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Cero discrepancias entre perfiles. Tu información canónica vive en una base sincronizada.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] mb-1">
                      <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>1 Página Estricta A4</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      El motor tipográfico recalcula micro-espaciados para que ambas versiones mantengan 1 sola hoja.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)]">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Doble Exportación PDF</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Descargá en cualquier momento el dossier en español o en inglés con 1 clic.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                  <span>Compilación:</span>
                  <span className="text-[var(--accent)] font-semibold">Determinista</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Consola Inferior: Telemetría de Rotación & Controles de Idioma */}
        <div className="w-full max-w-xl mx-auto shrink-0 z-10">
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--bg-surface-raised)]/90 backdrop-blur-md border border-[var(--border-hairline)] shadow-xl">
            
            {/* Barra de progreso de rotación de 0° a 180° */}
            <div className="flex items-center justify-between gap-3 text-xs font-mono mb-2.5">
              <button
                type="button"
                onClick={() => toggleLanguage("es")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                  !isEnView
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <span>ES</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold">Base</span>
              </button>

              {/* Riel central con ángulo */}
              <div className="flex-1 flex flex-col items-center px-2">
                <div className="flex justify-between w-full text-[9px] text-[var(--text-muted)] font-mono mb-1">
                  <span>0° Español</span>
                  <span className="text-[var(--accent)] font-semibold">
                    {Math.round(progress * 180)}° Giro 3D
                  </span>
                  <span>180° English</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-hairline)]">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-150 rounded-full"
                    style={{ width: `${Math.max(progress * 100, 3)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleLanguage("en")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                  isEnView
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <span>EN</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold">Mirror</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-[var(--text-muted)] font-mono flex items-center justify-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3 text-[var(--accent)]" />
              <span>Hacé scroll para rotar el espejo o clickeá en los botones para alternar idiomas</span>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

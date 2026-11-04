"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { MirrorCvCard } from "./MirrorCvCard";
import type { MirrorCvData } from "./types";

const ES_SAMPLE_CV: MirrorCvData = {
  lang: "es",
  badge: "Español (Base)",
  name: "Santiago Rossi",
  title: "Tech Lead Backend & Arquitecturas Distribuidas",
  location: "Buenos Aires, AR",
  contact: "santiago.rossi@dev.io • linkedin.com/in/santiago-rossi",
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
  name: "Santiago Rossi",
  title: "Staff Backend Engineer & Distributed Systems Lead",
  location: "Buenos Aires, AR (Remote US/EU)",
  contact: "santiago.rossi@dev.io • linkedin.com/in/santiago-rossi",
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
  const slotEsRef = useRef<HTMLDivElement>(null);
  const slotEnRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [deltaX, setDeltaX] = useState(420);

  // Manejo de cálculo de scroll continuo en container o main-scroll
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

  // Medición de la distancia horizontal entre el Slot ES y el Slot EN
  const measureDistance = useCallback(() => {
    if (!slotEsRef.current || !slotEnRef.current) return;
    const esLeft = slotEsRef.current.offsetLeft;
    const enLeft = slotEnRef.current.offsetLeft;
    const offsetDiff = enLeft - esLeft;
    if (offsetDiff > 0) {
      setDeltaX(offsetDiff);
      return;
    }
    const esRect = slotEsRef.current.getBoundingClientRect();
    const enRect = slotEnRef.current.getBoundingClientRect();
    const rectDiff = enRect.left - esRect.left;
    if (rectDiff > 0) {
      setDeltaX(rectDiff);
    }
  }, []);

  useEffect(() => {
    const scrollParent = document.getElementById("main-scroll") || window;

    // Disparar en frame inicial
    handleScroll();
    measureDistance();

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    const onResize = () => {
      handleScroll();
      measureDistance();
    };

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    const timer = setTimeout(measureDistance, 80);

    return () => {
      clearTimeout(timer);
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [handleScroll, measureDistance]);

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

  return (
    <section
      id="the-mirror"
      ref={containerRef}
      className="relative min-h-[220vh] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      {/* Contenedor Sticky que se clava en la pantalla durante el recorrido de scroll */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between items-center pt-5 sm:pt-6 pb-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Cabecera Editorial Compacta */}
        <div className="text-center max-w-2xl mx-auto shrink-0 z-10">
          <span className="font-display italic text-lg sm:text-xl text-[var(--accent)] block -mb-0.5">
            El Espejo Bilingüe
          </span>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl text-[var(--text-primary)] font-bold tracking-tight">
            The Mirror: Un Perfil, Dos Culturas Profesionales
          </h2>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 max-w-lg mx-auto">
            Editá tu carrera en tu idioma base. Mientras scrolleás, el motor traslada y espeja tu dossier a inglés técnico nativo directo al cuadro de destino ATS.
          </p>
        </div>

        {/* Escenario Central: Dos Docks y CV 3D en Vuelo Horizontal */}
        <div className="w-full flex-1 flex flex-col items-center justify-center relative my-auto">
          
          {/* Halos de luz rasante que acompañan el viaje del documento */}
          <div
            className="absolute w-72 h-72 sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none transition-all duration-500 -z-10"
            style={{
              background: progress > 0.45
                ? `radial-gradient(circle, var(--green-halo) 0%, transparent 70%)`
                : `radial-gradient(circle, var(--accent-subtle) 0%, transparent 70%)`,
              left: `calc(25% + ${progress * 50}%)`,
              top: "50%",
              transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI) * 0.25})`,
              filter: "blur(60px)",
            }}
          />

          {/* Grid de Dos Docks: Izquierda (ES) y Derecha (EN) */}
          <div className="relative grid grid-cols-2 gap-4 sm:gap-8 md:gap-12 lg:gap-16 items-center justify-items-center w-full max-w-[820px] lg:max-w-[900px] mx-auto scale-[0.52] xs:scale-[0.62] sm:scale-[0.8] md:scale-100 origin-center transition-transform duration-200">
            
            {/* DOCK IZQUIERDO: ES (ORIGEN BASE) */}
            <div
              ref={slotEsRef}
              onClick={() => toggleLanguage("es")}
              className="relative w-full max-w-[320px] sm:max-w-[350px] lg:max-w-[380px] aspect-[210/297] rounded-md border-2 border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/40 p-4 sm:p-5 flex flex-col justify-between cursor-pointer select-none transition-colors hover:border-[var(--text-muted)]"
            >
              {/* Header del Dock ES */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border border-[var(--border-hairline)] uppercase tracking-wider">
                  ES • Base
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  Origen
                </span>
              </div>

              {/* Centro del Dock ES */}
              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-zinc-700/50 bg-zinc-800/30 flex flex-col items-center justify-center mb-2">
                  <span className="font-display text-4xl sm:text-5xl font-black text-zinc-500/40 tracking-tight select-none">
                    ES
                  </span>
                  <span className="text-[7.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold -mt-1">
                    Base
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)]">
                  Dossier Original
                </span>
                <p className="text-[8.5px] text-[var(--text-muted)] max-w-[180px] mt-0.5 font-mono">
                  Redactado en tu idioma nativo
                </p>

                {/* Wireframe lines simulando el documento base */}
                <div className="w-full max-w-[170px] space-y-1.5 mt-3 opacity-30">
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-full" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-4/5 mx-auto" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-3/5 mx-auto" />
                </div>
              </div>

              {/* Pie del Dock ES */}
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${progress < 0.15 ? "bg-[var(--accent)]" : "bg-zinc-600"}`} />
                  Fuente editable
                </span>
                <span>Typst A4</span>
              </div>

              {/* LA TARJETA FLOTANTE QUE VIAJA AL DOCK EN */}
              <div
                className="absolute inset-0 w-full h-full z-20 pointer-events-auto"
                style={{
                  transform: `translate3d(${progress * deltaX}px, ${-Math.sin(progress * Math.PI) * 22}px, 0) scale(${1 + Math.sin(progress * Math.PI) * 0.04})`,
                  transformOrigin: "center center",
                }}
              >
                <MirrorCvCard
                  progress={progress}
                  esCv={ES_SAMPLE_CV}
                  enCv={EN_SAMPLE_CV}
                />
              </div>
            </div>

            {/* DOCK DERECHO: EN (CUADRO DE DESTINO) */}
            <div
              ref={slotEnRef}
              onClick={() => toggleLanguage("en")}
              className={`relative w-full max-w-[320px] sm:max-w-[350px] lg:max-w-[380px] aspect-[210/297] rounded-md border-2 border-dashed transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between cursor-pointer select-none ${
                progress >= 0.85
                  ? "border-[var(--green-border)] bg-[var(--green-subtle)] shadow-xl"
                  : "border-[var(--green-border)]/60 bg-[var(--green-subtle)]/30 hover:border-[var(--green-border)]"
              }`}
            >
              {/* Header del Dock EN */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--green-accent)] text-[var(--green-text)] border border-[var(--green-border)] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-[var(--green-text)]" />
                  EN • Mirror
                </span>
                <span className="text-[9px] font-mono text-[var(--green-text)] font-semibold">
                  International ATS
                </span>
              </div>

              {/* Centro del Dock EN: El cuadro destacado que dice EN */}
              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-[var(--green-border)] bg-[var(--green-accent)]/40 flex flex-col items-center justify-center mb-2 shadow-inner">
                  <span className="font-display text-4xl sm:text-5xl font-black text-[var(--green-text)] tracking-tight select-none">
                    EN
                  </span>
                  <span className="text-[7.5px] font-mono uppercase tracking-widest text-[var(--green-text)] font-bold -mt-1">
                    Target
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-primary)]">
                  Cuadro de Destino
                </span>
                <p className="text-[8.5px] text-[var(--text-muted)] max-w-[180px] mt-0.5 font-mono">
                  Traducción contextual a inglés técnico
                </p>

                {/* Wireframe lines simulando la plantilla de destino */}
                <div className="w-full max-w-[170px] space-y-1.5 mt-3 opacity-40">
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-full" />
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-4/5 mx-auto" />
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-3/5 mx-auto" />
                </div>
              </div>

              {/* Pie del Dock EN */}
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[8px] sm:text-[9px] font-mono">
                {progress >= 0.85 ? (
                  <span className="text-[var(--green-text)] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[var(--green-text)]" /> Espejo Acoplado
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-text)] animate-pulse" />
                    Esperando documento...
                  </span>
                )}
                <span className="text-[var(--text-muted)]">100% Typst Sync</span>
              </div>
            </div>

          </div>
        </div>

        {/* Controles limpios sin barra de progreso */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-[var(--text-muted)] shrink-0 z-10">
          <button
            type="button"
            onClick={() => toggleLanguage("es")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              progress < 0.5
                ? "text-[var(--text-primary)] font-bold bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            ← Base (ES)
          </button>
          <span className="text-[var(--border-hairline)]">•</span>
          <span className="text-[9.5px] sm:text-[10px] text-[var(--text-muted)]">
            Scrolleá para trasladar y rotar hacia EN
          </span>
          <span className="text-[var(--border-hairline)]">•</span>
          <button
            type="button"
            onClick={() => toggleLanguage("en")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              progress >= 0.5
                ? "text-[var(--green-text)] font-bold bg-[var(--green-accent)] border border-[var(--green-border)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Mirror (EN) →
          </button>
        </div>

      </div>
    </section>
  );
}

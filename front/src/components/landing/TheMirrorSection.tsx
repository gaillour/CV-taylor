"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { MirrorCvCard } from "./MirrorCvCard";
import type { MirrorCvData } from "./types";
import { ScrollReveal } from "./ScrollReveal";

const ES_SAMPLE_CV: MirrorCvData = {
  lang: "es",
  badge: "Español (Base)",
  name: "Juan Carlos Pérez",
  title: "Líder Técnico & Desarrollador Principal",
  location: "Buenos Aires, AR",
  contact: "juan.perez@dev.io • linkedin.com/in/juan-carlos-perez",
  summary:
    "Especialista en arquitectura distribuida, optimización de rendimiento y dirección técnica de equipos de ingeniería. Enfoque riguroso en resiliencia de producto, estándares de calidad y desarrollo escalable.",
  experience: [
    {
      role: "Tech Lead",
      company: "Prisma Logistics",
      period: "2023 — Presente",
      bullets: [
        "Liderazgo en la modernización de servicios centrales, aumentando el rendimiento general en un 40%.",
        "Optimización de infraestructura y almacenamiento en la nube con ahorro comprobado de $24k anuales.",
      ],
    },
    {
      role: "Senior Backend Developer",
      company: "Aura Pay",
      period: "2021 — 2023",
      bullets: [
        "Diseño de procesamiento de pagos transaccionales con garantías de alta disponibilidad.",
        "Implementación de estándares de observabilidad y monitoreo continuo entre servicios clave.",
      ],
    },
  ],
  skills: [
    "Python",
    "Go",
    "PostgreSQL",
    "Cloud Architecture",
    "Distributed Systems",
    "System Design",
    "Team Leadership",
    "API Design",
  ],
};

const EN_SAMPLE_CV: MirrorCvData = {
  lang: "en",
  badge: "English (Mirror)",
  name: "Juan Carlos Pérez",
  title: "Staff Software Engineer & Technical Lead",
  location: "Buenos Aires, AR (Remote US/EU)",
  contact: "juan.perez@dev.io • linkedin.com/in/juan-carlos-perez",
  summary:
    "Software Engineer specializing in distributed system design, high-performance services, and engineering leadership. Proven track record building resilient products and scalable architectures.",
  experience: [
    {
      role: "Tech Lead",
      company: "Prisma Logistics",
      period: "2023 — Present",
      bullets: [
        "Spearheaded core services modernization, driving a 40% overall throughput increase.",
        "Optimized cloud infrastructure and data workflows, reducing operational costs by $24k annually.",
      ],
    },
    {
      role: "Senior Backend Developer",
      company: "Aura Pay",
      period: "2021 — 2023",
      bullets: [
        "Architected reliable payment processing pipelines with strict high-availability standards.",
        "Engineered end-to-end monitoring and system observability across critical business services.",
      ],
    },
  ],
  skills: [
    "Python",
    "Go",
    "PostgreSQL",
    "Cloud Architecture",
    "Distributed Systems",
    "System Design",
    "Team Leadership",
    "API Design",
  ],
};

export function TheMirrorSection() {
  const containerRef = useRef<HTMLElement>(null);
  const slotEsRef = useRef<HTMLButtonElement>(null);
  const slotEnRef = useRef<HTMLButtonElement>(null);
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
    const esRect = slotEsRef.current.getBoundingClientRect();
    const enRect = slotEnRef.current.getBoundingClientRect();

    // Obtenemos el ancho sin escala del elemento
    const offsetWidth = slotEsRef.current.offsetWidth || esRect.width;

    // Si el contenedor padre tiene escala CSS (scale-[0.8] o similar),
    // la escala real computada es esRect.width / offsetWidth
    const currentScale = offsetWidth > 0 ? esRect.width / offsetWidth : 1;

    // Distancia exacta requerida en coordenadas locales del contenedor
    const exactLocalDistance = (enRect.left - esRect.left) / (currentScale || 1);

    if (exactLocalDistance > 0) {
      setDeltaX(exactLocalDistance);
    }
  }, []);

  useEffect(() => {
    const scrollParent = document.getElementById("main-scroll") || window;

    // Disparar en frame inicial
    handleScroll();
    measureDistance();

    // ResizeObserver para recalcular dinámicamente si cambia cualquier tamaño o escala
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        measureDistance();
      });
      if (slotEsRef.current) resizeObserver.observe(slotEsRef.current);
      if (slotEnRef.current) resizeObserver.observe(slotEnRef.current);
      if (containerRef.current) resizeObserver.observe(containerRef.current);
    }

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

    // Timers escalonados para atrapar cualquier transición o carga de fuentes tardía
    const timer1 = setTimeout(measureDistance, 60);
    const timer2 = setTimeout(measureDistance, 250);
    const timer3 = setTimeout(measureDistance, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [handleScroll, measureDistance]);

  // Función para forzar toggle manual suave
  const toggleLanguage = (target: "es" | "en") => {
    if (!containerRef.current) return;
    const scrollParent = document.getElementById("main-scroll") || window;
    const scrollTop = scrollParent === window ? window.scrollY : (scrollParent as HTMLElement).scrollTop;
    const sectionTop = containerRef.current.getBoundingClientRect().top + scrollTop;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = sectionTop + (target === "en" ? totalScrollable : 0);

    scrollParent.scrollTo({
      top: targetScroll,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section
      id="the-mirror"
      ref={containerRef}
      aria-labelledby="mirror-title"
      className="scroll-story relative min-h-[220vh] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      {/* Contenedor Sticky que se clava en la pantalla durante el recorrido de scroll */}
      <div className="scroll-story-sticky sticky top-0 flex h-screen w-full flex-col items-center justify-between overflow-hidden px-4 pb-6 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        
        {/* Cabecera Editorial Compacta */}
        <ScrollReveal direction="up" className="w-full shrink-0">
        <div className="text-center max-w-2xl mx-auto shrink-0 z-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--green-text)]">
            02 / The Mirror
          </span>
          <h2 id="mirror-title" className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-5xl lg:text-6xl">
            Dos idiomas. <span className="italic text-[var(--text-secondary)]">Una historia.</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
            El CV cruza el idioma, no los hechos.
          </p>
        </div>
        </ScrollReveal>

        {/* Escenario Central: Dos Docks y CV 3D en Vuelo Horizontal */}
        <div className="w-full flex-1 flex flex-col items-center justify-center relative my-auto">
          
          {/* Halos de luz rasante que acompañan el viaje del documento */}
          <div
            className="absolute w-72 h-72 sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none transition-all duration-500 -z-10"
            style={{
              background: `radial-gradient(circle, ${progress >= 0.55 ? "var(--green-halo)" : "var(--halo-color)"} 0%, transparent 70%)`,
              left: `calc(25% + ${progress * 50}%)`,
              top: "50%",
              transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI) * 0.25})`,
              filter: "blur(60px)",
            }}
          />

          {/* Grid de Dos Docks: Izquierda (ES) y Derecha (EN) */}
          <div className="relative grid w-full max-w-[820px] grid-cols-2 items-center justify-items-center gap-3 sm:gap-8 md:gap-12 lg:max-w-[900px] lg:gap-16 mx-auto">
            
            {/* DOCK IZQUIERDO: ES (ORIGEN BASE) */}
            <button
              ref={slotEsRef}
              type="button"
              aria-label="Ver el CV original en español"
              onClick={() => toggleLanguage("es")}
              className="relative flex w-full max-w-[320px] aspect-[210/297] select-none flex-col justify-between rounded-sm border-2 border-dashed border-[var(--accent-border)] bg-[var(--bg-surface)]/65 p-4 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:max-w-[350px] sm:p-5 lg:max-w-[380px]"
            >
              {/* Header del Dock ES */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  ES · ORIGEN
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  01
                </span>
              </div>

              {/* Centro del Dock ES */}
              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="flex size-16 flex-col items-center justify-center rounded-full border border-dashed border-[var(--accent-border)] bg-[var(--accent-subtle)] sm:size-20">
                  <span className="font-display text-3xl font-medium tracking-tight text-[var(--accent)] sm:text-4xl">
                    ES
                  </span>
                </div>
                <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:text-[11px]">
                  CV maestro
                </span>

                {/* Wireframe lines simulando el documento base */}
                <div className="w-full max-w-[170px] space-y-1.5 mt-3 opacity-30">
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-full" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-4/5 mx-auto" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-3/5 mx-auto" />
                </div>
              </div>

              {/* Pie del Dock ES */}
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-[var(--text-muted)]">
                  <span>Fuente editable</span>
                  <span>A4</span>
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
            </button>

            {/* DOCK DERECHO: EN (CUADRO DE DESTINO) */}
            <button
              ref={slotEnRef}
              type="button"
              aria-label="Ir a la adaptación en inglés"
              onClick={() => toggleLanguage("en")}
              className={`relative flex w-full max-w-[320px] aspect-[210/297] select-none flex-col justify-between rounded-sm p-4 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-text)] sm:max-w-[350px] sm:p-5 lg:max-w-[380px] ${
                progress >= 0.85
                  ? "border-2 border-[var(--green-text)] bg-[var(--green-subtle)] shadow-[0_0_48px_-18px_var(--green-text)]"
                  : "border-2 border-dashed border-[var(--green-border)]/70 bg-[var(--green-subtle)]/25 hover:border-[var(--green-text)]"
              }`}
            >
              {/* Header del Dock EN */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--green-text)] uppercase tracking-wider">
                  EN · DESTINO
                </span>
                <span className="text-[9px] font-mono text-[var(--green-text)] font-semibold">
                  02
                </span>
              </div>

              {/* Centro del Dock EN: El cuadro destacado que dice EN */}
              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="flex size-16 flex-col items-center justify-center rounded-full border border-dashed border-[var(--green-border)] bg-[var(--green-accent)]/30 sm:size-20">
                  <span className="font-display text-3xl font-medium tracking-tight text-[var(--green-text)] sm:text-4xl">
                    EN
                  </span>
                </div>
                <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--green-text)] sm:text-[11px]">
                  CV adaptado
                </span>

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
                  <span className="flex items-center gap-1 font-semibold text-[var(--green-text)]">
                    <CheckCircle2 aria-hidden="true" className="size-3" /> Adaptado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--green-text)] motion-safe:animate-pulse" />
                    Adaptando…
                  </span>
                )}
              </div>
            </button>

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
            ← ES
          </button>
          <span className="text-[var(--border-hairline)]">•</span>
          <span role="progressbar" aria-label="Progreso de adaptación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-px w-16 overflow-hidden bg-[var(--border-hairline)] sm:w-32">
            <span className="mirror-progress-fill block h-full bg-gradient-to-r from-[var(--accent)] to-[var(--green-text)] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          </span>
          <span className="text-[var(--border-hairline)]">•</span>
          <button
            type="button"
            onClick={() => toggleLanguage("en")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              progress >= 0.5
                ? "text-[var(--green-text)] font-bold bg-[var(--green-subtle)] border border-[var(--green-border)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            EN →
          </button>
        </div>

      </div>
    </section>
  );
}

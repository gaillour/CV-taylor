"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { TailorButton } from "./TailoringIcons";

interface VersionLevel {
  id: string;
  tag: string;
  label: string;
  kicker: string;
  summary: string;
  cvTitle: string;
  cvFocus: string;
  bullets: string[];
  skills: string[];
  docBadge: string;
}

const levels: VersionLevel[] = [
  {
    id: "v1",
    tag: "V1",
    label: "Base",
    kicker: "Tu Archivo Maestro",
    summary: "Toda tu experiencia, lista para adaptarse.",
    cvTitle: "Desarrollador de Software",
    cvFocus: "Historial completo",
    bullets: [
      "Experiencia, proyectos y logros, sin recortes.",
      "Todas tus habilidades en una sola base.",
    ],
    skills: ["JavaScript", "Python", "SQL", "Git", "React", "Docker", "Linux"],
    docBadge: "Perfil base",
  },
  {
    id: "v2",
    tag: "V2",
    label: "Junior",
    kicker: "Primeros Pasos",
    summary: "Proyectos, fundamentos y capacidad de aprender.",
    cvTitle: "Junior Software Developer",
    cvFocus: "Proyectos y stack técnico",
    bullets: [
      "Features full-stack con React, Node.js y SQL.",
      "Tests, resolución de bugs y deploy independiente.",
    ],
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Git", "REST APIs"],
    docBadge: "Junior",
  },
  {
    id: "v3",
    tag: "V3",
    label: "Semi Senior",
    kicker: "Impacto & Autonomía",
    summary: "Resultados, métricas y autonomía técnica.",
    cvTitle: "Semi Senior Software Engineer",
    cvFocus: "Resultados y ownership",
    bullets: [
      "Rediseño del flujo de pagos: 35% menos tiempo de respuesta.",
      "Ownership de servicios con despliegue continuo.",
    ],
    skills: ["Go", "TypeScript", "PostgreSQL", "Docker", "AWS", "Microservicios"],
    docBadge: "Semi senior",
  },
  {
    id: "v4",
    tag: "V4",
    label: "Senior",
    kicker: "Liderazgo & Arquitectura",
    summary: "Arquitectura, decisiones y liderazgo técnico.",
    cvTitle: "Senior Engineer & Tech Lead",
    cvFocus: "Arquitectura y liderazgo",
    bullets: [
      "Arquitectura y estándares para un equipo de 8 personas.",
      "25% menos en costos cloud. Mentoría técnica.",
    ],
    skills: ["System Design", "Cloud Architecture", "Go / Python", "Kubernetes", "Liderazgo"],
    docBadge: "Senior",
  },
];

export function VersionTimelineSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const totalScrollable = containerHeight - viewportHeight;
    if (totalScrollable <= 0) return;

    const scrolled = -rect.top;
    const clamped = Math.min(Math.max(scrolled / totalScrollable, 0), 1);
    setProgress(clamped);
  }, []);

  useEffect(() => {
    const scrollParent = document.getElementById("main-scroll") || window;
    handleScroll();
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      scrollParent.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  // Selección del nivel según scroll (0, 1, 2 o 3)
  const activeIdx = Math.min(3, Math.floor(progress * 4));
  const current = levels[activeIdx];

  const jumpToLevel = (index: number) => {
    if (!containerRef.current) return;
    const scrollParent = document.getElementById("main-scroll") || window;
    const scrollTop = scrollParent === window ? window.scrollY : (scrollParent as HTMLElement).scrollTop;
    const sectionTop = containerRef.current.getBoundingClientRect().top + scrollTop;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = sectionTop + ((index + 0.5) / levels.length) * totalScrollable;
    scrollParent.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <section
      id="versiones"
      ref={containerRef}
      aria-labelledby="versions-title"
      className="scroll-story relative min-h-[250vh] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      {/* Contenedor Sticky: la pantalla se fija mientras scrolleás */}
      <div className="scroll-story-sticky sticky top-0 flex h-screen w-full flex-col items-center justify-between overflow-hidden px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        
        {/* Luz difusa ambiental cálida */}
        <div className="ambient-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />

        {/* Cabecera Concisa */}
        <ScrollReveal direction="up" className="w-full shrink-0">
        <div className="text-center max-w-xl mx-auto shrink-0 z-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
            03 / Evolución
          </span>
          <h2 id="versions-title" className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-5xl lg:text-6xl">
            Distintas versiones <span className="italic text-[var(--text-secondary)]">para cada etapa.</span>
          </h2>
        </div>
        </ScrollReveal>

        {/* Centro: Panel de Versionado con V1 Gigante + Hoja de CV interactiva */}
        <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Columna Izquierda: Nivel Actual con V1/V2/V3/V4 Gigante */}
          <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left space-y-4">
            
            <nav aria-label="Etapas de carrera" className="relative flex items-center justify-center gap-5 lg:justify-start">
              <span aria-hidden="true" className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-[var(--border-hairline)]" />
              {levels.map((lvl, idx) => (
                <button
                  key={lvl.id}
                  type="button"
                  aria-label={`${lvl.tag}: ${lvl.label}`}
                  aria-pressed={activeIdx === idx}
                  onClick={() => jumpToLevel(idx)}
                  className={`relative z-10 size-9 rounded-full border font-mono text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    activeIdx === idx
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : activeIdx > idx
                      ? "border-[var(--green-border)] bg-[var(--bg-canvas)] text-[var(--green-text)]"
                      : "border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:border-[var(--border-subtle)]"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </nav>

            {/* Número de Versión GIGANTE */}
            <div className="flex items-baseline justify-center lg:justify-start gap-3">
              <span className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-[var(--accent)] leading-none tracking-tighter select-none">
                {current.tag}
              </span>
              <div className="text-left">
                <span className="text-xl sm:text-2xl font-display font-bold text-[var(--text-primary)] block">
                  {current.label}
                </span>
                <span className={`text-xs font-mono uppercase tracking-wider font-semibold ${activeIdx >= 2 ? "text-[var(--green-text)]" : "text-[var(--accent)]"}`}>
                  {current.kicker}
                </span>
              </div>
            </div>

            {/* Bajada simple */}
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto lg:mx-0">
              {current.summary}
            </p>

            {/* Barra de progreso de scroll específica del versionado */}
            <div className="flex items-center justify-center gap-3 pt-2 lg:justify-start">
              <div role="progressbar" aria-label="Progreso de versiones" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-px w-28 overflow-hidden bg-[var(--border-hairline)]">
                <div className="story-progress-fill h-full bg-gradient-to-r from-[var(--accent)] to-[var(--green-text)] transition-[width] duration-150" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{current.tag} / 04</span>
            </div>

          </div>

          {/* Columna Derecha: Hoja de CV que cambia de forma visible */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[420px] rounded-xl bg-white text-zinc-900 p-6 sm:p-7 shadow-2xl border border-zinc-200 transition-all duration-500 relative flex flex-col justify-between">
              
              {/* Sello de versión en la hoja */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                <span
                  className={`font-mono text-[10.5px] font-semibold uppercase tracking-wider ${
                    activeIdx === 0 ? "text-[#935f18]" : "text-emerald-800"
                  }`}
                >
                  {current.docBadge}
                </span>
              </div>

              {/* Encabezado del CV */}
              <div className="mb-4">
                <span className="text-lg sm:text-xl font-display font-bold text-zinc-900 block">
                  Juan Carlos Pérez
                </span>
                <span className="text-xs font-mono font-semibold text-[#935f18] block mt-0.5">
                  {current.cvTitle}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                  {current.cvFocus}
                </p>
              </div>

              {/* Viñetas adaptadas al nivel */}
              <div className="space-y-2 mb-4">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Experiencia
                </span>
                {current.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 text-xs text-zinc-700 leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              {/* Skills calibradas para esta versión */}
              <div className="pt-3 border-t border-zinc-200">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold block mb-1.5">
                  Habilidades
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {current.skills.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-mono border border-zinc-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pie de la hoja */}
              <div className="mt-4 pt-2 border-t border-zinc-100 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>A4 · ATS</span>
                <TailorButton size={14} strokeWidth={1.3} className="text-[#935f18] opacity-70" />
              </div>

            </div>
          </div>

        </div>

        <p className="sr-only" aria-live="polite">{current.tag}: {current.label}</p>

      </div>
    </section>
  );
}

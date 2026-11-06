"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
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
    summary: "Cargás toda tu historia una sola vez. Tu experiencia completa sin recortes.",
    cvTitle: "Desarrollador de Software",
    cvFocus: "Historial completo de carrera y proyectos",
    bullets: [
      "Historial integral de empleos, proyectos universitarios y freelance.",
      "Registro de todas las herramientas y tecnologías aprendidas.",
      "Base inalterable de la que se derivan todas tus versiones.",
    ],
    skills: ["JavaScript", "Python", "SQL", "Git", "React", "Docker", "Linux"],
    docBadge: "Archivo Maestro (Sin Poda)",
  },
  {
    id: "v2",
    tag: "V2",
    label: "Junior",
    kicker: "Primeros Pasos",
    summary: "Foco en proyectos personales, fundamentos sólidos y velocidad de aprendizaje.",
    cvTitle: "Junior Software Developer",
    cvFocus: "Proyectos construidos y tecnologías dominadas",
    bullets: [
      "Desarrollo de features full-stack con React, Node.js y bases de datos relacionales.",
      "Implementación de tests unitarios y resolución de bugs en producción.",
      "Despliegue autónomo de aplicaciones web con buenas prácticas.",
    ],
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Git", "REST APIs"],
    docBadge: "Calibrado para Puesto Junior",
  },
  {
    id: "v3",
    tag: "V3",
    label: "Semi Senior",
    kicker: "Impacto & Autonomía",
    summary: "Foco en resultados concretos, métricas de rendimiento y autonomía técnica.",
    cvTitle: "Semi Senior Software Engineer",
    cvFocus: "Métricas de negocio y ownership de servicios",
    bullets: [
      "Rediseño del flujo de pagos reduciendo los tiempos de respuesta un 35%.",
      "Ownership de microservicios con despliegue continuo en contenedores.",
      "Colaboración directa con diseño y producto para definir especificaciones.",
    ],
    skills: ["Go", "TypeScript", "PostgreSQL", "Docker", "AWS", "Microservicios"],
    docBadge: "Calibrado para Puesto Semi Senior",
  },
  {
    id: "v4",
    tag: "V4",
    label: "Senior",
    kicker: "Liderazgo & Arquitectura",
    summary: "Foco en decisiones de diseño a escala, dirección técnica y visión estratégica.",
    cvTitle: "Senior Engineer & Tech Lead",
    cvFocus: "Arquitectura escalable y dirección de equipo",
    bullets: [
      "Definición de arquitectura y estándares técnicos para un equipo de 8 desarrolladores.",
      "Optimización de infraestructura en la nube con ahorro comprobado del 25%.",
      "Mentoreo técnico y revisión de código asegurando alta disponibilidad.",
    ],
    skills: ["System Design", "Cloud Architecture", "Go / Python", "Kubernetes", "Liderazgo"],
    docBadge: "Calibrado para Puesto Senior",
  },
];

export function VersionTimelineSection() {
  const containerRef = useRef<HTMLDivElement>(null);
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

  return (
    <section
      id="versiones"
      ref={containerRef}
      className="relative min-h-[250vh] border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      {/* Contenedor Sticky: la pantalla se fija mientras scrolleás */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Luz difusa ambiental cálida */}
        <div className="ambient-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />

        {/* Cabecera Concisa */}
        <div className="text-center max-w-xl mx-auto shrink-0 z-10">
          <span className="font-display italic text-lg sm:text-xl text-[var(--accent)] block mb-1">
            Evolución Profesional
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] font-bold tracking-tight">
            Tu perfil crece con tu carrera
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 font-mono">
            Scrolleá para ver cómo se enfoca el CV en cada nivel
          </p>
        </div>

        {/* Centro: Panel de Versionado con V1 Gigante + Hoja de CV interactiva */}
        <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Columna Izquierda: Nivel Actual con V1/V2/V3/V4 Gigante */}
          <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left space-y-4">
            
            {/* Stepper horizontal de versiones */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-mono">
              {levels.map((lvl, idx) => (
                <div
                  key={lvl.id}
                  className={`px-3 py-1 rounded-full border transition-all duration-300 ${
                    activeIdx === idx
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-bold shadow-sm"
                      : activeIdx > idx
                      ? "bg-[var(--green-subtle)] text-[var(--green-text)] border-[var(--green-border)]/60 font-medium"
                      : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-hairline)] opacity-40"
                  }`}
                >
                  {lvl.tag} • {lvl.label}
                </div>
              ))}
            </div>

            {/* Número de Versión GIGANTE */}
            <div className="flex items-baseline justify-center lg:justify-start gap-3">
              <span className="font-display text-7xl sm:text-9xl lg:text-[110px] font-black text-[var(--accent)] leading-none tracking-tighter select-none">
                {current.tag}
              </span>
              <div className="text-left">
                <span className="text-xl sm:text-3xl font-display font-bold text-[var(--text-primary)] block">
                  {current.label}
                </span>
                <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">
                  {current.kicker}
                </span>
              </div>
            </div>

            {/* Bajada simple */}
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto lg:mx-0">
              {current.summary}
            </p>

            {/* Barra de progreso de scroll específica del versionado */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-2">
              <div className="w-32 h-1.5 rounded-full bg-[var(--border-hairline)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {Math.round(progress * 100)}%
              </span>
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
                <span className="text-[10px] font-mono text-zinc-500 font-semibold">
                  1 Página A4
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
                  Experiencia Relevante:
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
                  Habilidades Priorizadas:
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
                <span>Motor Tipográfico Typst</span>
                <TailorButton size={14} strokeWidth={1.3} className="text-[#935f18] opacity-70" />
              </div>

            </div>
          </div>

        </div>

        {/* Indicador inferior de scroll */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] shrink-0 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Versión activa: <strong className="text-[var(--accent)]">{current.tag} ({current.label})</strong></span>
        </div>

      </div>
    </section>
  );
}

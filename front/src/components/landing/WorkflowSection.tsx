"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { TailorButton } from "./TailoringIcons";
import { ScrollReveal } from "./ScrollReveal";

const steps = [
  {
    num: "01",
    kicker: "Paso 01",
    title: "Cargás tu historia",
    desc: "Tu experiencia y proyectos reales una sola vez. Sin formatos rotos ni inventos.",
    badge: "Base Maestra",
    svg: "/svgs/maniqui.svg",
    alt: "Maniquí de sastre",
    dim: { w: 180, h: 495 },
  },
  {
    num: "02",
    kicker: "Paso 02",
    title: "Pegás la vacante",
    desc: "El motor detecta los requisitos clave y prioriza lo más relevante para el puesto.",
    badge: "Calibración",
    svg: "/svgs/centimetro.svg",
    alt: "Cinta métrica",
    dim: { w: 479, h: 280 },
  },
  {
    num: "03",
    kicker: "Paso 03",
    title: "Descargás tu CV",
    desc: "Exactamente 1 página A4 en PDF vectorial de alta calidad, listo para postular.",
    badge: "1 Página Exacta",
    svg: "/svgs/aguja.svg",
    alt: "Aguja enhebrada",
    dim: { w: 406, h: 418 },
  },
];

export function WorkflowSection() {
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

  // Índice activo según scroll (0, 1 o 2)
  const activeIndex = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;

  return (
    <section
      id="metodo"
      ref={containerRef}
      className="relative min-h-[200vh] border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]"
    >
      {/* Contenedor Sticky: la pantalla se clava y el scroll anima el avance */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between items-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Máquina de coser sastre vintage anclada al taller */}
        <div
          className="absolute -right-8 sm:right-0 lg:right-6 -bottom-6 sm:bottom-0 pointer-events-none z-0 select-none opacity-40 sm:opacity-55 drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
          aria-hidden="true"
        >
          <Image
            src="/svgs/maquina.svg"
            alt="Máquina de coser sastre vintage"
            width={529}
            height={349}
            className="w-[280px] sm:w-[360px] md:w-[440px] lg:w-[480px] h-auto"
            priority
          />
        </div>

        {/* Cabecera Concisa */}
        <ScrollReveal direction="up" className="w-full shrink-0">
        <div className="text-center max-w-xl mx-auto shrink-0 z-10">
          <span className="font-display italic text-lg sm:text-xl text-[var(--accent)] block mb-1">
            Flujo de Confección
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] font-bold tracking-tight">
            De tus datos al PDF final
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 font-mono">
            Scrolleá para ver el proceso en 3 pasos
          </p>
        </div>
        </ScrollReveal>

        {/* Centro: Grilla de los 3 Pasos con hilo conector que se enhebra con el scroll */}
        <div className="w-full max-w-6xl mx-auto my-auto relative z-10">
          
          {/* Línea de costura horizontal interactiva (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-8 right-8 h-[2px] -translate-y-1/2 pointer-events-none z-0">
            {/* Riel base tenue */}
            <div className="w-full h-full border-t-2 border-dashed border-[var(--border-hairline)]" />
            
            {/* Hilo dorado que avanza hilvanando con el scroll */}
            <div
              className="absolute top-0 left-0 h-full border-t-2 border-dashed border-[var(--accent)] transition-all duration-75 drop-shadow-[0_0_8px_rgba(212,151,59,0.55)]"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />

            {/* CHICHE: Aguja viajera que cose en tiempo real con puntada oscilante */}
            <div
              className="absolute top-0 -translate-y-1/2 pointer-events-none z-30 transition-all duration-75 ease-out"
              style={{
                left: `${Math.min(99, Math.max(1, progress * 100))}%`,
                transform: `translate(-50%, -50%) translateY(${Math.sin(progress * Math.PI * 8) * 8}px) rotate(${26 + Math.sin(progress * Math.PI * 8) * 18}deg)`,
              }}
            >
              {/* Destello de punta de aguja */}
              <div className="absolute -left-1 -bottom-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] blur-[1px] animate-pulse" />
              <Image
                src="/svgs/aguja.svg"
                alt="Aguja hilvanando"
                width={406}
                height={418}
                className="w-10 h-10 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] filter brightness-110"
              />
            </div>
          </div>

          {/* Tarjetas de pasos en formato grande */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
            {steps.map((step, idx) => {
              const isActive = activeIndex === idx;
              const isPast = activeIndex > idx;

              return (
                <div
                  key={step.num}
                  className={`rounded-2xl p-8 sm:p-10 lg:p-11 min-h-[320px] sm:min-h-[360px] border transition-all duration-500 relative flex flex-col justify-between ${
                    isActive
                      ? "bg-[var(--bg-canvas)] border-[var(--accent)] shadow-2xl shadow-[var(--accent-subtle)] scale-[1.03] opacity-100 ring-1 ring-[var(--accent)]/40"
                      : isPast
                      ? "bg-[var(--bg-canvas)]/70 border-[var(--accent-border)]/60 opacity-80 scale-[0.98]"
                      : "bg-[var(--bg-surface-raised)]/50 border-[var(--border-hairline)] opacity-40 scale-[0.96]"
                  }`}
                >
                  <div>
                    {/* Header: Ilustración de Atelier sastre + Número gigante */}
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-500 relative ${
                          isActive
                            ? "bg-[var(--bg-canvas)] border-2 border-[var(--accent)] shadow-xl shadow-[var(--accent-subtle)] scale-105"
                            : isPast
                            ? "bg-[var(--bg-surface)] border border-[var(--accent-border)]/50 opacity-85"
                            : "bg-[var(--bg-surface)] border border-[var(--border-hairline)] opacity-45"
                        }`}
                      >
                        {/* Halo difuso cálido cuando el paso está activo */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl bg-[var(--accent)]/15 blur-sm pointer-events-none animate-pulse" />
                        )}
                        <Image
                          src={step.svg}
                          alt={step.alt}
                          width={step.dim.w}
                          height={step.dim.h}
                          className={`w-full h-full object-contain relative z-10 transition-transform duration-500 ${
                            isActive
                              ? "scale-105 drop-shadow-[0_6px_14px_rgba(212,151,59,0.35)]"
                              : "filter grayscale-[0.2]"
                          }`}
                        />
                      </div>
                      <span
                        className={`font-display text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter transition-colors select-none ${
                          isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] opacity-35"
                        }`}
                      >
                        {step.num}
                      </span>
                    </div>

                    {/* Título y kicker */}
                    <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold block mb-2">
                      {step.kicker}
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] font-bold mb-3">
                      {step.title}
                    </h3>

                    {/* Descripción simple y directa */}
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </div>

                  {/* Footer del paso con botón sastre animado */}
                  <div className="pt-6 mt-6 border-t border-[var(--border-hairline)] flex items-center justify-between">
                    <span
                      className={`font-mono text-xs uppercase tracking-wider font-semibold transition-colors ${
                        isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {step.badge}
                    </span>
                    <TailorButton
                      size={18}
                      strokeWidth={1.4}
                      className={`transition-all duration-300 ${
                        isActive
                          ? "text-[var(--accent)] opacity-100 scale-125 rotate-45"
                          : isPast
                          ? "text-[var(--accent)] opacity-60"
                          : "text-[var(--text-muted)] opacity-25"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Indicador de progreso de scroll al pie */}
        <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)] shrink-0 z-10">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? "w-8 bg-[var(--accent)]"
                    : activeIndex > idx
                    ? "w-3 bg-[var(--green-text)]"
                    : "w-3 bg-[var(--border-hairline)]"
                }`}
              />
            ))}
          </div>
          <span>
            Paso {activeIndex + 1} de 3
          </span>
        </div>

      </div>
    </section>
  );
}

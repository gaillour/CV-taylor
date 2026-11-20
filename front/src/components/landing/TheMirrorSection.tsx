"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { MirrorCvCard } from "./MirrorCvCard";
import type { MirrorCvData } from "./types";
import { ScrollReveal } from "./ScrollReveal";
import { TextMaskReveal } from "./motion/TextMaskReveal";
import { useMainScrollRef } from "./useMainScrollRef";

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
  const scrollRef = useMainScrollRef();

  const [deltaX, setDeltaX] = useState(420);
  const [manualOverride, setManualOverride] = useState<"es" | "en" | null>(null);
  const [isEnglish, setIsEnglish] = useState(false);
  const [isLanded, setIsLanded] = useState(false);

  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: containerRef,
    offset: ["start 0.82", "center 0.50"],
  });

  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 26,
    mass: 0.3,
  });

  const manualTarget = useSpring(0, { stiffness: 160, damping: 24 });

  useEffect(() => {
    if (manualOverride === "es") manualTarget.set(0);
    if (manualOverride === "en") manualTarget.set(1);
  }, [manualOverride, manualTarget]);

  const activeProgress = manualOverride !== null ? manualTarget : smoothScrollProgress;

  useMotionValueEvent(activeProgress, "change", (latest) => {
    const nextEn = latest >= 0.5;
    const nextLanded = latest >= 0.88;
    if (nextEn !== isEnglish) setIsEnglish(nextEn);
    if (nextLanded !== isLanded) setIsLanded(nextLanded);
  });

  const measureDistance = useCallback(() => {
    if (!slotEsRef.current || !slotEnRef.current) return;
    const esRect = slotEsRef.current.getBoundingClientRect();
    const enRect = slotEnRef.current.getBoundingClientRect();
    const offsetWidth = slotEsRef.current.offsetWidth || esRect.width;
    const currentScale = offsetWidth > 0 ? esRect.width / offsetWidth : 1;
    const exactLocalDistance = (enRect.left - esRect.left) / (currentScale || 1);

    if (exactLocalDistance > 0) {
      setDeltaX(exactLocalDistance);
    }
  }, []);

  useEffect(() => {
    measureDistance();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        measureDistance();
      });
      if (slotEsRef.current) resizeObserver.observe(slotEsRef.current);
      if (slotEnRef.current) resizeObserver.observe(slotEnRef.current);
      if (containerRef.current) resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", measureDistance, { passive: true });
    const timer1 = setTimeout(measureDistance, 60);
    const timer2 = setTimeout(measureDistance, 250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", measureDistance);
    };
  }, [measureDistance]);

  const cardX = useTransform(activeProgress, [0, 1], [0, deltaX]);
  const cardY = useTransform(activeProgress, (p) => -Math.sin(p * Math.PI) * 12);
  const cardScale = useTransform(activeProgress, (p) => 1 + Math.sin(p * Math.PI) * 0.02);

  const haloLeft = useTransform(activeProgress, (p) => `${25 + p * 50}%`);
  const haloScale = useTransform(activeProgress, (p) => 1 + Math.sin(p * Math.PI) * 0.2);
  const haloBg = useMotionTemplate`radial-gradient(circle, ${
    isEnglish ? "var(--green-halo)" : "var(--halo-color)"
  } 0%, transparent 70%)`;

  const toggleLanguage = (target: "es" | "en") => {
    setManualOverride(target);
    manualTarget.set(target === "en" ? 1 : 0);
  };

  return (
    <section
      id="the-mirror"
      ref={containerRef}
      aria-labelledby="mirror-title"
      className="relative overflow-hidden border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-12 sm:gap-14">
        {/* Cabecera Editorial Compacta */}
        <ScrollReveal direction="up" className="w-full shrink-0">
          <div className="text-center max-w-2xl mx-auto shrink-0 z-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--green-text)]">
              02 / The Mirror
            </span>
            <h2
              id="mirror-title"
              className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-5xl lg:text-6xl"
            >
              <TextMaskReveal>Dos idiomas.</TextMaskReveal>{" "}
              <span className="italic text-[var(--text-secondary)]">
                <TextMaskReveal delay={0.08}>Una historia.</TextMaskReveal>
              </span>
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
              El CV cruza el idioma, no los hechos.
            </p>
          </div>
        </ScrollReveal>

        {/* Escenario Central: Dos Docks y CV 3D en Vuelo Horizontal */}
        <div className="w-full flex flex-col items-center justify-center relative">
          {/* Halos de luz rasante que acompañan el viaje del documento */}
          <motion.div
            className="absolute w-72 h-72 sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none -z-10"
            style={{
              background: haloBg,
              left: haloLeft,
              top: "50%",
              x: "-50%",
              y: "-50%",
              scale: haloScale,
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
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  ES · ORIGEN
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">01</span>
              </div>

              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="flex size-16 flex-col items-center justify-center rounded-full border border-dashed border-[var(--accent-border)] bg-[var(--accent-subtle)] sm:size-20">
                  <span className="font-display text-3xl font-medium tracking-tight text-[var(--accent)] sm:text-4xl">
                    ES
                  </span>
                </div>
                <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:text-[11px]">
                  CV maestro
                </span>

                <div className="w-full max-w-[170px] space-y-1.5 mt-3 opacity-30">
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-full" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-4/5 mx-auto" />
                  <div className="h-1.5 bg-[var(--text-muted)] rounded-full w-3/5 mx-auto" />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-[var(--text-muted)]">
                <span>Fuente editable</span>
                <span>A4</span>
              </div>

              {/* LA TARJETA FLOTANTE QUE VIAJA AL DOCK EN */}
              <motion.div
                className="absolute inset-0 w-full h-full z-20 pointer-events-auto"
                style={{
                  x: cardX,
                  y: cardY,
                  scale: cardScale,
                  transformOrigin: "center center",
                }}
              >
                <MirrorCvCard
                  progress={activeProgress}
                  esCv={ES_SAMPLE_CV}
                  enCv={EN_SAMPLE_CV}
                />
              </motion.div>
            </button>

            {/* DOCK DERECHO: EN (CUADRO DE DESTINO) */}
            <motion.button
              ref={slotEnRef}
              type="button"
              aria-label="Ir a la adaptación en inglés"
              onClick={() => toggleLanguage("en")}
              animate={isLanded ? { scale: [1, 1.015, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex w-full max-w-[320px] aspect-[210/297] select-none flex-col justify-between rounded-sm p-4 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-text)] sm:max-w-[350px] sm:p-5 lg:max-w-[380px] ${
                isLanded
                  ? "border-2 border-[var(--green-text)] bg-[var(--green-subtle)] shadow-[0_0_48px_-18px_var(--green-text)]"
                  : "border-2 border-dashed border-[var(--green-border)]/70 bg-[var(--green-subtle)]/25 hover:border-[var(--green-text)]"
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-hairline)]">
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--green-text)] uppercase tracking-wider">
                  EN · DESTINO
                </span>
                <span className="text-[9px] font-mono text-[var(--green-text)] font-semibold">02</span>
              </div>

              <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                <div className="flex size-16 flex-col items-center justify-center rounded-full border border-dashed border-[var(--green-border)] bg-[var(--green-accent)]/30 sm:size-20">
                  <span className="font-display text-3xl font-medium tracking-tight text-[var(--green-text)] sm:text-4xl">
                    EN
                  </span>
                </div>
                <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--green-text)] sm:text-[11px]">
                  CV adaptado
                </span>

                <div className="w-full max-w-[170px] space-y-1.5 mt-3 opacity-40">
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-full" />
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-4/5 mx-auto" />
                  <div className="h-1.5 bg-[var(--green-text)] rounded-full w-3/5 mx-auto" />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-[8px] sm:text-[9px] font-mono">
                <AnimatePresence mode="wait">
                  {isLanded ? (
                    <motion.span
                      key="adapted"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="flex items-center gap-1 font-semibold text-[var(--green-text)]"
                    >
                      <CheckCircle2 aria-hidden="true" className="size-3" /> Adaptado
                    </motion.span>
                  ) : (
                    <motion.span
                      key="adapting"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="text-[var(--text-muted)]"
                    >
                      En espera
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Controles limpios con barra de progreso */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-[var(--text-muted)] shrink-0 z-10">
          <button
            type="button"
            onClick={() => toggleLanguage("es")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              !isEnglish
                ? "text-[var(--text-primary)] font-bold bg-[var(--bg-surface-raised)] border border-[var(--border-hairline)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            ← ES
          </button>
          <span className="text-[var(--border-hairline)]">•</span>
          <span
            role="progressbar"
            aria-label="Progreso de adaptación"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isLanded ? 100 : isEnglish ? 55 : 0}
            className="h-px w-16 overflow-hidden bg-[var(--border-hairline)] sm:w-32"
          >
            <motion.span
              className="mirror-progress-fill block h-full origin-left bg-gradient-to-r from-[var(--accent)] to-[var(--green-text)]"
              style={{ scaleX: activeProgress }}
            />
          </span>
          <span className="text-[var(--border-hairline)]">•</span>
          <button
            type="button"
            onClick={() => toggleLanguage("en")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              isEnglish
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

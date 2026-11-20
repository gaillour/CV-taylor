"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ScrollReveal } from "./ScrollReveal";
import { TextMaskReveal } from "./motion/TextMaskReveal";
import { useMainScrollRef } from "./useMainScrollRef";

interface VersionLevel {
  id: string;
  tag: string;
  label: string;
  kicker: string;
  summary: string;
  milestoneTitle: string;
  milestoneOrg: string;
  milestonePeriod: string;
  milestoneDetail: string;
}

const levels: VersionLevel[] = [
  {
    id: "v1",
    tag: "V1",
    label: "Base",
    kicker: "Archivo maestro",
    summary: "Tu punto de partida: formación, fundamentos y proyectos iniciales.",
    milestoneTitle: "Ingeniería en Informática & Fundamentos",
    milestoneOrg: "Perfil base estructurado",
    milestonePeriod: "Inicio",
    milestoneDetail: "Algoritmos, estructuras de datos, SQL y primeras APIs en Python.",
  },
  {
    id: "v2",
    tag: "V2",
    label: "Junior",
    kicker: "Primeros pasos",
    summary: "Sumás tus primeros proyectos en producción y stack aplicado.",
    milestoneTitle: "Desarrollador Full-Stack",
    milestoneOrg: "Proyecto en producción",
    milestonePeriod: "+1 año",
    milestoneDetail: "App web en React + FastAPI con autenticación, tests y deploy continuo.",
  },
  {
    id: "v3",
    tag: "V3",
    label: "Semi Senior",
    kicker: "Impacto & autonomía",
    summary: "Agregás ownership de servicios, métricas reales y mejora de latencia.",
    milestoneTitle: "Backend Engineer — Aura Pay",
    milestoneOrg: "Servicios críticos",
    milestonePeriod: "+3 años",
    milestoneDetail: "Rediseño del flujo de pagos en Go bajando latencia p99 en un 35%.",
  },
  {
    id: "v4",
    tag: "V4",
    label: "Senior",
    kicker: "Liderazgo & arquitectura",
    summary: "Sumás decisiones de arquitectura, equipo a cargo y ahorro en escala.",
    milestoneTitle: "Tech Lead — Prisma Logistics",
    milestoneOrg: "Arquitectura & equipo",
    milestonePeriod: "+6 años",
    milestoneDetail: "Liderazgo técnico de 8 devs y reducción del 25% en costos cloud anuales.",
  },
];

function VersionChapterItem({
  level,
  index,
  isActive,
  onActivate,
  onSelect,
}: {
  level: VersionLevel;
  index: number;
  isActive: boolean;
  onActivate: (idx: number) => void;
  onSelect: (idx: number) => void;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useMainScrollRef();
  const isInCenter = useInView(itemRef, {
    root: scrollRef,
    margin: "-44% 0px -44% 0px",
  });

  useEffect(() => {
    if (isInCenter) {
      onActivate(index);
    }
  }, [isInCenter, index, onActivate]);

  return (
    <button
      ref={itemRef}
      type="button"
      onClick={() => onSelect(index)}
      aria-pressed={isActive}
      className={`group relative flex min-h-[34vh] w-full flex-col justify-center py-12 pl-7 text-left transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        isActive ? "opacity-100" : "opacity-40 hover:opacity-75"
      }`}
    >
      {isActive ? (
        <motion.span
          layoutId="version-active-rail"
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          aria-hidden="true"
          className="absolute bottom-8 left-0 top-8 w-0.5 bg-[var(--accent)]"
        />
      ) : null}

      <div className="flex items-baseline gap-3.5">
        <span
          className={`font-display text-4xl font-medium leading-none tracking-tight transition-colors sm:text-5xl ${
            isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          }`}
        >
          {level.tag}
        </span>
        <div>
          <span className="block font-display text-2xl font-medium text-[var(--text-primary)]">
            {level.label}
          </span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {level.kicker}
          </span>
        </div>
      </div>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        {level.summary}
      </p>
    </button>
  );
}

export function VersionTimelineSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = levels[activeIdx];
  const accumulated = levels.slice(0, activeIdx + 1).reverse();

  return (
    <section
      id="versiones"
      aria-labelledby="versions-title"
      className="relative border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Cabecera Concisa */}
        <ScrollReveal direction="up" className="mb-14 text-center sm:mb-20">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
            03 / Evolución
          </span>
          <h2
            id="versions-title"
            className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-5xl lg:text-6xl"
          >
            <TextMaskReveal>Distintas versiones</TextMaskReveal>{" "}
            <span className="italic text-[var(--text-secondary)]">
              <TextMaskReveal delay={0.08}>para cada etapa.</TextMaskReveal>
            </span>
          </h2>
        </ScrollReveal>

        {/* Selector Mobile */}
        <div
          className="mb-8 flex items-center justify-center gap-2 lg:hidden"
          role="tablist"
          aria-label="Etapas de carrera"
        >
          {levels.map((lvl, idx) => {
            const isActive = activeIdx === idx;
            return (
              <button
                key={lvl.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveIdx(idx)}
                className={`relative rounded-full px-3.5 py-1.5 font-mono text-xs transition-colors ${
                  isActive
                    ? "font-medium text-[var(--accent-contrast)]"
                    : "border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="version-mobile-pill"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-[var(--accent)]"
                  />
                ) : null}
                <span className="relative z-10">{lvl.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Grid Editorial: Capítulos espaciados (izq) + Trayectoria acumulativa (der) */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Columna Izquierda */}
          <div className="relative hidden border-l border-[var(--border-hairline)] lg:col-span-5 lg:block lg:space-y-4">
            {levels.map((lvl, idx) => (
              <VersionChapterItem
                key={lvl.id}
                level={lvl}
                index={idx}
                isActive={activeIdx === idx}
                onActivate={setActiveIdx}
                onSelect={setActiveIdx}
              />
            ))}
          </div>

          {/* Resumen activo en mobile */}
          <div className="text-center lg:hidden">
            <span className="font-display text-2xl font-medium text-[var(--text-primary)]">
              {current.label}
            </span>
            <span className="ml-2 font-mono text-xs text-[var(--accent)]">
              {current.kicker}
            </span>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-secondary)]">
              {current.summary}
            </p>
          </div>

          {/* Columna Derecha fija: Experiencia que se acumula y pisa fuerte */}
          <div className="lg:col-span-7 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                  Experiencia acumulada en tu perfil
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--accent)]">
                  {accumulated.length} / {levels.length} etapas
                </span>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {accumulated.map((item) => {
                    const isNewest = item.id === current.id;

                    return (
                      <motion.article
                        key={item.id}
                        layout="position"
                        initial={{
                          opacity: 0,
                          y: -24,
                          scale: 0.98,
                        }}
                        animate={{
                          opacity: isNewest ? 1 : 0.48,
                          y: 0,
                          scale: isNewest ? 1 : 0.985,
                        }}
                        exit={{
                          opacity: 0,
                          y: -16,
                          scale: 0.96,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 24,
                          mass: 0.85,
                        }}
                        className={`relative border p-4 transition-colors duration-300 ${
                          isNewest
                            ? "border-[var(--accent-border)] bg-[var(--bg-surface-raised)] shadow-[0_18px_36px_-22px_rgba(0,0,0,0.9)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                        }`}
                      >
                        {isNewest ? (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-0 left-0 top-0 w-0.5 bg-[var(--accent)]"
                          />
                        ) : null}

                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <div className="flex items-baseline gap-2.5">
                            <span
                              className={`font-mono text-[11px] font-medium ${
                                isNewest ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                              }`}
                            >
                              {item.tag}
                            </span>
                            <h3
                              className={`text-sm font-medium ${
                                isNewest ? "text-[var(--text-ivory)]" : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {item.milestoneTitle}
                            </h3>
                          </div>

                          <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                            {item.milestonePeriod}
                          </span>
                        </div>

                        <p
                          className={`text-xs leading-relaxed ${
                            isNewest ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {item.milestoneDetail}
                        </p>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {current.tag}: {current.label}
        </p>
      </div>
    </section>
  );
}

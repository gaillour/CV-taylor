"use client";

import { useRef, useState } from "react";
import { FileCheck2, SearchCheck, Upload } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TextMaskReveal } from "@/components/landing/motion/TextMaskReveal";
import { useMainScrollRef } from "@/components/landing/useMainScrollRef";

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    number: "01",
    label: "Perfil",
    title: "Subí tu CV",
    description: "PDF o TXT. Lo convertimos en un perfil que podés editar.",
    icon: Upload,
  },
  {
    number: "02",
    label: "Enfoque",
    title: "Sumá la oferta",
    description: "Detectamos lo que busca y priorizamos lo que ya hiciste.",
    icon: SearchCheck,
  },
  {
    number: "03",
    label: "Entrega",
    title: "Postulate",
    description: "Descargá un PDF A4, claro y fiel a tu experiencia.",
    icon: FileCheck2,
  },
] as const;

function StepCard({ index, active }: { index: number; active: boolean }) {
  const step = steps[index];
  const Icon = step.icon;

  return (
    <motion.div
      animate={{
        y: active ? -3 : 0,
        opacity: active ? 1 : 0.65,
      }}
      transition={{ duration: 0.35, ease: EDITORIAL_EASE }}
      className={`relative h-full min-h-[230px] border transition-colors duration-300 sm:min-h-[260px] ${
        active
          ? "border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]"
          : "border-[var(--border-hairline)] bg-[var(--bg-surface)]"
      }`}
    >
      <article
        aria-current={active ? "step" : undefined}
        className="relative flex h-full flex-col justify-between p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-[11px] tabular-nums ${
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            {step.number} / {step.label}
          </span>
          <Icon
            aria-hidden="true"
            className={`size-4 transition-colors duration-300 ${
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
            strokeWidth={1.5}
          />
        </div>

        <div className="mt-12 sm:mt-16">
          <h3 className="font-display text-3xl font-medium tracking-[-0.04em] text-[var(--text-ivory)] sm:text-4xl">
            {step.title}
          </h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
            {step.description}
          </p>
        </div>

        <motion.span
          aria-hidden="true"
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
          className="absolute bottom-0 left-0 right-0 h-px origin-left bg-[var(--accent)]"
        />
      </article>
    </motion.div>
  );
}

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useMainScrollRef();
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: sectionRef,
    offset: ["start 0.78", "end 0.58"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.4,
  });

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const next = latest >= 0.92 ? 2 : latest >= 0.46 ? 1 : 0;
    if (next !== activeIndex) {
      setActiveIndex(next);
    }
  });

  return (
    <section
      ref={sectionRef}
      id="metodo"
      aria-labelledby="method-title"
      className="relative overflow-clip border-y border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-12 sm:gap-14">
        <ScrollReveal direction="up" className="w-full text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
            01 / El método
          </p>
          <h2
            id="method-title"
            className="mt-2 font-display text-4xl font-medium tracking-[-0.05em] text-[var(--text-ivory)] sm:text-6xl"
          >
            <TextMaskReveal>Tres pasos.</TextMaskReveal>{" "}
            <span className="italic text-[var(--text-secondary)]">
              <TextMaskReveal delay={0.08}>Tu CV listo.</TextMaskReveal>
            </span>
          </h2>
        </ScrollReveal>

        <div className="relative w-full">
          {/* Desktop: 3 pasos conectados por riel superior con nodos */}
          <div className="relative hidden md:grid md:grid-cols-3 md:gap-4 lg:gap-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-3 h-px bg-[var(--border-hairline)]"
            >
              <motion.div
                className="h-full w-full origin-left bg-[var(--accent)]"
                style={{ scaleX: smoothProgress }}
              />
            </div>

            {steps.map((step, index) => {
              const isActive = activeIndex >= index;
              return (
                <div key={step.number} className="relative pt-8">
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-2 -translate-x-1/2 size-2 rounded-full border transition-colors duration-300 ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                    }`}
                  />
                  <StepCard index={index} active={isActive} />
                </div>
              );
            })}
          </div>

          {/* Mobile: 3 pasos apilados con rail vertical */}
          <div className="relative space-y-4 pl-5 md:hidden">
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1.5 top-2 w-px bg-[var(--border-hairline)]"
            >
              <motion.div
                className="h-full w-full origin-top bg-[var(--accent)]"
                style={{ scaleY: smoothProgress }}
              />
            </div>
            {steps.map((step, index) => (
              <StepCard key={step.number} index={index} active={activeIndex >= index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

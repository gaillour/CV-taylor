"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, FileCheck2, SearchCheck, Upload } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const steps = [
  {
    number: "01",
    label: "PERFIL",
    title: "Subí tu CV",
    description: "PDF o TXT. Lo convertimos en un perfil que podés editar.",
    icon: Upload,
    tone: "amber",
  },
  {
    number: "02",
    label: "ENFOQUE",
    title: "Sumá la oferta",
    description: "Detectamos lo que busca y priorizamos lo que ya hiciste.",
    icon: SearchCheck,
    tone: "paper",
  },
  {
    number: "03",
    label: "ENTREGA",
    title: "Postulate",
    description: "Descargá un PDF A4, claro y fiel a tu experiencia.",
    icon: FileCheck2,
    tone: "green",
  },
] as const;

function StepCard({ index, active }: { index: number; active: boolean }) {
  const step = steps[index];
  const Icon = step.icon;

  return (
    <article
      aria-current={active ? "step" : undefined}
      className={`story-card relative min-h-[245px] border p-6 sm:min-h-[290px] sm:p-8 ${
        active
          ? "translate-y-0 border-[var(--accent-border)] bg-[var(--bg-surface-raised)] opacity-100 shadow-[0_30px_90px_-55px_rgba(225,163,74,0.6)]"
          : "translate-y-3 border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 opacity-55"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`font-mono text-xs tracking-[0.2em] ${step.tone === "green" ? "text-[var(--green-text)]" : "text-[var(--accent)]"}`}>
          {step.number} / {step.label}
        </span>
        <Icon aria-hidden="true" className={`size-5 ${step.tone === "green" ? "text-[var(--green-text)]" : "text-[var(--accent)]"}`} strokeWidth={1.5} />
      </div>
      <div className="mt-12 sm:mt-16">
        <h3 className="font-display text-3xl tracking-[-0.04em] text-[var(--text-ivory)] sm:text-4xl">
          {step.title}
        </h3>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
          {step.description}
        </p>
      </div>
      <span aria-hidden="true" className={`absolute bottom-0 left-0 h-px transition-[width] duration-700 ${active ? "w-full bg-[var(--accent)]" : "w-0 bg-[var(--green-text)]"}`} />
    </article>
  );
}

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    if (!sectionRef.current) return;
    const totalScrollable = sectionRef.current.offsetHeight - window.innerHeight;
    if (totalScrollable <= 0) return;
    const distance = -sectionRef.current.getBoundingClientRect().top;
    setProgress(Math.min(1, Math.max(0, distance / totalScrollable)));
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

  const activeIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  const activeStep = steps[activeIndex];

  return (
    <section
      ref={sectionRef}
      id="metodo"
      aria-labelledby="method-title"
      className="scroll-story relative min-h-[220vh] overflow-clip border-y border-[var(--border-hairline)] bg-[var(--bg-surface)]"
    >
      <div aria-hidden="true" className="story-glow -left-56 top-[18%] opacity-40" />
      <div className="scroll-story-sticky sticky top-0 flex min-h-screen flex-col items-center justify-between px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <ScrollReveal direction="up" className="relative z-10 w-full shrink-0 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">01 / El método</p>
          <h2 id="method-title" className="mt-2 font-display text-4xl font-medium tracking-[-0.05em] text-[var(--text-ivory)] sm:text-6xl">
            Tres pasos.<span className="italic text-[var(--text-secondary)]"> Tu CV listo.</span>
          </h2>
        </ScrollReveal>

        <div className="relative z-10 my-8 w-full max-w-6xl">
          <div className="relative hidden md:grid md:grid-cols-3 md:gap-4 lg:gap-6">
            <div aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-0 h-px bg-[var(--border-hairline)]">
              <span className="block h-full origin-left bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--green-text)]" style={{ transform: `scaleX(${progress})` }} />
            </div>
            {steps.map((step, index) => (
              <div key={step.number} className="pt-8">
                <StepCard index={index} active={activeIndex === index} />
              </div>
            ))}
          </div>

          <div aria-live="polite" className="md:hidden">
            <StepCard index={activeIndex} active />
          </div>
        </div>

        <div className="relative z-10 flex w-full shrink-0 items-center justify-between border-t border-[var(--border-hairline)] pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:max-w-6xl">
          <span>Un perfil · cada búsqueda</span>
          <span className="flex items-center gap-2 text-[var(--text-secondary)]">
            {activeStep.number} / 03
            <ArrowDownRight aria-hidden="true" className="size-4 text-[var(--accent)]" />
          </span>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CvCanvasPreview } from "./CvCanvasPreview";
import { HeroDropzone } from "./HeroDropzone";
import { TextMaskReveal } from "./motion/TextMaskReveal";
import { useMainScrollRef } from "./useMainScrollRef";

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const scrollRef = useMainScrollRef();

  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const cardY = useTransform(scrollYProgress, [0, 1], [0, -34]);
  const cardRotateZ = useTransform(scrollYProgress, [0, 1], [0, -1.2]);

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden border-b border-[var(--border-hairline)] pt-10 pb-16 sm:pt-14 lg:pt-16 lg:pb-24"
    >
      <div className="ambient-glow -top-48 left-[62%] pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-[var(--border-hairline)] to-transparent lg:block"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)] lg:gap-14">
          <div className="space-y-7 text-center lg:py-8 lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EDITORIAL_EASE }}
              className="inline-flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.24em] text-[var(--text-muted)] sm:text-[11px]"
            >
              <span className="h-px w-8 bg-[var(--accent)]" />
              Editor tipográfico de CVs · 1 página A4
              <span className="h-px w-8 bg-[var(--accent)] lg:hidden" />
            </motion.div>

            <h1 className="mx-auto max-w-4xl font-display text-[2.65rem] font-medium leading-[1.04] tracking-[-0.045em] text-[var(--text-ivory)] sm:text-6xl lg:mx-0 lg:text-[4.6rem] xl:text-[5.15rem]">
              <TextMaskReveal delay={0.04} inView={false}>
                Un CV distinto
              </TextMaskReveal>{" "}
              <span className="inline-block text-[var(--accent)]">
                <TextMaskReveal delay={0.14} inView={false}>
                  para cada oportunidad.
                </TextMaskReveal>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22, ease: EDITORIAL_EASE }}
              className="mx-auto max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-8 lg:mx-0"
            >
              Adaptá tu CV a cada oferta sin cambiar tu historia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.3, ease: EDITORIAL_EASE }}
              className="mx-auto max-w-xl pt-1 lg:mx-0"
            >
              <HeroDropzone />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.16, ease: EDITORIAL_EASE }}
            style={{ y: cardY, rotateZ: cardRotateZ }}
            className="relative mx-auto w-full max-w-[460px] lg:max-w-none"
          >
            <div
              className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,var(--halo-color),transparent_68%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative border-y border-[var(--border-hairline)] py-8 sm:border sm:p-8 lg:p-7 xl:p-10">
              <div className="absolute left-0 top-0 h-5 w-px bg-[var(--accent)] sm:left-0 sm:top-0" aria-hidden="true" />
              <div className="absolute right-0 top-0 h-px w-5 bg-[var(--accent)]" aria-hidden="true" />
              <div className="absolute bottom-0 right-0 h-5 w-px bg-[var(--accent)]" aria-hidden="true" />
              <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span>Muestra · CV 01</span>
                <span className="text-[var(--green-text)]">ES / EN</span>
              </div>
              <CvCanvasPreview />
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <span className="text-[var(--accent)]">PDF · A4 · ATS</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

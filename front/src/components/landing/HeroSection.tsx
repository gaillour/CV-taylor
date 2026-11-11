"use client";

import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { CvCanvasPreview } from "./CvCanvasPreview";
import { HeroDropzone } from "./HeroDropzone";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border-hairline)] pt-10 pb-16 sm:pt-14 lg:pt-16 lg:pb-24">
      <div className="ambient-glow -top-48 left-[62%] pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-[var(--border-hairline)] to-transparent lg:block" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)] lg:gap-14">
          <div className="space-y-7 text-center lg:py-8 lg:text-left">
            <div className="hero-enter inline-flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.24em] text-[var(--text-muted)] sm:text-[11px]">
              <span className="h-px w-8 bg-[var(--accent)]" />
              El atelier digital para tu carrera
              <span className="h-px w-8 bg-[var(--accent)] lg:hidden" />
            </div>

            <h1 className="hero-enter hero-enter-delay-1 mx-auto max-w-4xl font-display text-[2.65rem] font-medium leading-[1.04] tracking-[-0.045em] text-[var(--text-ivory)] sm:text-6xl lg:mx-0 lg:text-[4.6rem] xl:text-[5.15rem]">
              Cargá tu carrera una vez. <span className="italic text-[var(--text-secondary)]">Adaptá tu CV en</span>{" "}
              <span className="relative inline-block whitespace-nowrap text-[var(--accent)]">
                15 segundos<span className="hero-underline" aria-hidden="true" />
              </span>.
            </h1>

            <p className="hero-enter hero-enter-delay-2 mx-auto max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-8 lg:mx-0">
              Olvidate de pelear con plantillas rotas de Word. Cargás tu experiencia una sola vez y generás un currículum adaptado a cada puesto, en exactamente 1 página A4 y sin inventar nada.
            </p>

            <div className="hero-enter hero-enter-delay-3 mx-auto max-w-xl pt-1 lg:mx-0">
              <HeroDropzone />
            </div>

            <div className="hero-enter hero-enter-delay-4 mx-auto grid max-w-xl grid-cols-1 gap-3 border-t border-[var(--border-hairline)] pt-5 text-left text-[11px] text-[var(--text-muted)] sm:grid-cols-3 sm:gap-4 lg:mx-0 lg:max-w-none">
              <div className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--green-text)]" /><span>1 página A4 sin desbordes</span></div>
              <div className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--green-text)]" /><span>Fiel a tus datos reales</span></div>
              <div className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 shrink-0 text-[var(--green-text)]" /><span>Privacidad y código abierto</span></div>
            </div>
          </div>

          <div className="hero-enter hero-enter-delay-2 relative mx-auto w-full max-w-[460px] lg:max-w-none">
            <div className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,var(--halo-color),transparent_68%)] blur-2xl" aria-hidden="true" />
            <div className="relative border-y border-[var(--border-hairline)] py-8 sm:border sm:p-8 lg:p-7 xl:p-10">
              <div className="absolute left-0 top-0 h-5 w-px bg-[var(--accent)] sm:left-0 sm:top-0" aria-hidden="true" />
              <div className="absolute right-0 top-0 h-px w-5 bg-[var(--accent)]" aria-hidden="true" />
              <div className="absolute bottom-0 right-0 h-5 w-px bg-[var(--accent)]" aria-hidden="true" />
              <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span>Prueba de confección · Nº 001</span>
                <span className="text-[var(--green-text)]">Documento listo</span>
              </div>
              <CvCanvasPreview />
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <span>Una página. Cada detalle cuenta.</span>
                <span className="text-[var(--accent)]">A4 / ATS</span>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-3 shadow-xl sm:flex lg:-left-8">
              <span className="font-display text-xl italic text-[var(--accent)]">01</span>
              <span className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.13em] text-[var(--text-muted)]">Tu perfil<br />con precisión</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

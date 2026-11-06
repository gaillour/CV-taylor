"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { CvCanvasPreview } from "./CvCanvasPreview";
import {
  TailorScissors,
  SpoolWithThread,
  TailorButton,
} from "./TailoringIcons";

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[var(--border-hairline)] overflow-hidden">
      {/* Luz difusa de fondo cálida */}
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Columna Izquierda: Mensaje & CTA */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">

            {/* Titular Principal */}
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl text-[var(--text-primary)] font-bold leading-[1.05] tracking-tight">
              Cargá tu carrera una vez. Adaptá tu CV en <span className="foil-shimmer italic">15 segundos</span>.
            </h1>

            {/* Bajada */}
            <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-2xl font-normal leading-relaxed mx-auto lg:mx-0">
              Olvidate de pelear con plantillas rotas de Word. Cargás tu experiencia una sola vez y generás un currículum adaptado a cada puesto, en exactamente 1 página A4 y sin inventar nada.
            </p>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/cvs"
                className="btn-accent w-full sm:w-auto px-7 py-3.5 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm font-medium"
              >
                <span>Probar Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <a
                href="#metodo"
                className="btn-secondary w-full sm:w-auto px-6 py-3.5 rounded text-xs uppercase tracking-wider font-display flex items-center justify-center gap-2"
              >
                <span>Ver Cómo Funciona</span>
              </a>
            </div>

            {/* Badges de rigor con verde sastre */}
            <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[var(--text-muted)] font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--green-text)]" />
                <span>1 página A4 sin desbordes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--green-text)]" />
                <span>Fiel a tus datos reales</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--green-text)]" />
                <span>Privacidad y código abierto</span>
              </div>
            </div>

          </div>

          {/* Columna Derecha: El Momento Visual (Hoja Typst) con elementos sastre */}
          <div className="lg:col-span-5 flex justify-center relative">
            {/* Tijeras de sastre flotantes bien visibles */}
            <div
              className="absolute -top-10 -left-4 sm:-left-8 pointer-events-none z-20 text-[var(--accent)] opacity-85 animate-float-gentle select-none rotate-[-12deg] drop-shadow-md"
              title="Tijeras de sastre artesanal"
            >
              <TailorScissors size={84} strokeWidth={1.35} />
            </div>

            {/* Carrete con hilo y aguja flotante bien visibles */}
            <div
              className="absolute -bottom-8 -right-4 sm:-right-8 pointer-events-none z-20 text-[var(--accent)] opacity-85 animate-float-reverse select-none rotate-[8deg] drop-shadow-md"
              title="Carrete e hilo de seda"
            >
              <SpoolWithThread size={70} strokeWidth={1.35} />
            </div>

            {/* Botón sastre nítido en la base */}
            <div
              className="absolute -bottom-4 left-6 pointer-events-none z-20 text-[var(--accent)] opacity-60 select-none rotate-[20deg]"
            >
              <TailorButton size={26} strokeWidth={1.4} />
            </div>

            <CvCanvasPreview />
          </div>

        </div>
      </div>
    </section>
  );
}

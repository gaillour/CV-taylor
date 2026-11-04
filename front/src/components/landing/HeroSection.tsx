"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Terminal } from "lucide-react";
import { CvCanvasPreview } from "./CvCanvasPreview";

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[var(--border-hairline)] overflow-hidden">
      {/* Luz difusa de fondo cálida */}
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Columna Izquierda: Mensaje & CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

            {/* Titular Principal */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[var(--text-primary)] font-bold leading-[1.1] tracking-tight">
              Cargá tu carrera una vez. Adaptá tu CV en <span className="foil-shimmer italic">15 segundos</span>.
            </h1>

            {/* Bajada */}
            <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-2xl font-normal leading-relaxed mx-auto lg:mx-0">
              Olvidate de maquetar a mano en Word o Canva para cada postulación. Compilamos tu trayectoria en Typst con rigor tipográfico suizo, garantía física de 1 página A4 y adaptación con IA sobre tus datos reales.
            </p>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/cvs"
                className="btn-accent w-full sm:w-auto px-7 py-3 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Probar Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <a
                href="#metodo"
                className="btn-secondary w-full sm:w-auto px-6 py-3 rounded text-xs uppercase tracking-wider font-display flex items-center justify-center gap-2"
              >
                <span>Ver Cómo Funciona</span>
              </a>
            </div>

            {/* Badges de rigor técnico */}
            <div className="pt-6 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[var(--text-muted)] font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--tailor-green-text)]" />
                <span>Cero alucinación sobre tu perfil</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--tailor-green-text)]" />
                <span>1 Página A4 estricta sin desbordes</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--accent)]" />
                <span>Self-hostable con Docker</span>
              </div>
            </div>

          </div>

          {/* Columna Derecha: El Momento Visual (Hoja Typst) */}
          <div className="lg:col-span-5 flex justify-center">
            <CvCanvasPreview />
          </div>

        </div>
      </div>
    </section>
  );
}

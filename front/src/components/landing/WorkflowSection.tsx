"use client";

import React from "react";
import { Database, Cpu, FileCheck } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const steps = [
  {
    number: "01",
    title: "El Perfil Maestro",
    badge: "Fuente Única de Verdad",
    description:
      "Cargás tu historial completo, métricas de impacto y stack tecnológico una única vez. El sistema almacena tus hechos reales de forma inmutable.",
    icon: Database,
  },
  {
    number: "02",
    title: "Adaptación Contextual",
    badge: "Gemini Flash • Anti-alucinación",
    description:
      "Pegás la descripción de la vacante. La IA analiza requisitos clave, prioriza tus logros coincidentes y calibra las palabras clave para indexación ATS.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Compilación Typst",
    badge: "1 Página Estricta A4",
    description:
      "El motor Typst renderiza el PDF vectorial final con cálculo tipográfico milimétrico. Nunca más un CV con 3 renglones desbordando a la segunda página.",
    icon: FileCheck,
  },
];

export function WorkflowSection() {
  return (
    <section id="metodo" className="py-20 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera de sección */}
        <ScrollReveal direction="up">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-display italic text-lg sm:text-xl text-[var(--accent)] block mb-1">
              Artesanía & Precisión
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-[var(--text-primary)] font-bold tracking-tight">
              El Flujo en 3 Pasos
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-3">
              Separamos los datos de la maquetación para que adaptar tu currículum no sea una tarea manual repetitiva.
            </p>
          </div>
        </ScrollReveal>

        {/* Grilla de 3 Pasos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={step.number} delayMs={idx * 140} direction="up" className="h-full">
                <div
                  className="h-full p-6 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] relative flex flex-col justify-between hover:border-[var(--border-subtle)] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent)]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-xl font-bold text-[var(--text-muted)]">
                        {step.number}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] block mb-1">
                      {step.badge}
                    </span>
                    
                    <h3 className="font-display text-base text-[var(--text-primary)] font-semibold mb-2">
                      {step.title}
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}

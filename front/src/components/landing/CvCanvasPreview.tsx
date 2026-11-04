"use client";

import React, { useRef, useState, useCallback } from "react";
import { Check, FileCode, Sparkles } from "lucide-react";

export function CvCanvasPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 35,
    active: false,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCoords({ x, y, active: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCoords({ x: 50, y: 35, active: false });
  }, []);

  // Cálculo de rotación 3D sutil y dinámica
  const rotateX = coords.active ? ((50 - coords.y) * 0.18).toFixed(2) : "1.5";
  const rotateY = coords.active ? ((coords.x - 50) * 0.18).toFixed(2) : "-2";

  // Sombra dinámica proyectada según la inclinación
  const shadowX = coords.active ? ((50 - coords.x) * 0.4).toFixed(1) : "0";
  const shadowY = coords.active ? ((coords.y - 30) * 0.5 + 20).toFixed(1) : "25";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[350px] sm:max-w-[370px] mx-auto select-none py-2 cursor-default"
      style={{ perspective: "1200px" }}
    >
      {/* Sello técnico flotante con acento reflectivo */}
      <div className="absolute top-0 right-2 z-30 px-3 py-1 rounded bg-[var(--bg-surface-raised)] border border-[var(--accent-border)] flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-transform duration-300 hover:scale-105">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] font-semibold">
          1 Page Strict • Typst
        </span>
      </div>

      {/* Hoja A4 ATS Rectangular con inclinación física 3D y brillo especular */}
      <div
        className="ats-sheet-canvas relative rounded-sm aspect-[210/297] p-5 sm:p-6 text-left font-sans text-gray-900 border border-gray-200 overflow-hidden flex flex-col justify-between shadow-2xl"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: coords.active ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease",
          boxShadow: `${shadowX}px ${shadowY}px 50px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Capa de brillo especular / reflejo de luz rasante */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20"
          style={{
            opacity: coords.active ? 0.85 : 0.4,
            background: `radial-gradient(circle 320px at ${coords.x}% ${coords.y}%, rgba(255, 255, 255, 0.55), rgba(212, 151, 59, 0.08) 40%, transparent 80%)`,
          }}
        />

        {/* Cabecera del CV */}
        <div className="border-b border-gray-300 pb-2.5 mb-3 text-center relative z-10">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight leading-none mb-1">
            Santiago Rossi
          </h2>
          <p className="text-[9px] text-gray-600 font-mono">
            santiago.rossi@dev.io • Buenos Aires, AR • github.com/santi-dev
          </p>
        </div>

        {/* Resumen Profesional */}
        <div className="mb-3 relative z-10">
          <div className="flex items-center justify-between border-b border-gray-900 pb-0.5 mb-1">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-gray-900">
              Resumen Profesional
            </span>
            <span className="text-[7.5px] font-mono text-gray-500">ATS Indexed</span>
          </div>
          <p className="text-[8.5px] leading-relaxed text-gray-700 text-justify">
            Ingeniero de Software enfocado en arquitecturas distribuidas, baja latencia e inmutabilidad de datos históricos. Experiencia en orquestación cloud y microservicios de alto tráfico.
          </p>
        </div>

        {/* Experiencia Laboral */}
        <div className="mb-3 relative z-10">
          <div className="border-b border-gray-900 pb-0.5 mb-1.5">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-gray-900">
              Experiencia Laboral
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-[8.5px] font-semibold text-gray-900 flex justify-between items-baseline">
                <span>Senior Backend Engineer — TechStream Corp</span>
                <span className="text-gray-500 font-mono text-[8px]">2023 — Presente</span>
              </div>
              <ul className="list-disc ml-3 text-[8px] text-gray-700 space-y-0.5 mt-0.5 leading-tight">
                <li>Diseño y migración de pipelines de ingesta en Go, reduciendo p99 de 180ms a 42ms.</li>
                <li>Implementación de replicación Postgres multi-región con failover automático.</li>
              </ul>
            </div>

            <div>
              <div className="text-[8.5px] font-semibold text-gray-900 flex justify-between items-baseline">
                <span>Full Stack Developer — CloudCore</span>
                <span className="text-gray-500 font-mono text-[8px]">2021 — 2023</span>
              </div>
              <ul className="list-disc ml-3 text-[8px] text-gray-700 space-y-0.5 mt-0.5 leading-tight">
                <li>Construcción de dashboards de observabilidad en Next.js consumiendo FastAPI.</li>
                <li>Automatización de entornos de staging efímeros con Docker y GitHub Actions.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Habilidades & Tecnologías */}
        <div className="relative z-10">
          <div className="border-b border-gray-900 pb-0.5 mb-1">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-gray-900">
              Habilidades Clave
            </span>
          </div>
          <p className="text-[8px] text-gray-700 leading-snug">
            <strong>Lenguajes:</strong> TypeScript, Go, Python, SQL, Rust • <strong>Infraestructura:</strong> Docker, Kubernetes, AWS, Postgres, Redis
          </p>
        </div>

        {/* Footer interno con sello en bajo relieve dorado (Blind deboss) */}
        <div className="mt-auto pt-2 border-t border-gray-200 flex items-center justify-between text-[7.5px] text-gray-500 font-mono relative z-10">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            100% Parsing ATS
          </span>

          {/* Sello de relieve de sastre */}
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-amber-900/15 bg-amber-50/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="font-script text-[11px] text-amber-950 font-bold leading-none">
              Bespoke Press
            </span>
          </div>

          <span className="flex items-center gap-1 text-gray-600">
            <FileCode className="w-2.5 h-2.5" />
            Typst Vectorial
          </span>
        </div>

      </div>
    </div>
  );
}

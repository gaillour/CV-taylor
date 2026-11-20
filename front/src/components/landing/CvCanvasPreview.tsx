"use client";

import React, { useRef, useCallback } from "react";
import { Check, FileCode } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

const SPRING_CONFIG = { stiffness: 220, damping: 26, mass: 0.5 };

export function CvCanvasPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(50);
  const rawY = useMotionValue(35);
  const isHovered = useMotionValue(0);

  const smoothX = useSpring(rawX, SPRING_CONFIG);
  const smoothY = useSpring(rawY, SPRING_CONFIG);
  const smoothHover = useSpring(isHovered, { stiffness: 200, damping: 28 });

  const rotateX = useTransform(smoothY, [0, 100], [9, -9]);
  const rotateY = useTransform(smoothX, [0, 100], [-9, 9]);
  const shadowX = useTransform(smoothX, [0, 100], [20, -20]);
  const shadowY = useTransform(smoothY, [0, 100], [5, 35]);

  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 50px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)`;
  const specularBg = useMotionTemplate`radial-gradient(circle 320px at ${smoothX}% ${smoothY}%, rgba(255, 255, 255, 0.55), rgba(212, 151, 59, 0.08) 40%, transparent 80%)`;
  const specularOpacity = useTransform(smoothHover, [0, 1], [0.4, 0.85]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      rawX.set(((e.clientX - rect.left) / rect.width) * 100);
      rawY.set(((e.clientY - rect.top) / rect.height) * 100);
      isHovered.set(1);
    },
    [rawX, rawY, isHovered]
  );

  const handleMouseLeave = useCallback(() => {
    rawX.set(50);
    rawY.set(35);
    isHovered.set(0);
  }, [rawX, rawY, isHovered]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[350px] sm:max-w-[370px] mx-auto select-none py-2 cursor-default"
      style={{ perspective: "1200px" }}
    >
      {/* Hoja A4 ATS Rectangular con inclinación física 3D y brillo especular */}
      <motion.div
        className="ats-sheet-canvas relative rounded-sm aspect-[210/297] p-5 sm:p-6 text-left font-sans text-gray-900 border border-gray-200 overflow-hidden flex flex-col justify-between shadow-2xl"
        style={{
          rotateX,
          rotateY,
          boxShadow,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Capa de brillo especular / reflejo de luz rasante */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            opacity: specularOpacity,
            background: specularBg,
          }}
        />

        {/* Cabecera del CV */}
        <div className="border-b border-gray-300 pb-2.5 mb-3 text-center relative z-10">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight leading-none mb-1">
            Juan Carlos Pérez
          </h2>
          <p className="text-[8px] sm:text-[8.5px] text-gray-600 font-mono whitespace-nowrap">
            juan.perez@dev.io · Buenos Aires, AR · github.com/jperez
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

        {/* Footer interno sobrio */}
        <div className="mt-auto pt-2 border-t border-gray-200 flex items-center justify-between text-[7.5px] text-gray-500 font-mono relative z-10">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
            100% Parsing ATS
          </span>

          <span className="flex items-center gap-1 text-gray-600">
            <FileCode className="w-2.5 h-2.5" />
            1 página A4 · Typst
          </span>
        </div>
      </motion.div>
    </div>
  );
}

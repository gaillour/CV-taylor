"use client";

import React from "react";
import { Sparkles, Globe2, CheckCircle2 } from "lucide-react";
import type { MirrorCvData } from "./types";

interface MirrorCvCardProps {
  progress: number; // 0 (ES) -> 1 (EN)
  esCv: MirrorCvData;
  enCv: MirrorCvData;
}

export function MirrorCvCard({ progress, esCv, enCv }: MirrorCvCardProps) {
  // Rotación 3D continua de 0° a 180° sincronizada con el scroll
  const rotationY = progress * 180;

  // Sombra dinámica según el giro
  const shadowX = (Math.sin(progress * Math.PI) * 24).toFixed(1);
  const shadowBlur = (30 + Math.sin(progress * Math.PI) * 20).toFixed(0);

  // Brillo especular dinámico que viaja horizontalmente por la hoja durante el giro
  const lightPosition = (progress * 100).toFixed(0);

  return (
    <div
      className="relative w-full h-full select-none"
      style={{ perspective: "1400px" }}
    >
      {/* Contenedor Giratorio 3D */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotationY}deg)`,
          boxShadow: `${shadowX}px 18px ${shadowBlur}px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)`,
        }}
      >
        {/* CARA FRONTAL: ESPAÑOL (BASE) */}
        <div
          className="absolute inset-0 w-full h-full bg-white text-zinc-900 rounded-sm p-4 sm:p-5 flex flex-col justify-between overflow-hidden border border-zinc-200 shadow-md"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Luz especular frontal */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150 z-20"
            style={{
              background: `radial-gradient(circle 350px at ${lightPosition}% 30%, rgba(255, 255, 255, 0.7), rgba(212, 151, 59, 0.08) 45%, transparent 75%)`,
              opacity: Math.max(0, 0.7 - Math.abs(progress - 0.25) * 1.2),
            }}
          />

          {/* Sello de idioma */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-300/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
              {esCv.badge}
            </span>
            <span className="text-[9.5px] font-mono text-zinc-500 flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-[var(--accent)]" />
              Base • Editable
            </span>
          </div>

          {/* Encabezado */}
          <div className="text-center mb-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight leading-none mb-0.5">
              {esCv.name}
            </h3>
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-700 mb-0.5">
              {esCv.title}
            </p>
            <p className="text-[8.5px] text-zinc-500 font-mono">
              {esCv.contact} • {esCv.location}
            </p>
          </div>

          {/* Perfil Profesional */}
          <div className="mb-2">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Resumen Ejecutivo
              </span>
              <span className="text-[7.5px] font-mono text-zinc-500">ATS Primary</span>
            </div>
            <p className="text-[8px] sm:text-[8.5px] leading-relaxed text-zinc-700 text-justify">
              {esCv.summary}
            </p>
          </div>

          {/* Experiencia Laboral */}
          <div className="mb-2 flex-1 overflow-hidden">
            <div className="border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Experiencia Relevante
              </span>
            </div>
            {esCv.experience.map((exp, idx) => (
              <div key={idx} className="space-y-0.5 mb-1.5">
                <div className="flex justify-between items-baseline text-[8.5px]">
                  <span className="font-bold text-zinc-900">{exp.role} — <span className="font-normal text-zinc-700">{exp.company}</span></span>
                  <span className="font-mono text-zinc-500 text-[7.5px]">{exp.period}</span>
                </div>
                <ul className="list-disc list-outside ml-3 space-y-0.5 text-[8px] leading-tight text-zinc-600">
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Competencias Técnicas */}
          <div className="mb-1.5">
            <div className="border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Competencias Clave
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-[7.5px] text-zinc-700 font-mono">
              {esCv.skills.slice(0, 6).map((skill, sIdx) => (
                <span key={sIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Pie Editorial Frontal */}
          <div className="mt-auto pt-1.5 border-t border-zinc-200 flex items-center justify-between text-[7.5px] font-mono text-zinc-500">
            <span className="flex items-center gap-1 text-zinc-700 font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5 text-[var(--accent)]" /> Perfil Base • 1 Hoja A4
            </span>
            <span>Typst Engine • Base</span>
          </div>
        </div>

        {/* CARA DORSAL: INGLÉS (ESPEJO DERIVADO) */}
        <div
          className="absolute inset-0 w-full h-full bg-white text-zinc-900 rounded-sm p-4 sm:p-5 flex flex-col justify-between overflow-hidden border border-zinc-200 shadow-md"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Luz especular reverso */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150 z-20"
            style={{
              background: `radial-gradient(circle 350px at ${100 - Number(lightPosition)}% 30%, rgba(255, 255, 255, 0.7), rgba(212, 151, 59, 0.1) 45%, transparent 75%)`,
              opacity: Math.max(0, 0.7 - Math.abs(progress - 0.75) * 1.2),
            }}
          />

          {/* Sello de idioma inglés */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold uppercase tracking-wider bg-[var(--green-subtle)] text-[#1e3328] border border-[var(--green-border)]">
              <Sparkles className="w-3 h-3 text-[#1e3328]" />
              {enCv.badge}
            </span>
            <span className="text-[9.5px] font-mono text-[#1e3328] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-[#1e3328]" />
              100% Typst Sync
            </span>
          </div>

          {/* Encabezado en Inglés */}
          <div className="text-center mb-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight leading-none mb-0.5">
              {enCv.name}
            </h3>
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-zinc-700 mb-0.5">
              {enCv.title}
            </p>
            <p className="text-[8.5px] text-zinc-500 font-mono">
              {enCv.contact} • {enCv.location}
            </p>
          </div>

          {/* Resumen en Inglés */}
          <div className="mb-2">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Executive Summary
              </span>
              <span className="text-[7.5px] font-mono text-[#1e3328] font-semibold">Native US ATS</span>
            </div>
            <p className="text-[8px] sm:text-[8.5px] leading-relaxed text-zinc-700 text-justify">
              {enCv.summary}
            </p>
          </div>

          {/* Experiencia en Inglés */}
          <div className="mb-2 flex-1 overflow-hidden">
            <div className="border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Work Experience
              </span>
            </div>
            {enCv.experience.map((exp, idx) => (
              <div key={idx} className="space-y-0.5 mb-1.5">
                <div className="flex justify-between items-baseline text-[8.5px]">
                  <span className="font-bold text-zinc-900">{exp.role} — <span className="font-normal text-zinc-700">{exp.company}</span></span>
                  <span className="font-mono text-zinc-500 text-[7.5px]">{exp.period}</span>
                </div>
                <ul className="list-disc list-outside ml-3 space-y-0.5 text-[8px] leading-tight text-zinc-600">
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Competencias Técnicas en Inglés */}
          <div className="mb-1.5">
            <div className="border-b border-zinc-900 pb-0.5 mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-950">
                Core Competencies
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-[7.5px] text-zinc-700 font-mono">
              {enCv.skills.slice(0, 6).map((skill, sIdx) => (
                <span key={sIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Footer de Sincronización Inmutable */}
          <div className="mt-auto pt-1.5 border-t border-zinc-200 flex items-center justify-between text-[7.5px] font-mono text-zinc-500">
            <span className="flex items-center gap-1 text-[var(--tailor-green-text)] font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5" /> Deterministic 1-Page Layout
            </span>
            <span>Typst v0.14 Engine</span>
          </div>

        </div>
      </div>
    </div>
  );
}

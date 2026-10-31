"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCvStore } from "@/store/useCvStore";
import { Target, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function AtsGauge() {
  const lastAts = useCvStore((s) => s.lastAts);
  const evaluatingAts = useCvStore((s) => s.evaluatingAts);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!lastAts) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-xs">
        <Target className="w-3.5 h-3.5" />
        <span>ATS --</span>
      </div>
    );
  }

  const { score, passed, matches, gaps, issues, breakdown } = lastAts;

  let scoreColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  let barColor = "bg-emerald-500";
  if (score < 70) {
    scoreColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
    barColor = "bg-rose-500";
  } else if (score < 85) {
    scoreColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
    barColor = "bg-amber-500";
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition select-none shadow-sm hover:brightness-110 ${scoreColor}`}
        title={`Compatibilidad ATS: ${score}% (Click para desglose)`}
      >
        {evaluatingAts ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : passed ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="font-semibold">ATS {score}%</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 opacity-60 ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        )}
      </button>

      {/* Popover Breakdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-2xl z-50 text-xs text-zinc-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-100">Evaluación ATS Reactiva</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {passed ? "Aprobado (>=85%)" : "Atención requerida"}
            </span>
          </div>

          {/* Sub-scores Breakdown */}
          {breakdown && (
            <div className="space-y-2 mb-4 bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-2.5">
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                Puntaje por Sección
              </span>

              {/* Estructura */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Estructura</span>
                  <span className="font-mono text-zinc-400">{breakdown.structure}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${breakdown.structure}%` }}
                  />
                </div>
              </div>

              {/* Experiencia */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Experiencia & Verbos</span>
                  <span className="font-mono text-zinc-400">{breakdown.experience}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${breakdown.experience}%` }}
                  />
                </div>
              </div>

              {/* Educación */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Educación</span>
                  <span className="font-mono text-zinc-400">{breakdown.education}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${breakdown.education}%` }}
                  />
                </div>
              </div>

              {/* Habilidades & Keywords */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Keywords & Skills</span>
                  <span className="font-mono text-zinc-400">{breakdown.skills}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${breakdown.skills}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Keywords Section (if matches or gaps exist) */}
          {(matches.length > 0 || gaps.length > 0) && (
            <div className="mb-3 space-y-2">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Keywords de la Oferta
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {matches.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono"
                  >
                    ✓ {kw}
                  </span>
                ))}
                {gaps.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono"
                  >
                    ✗ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Issues List */}
          {issues.length > 0 && (
            <div className="space-y-1.5 border-t border-zinc-800/80 pt-2.5">
              <span className="text-[11px] font-medium text-amber-400 block">
                Observaciones ATS ({issues.length})
              </span>
              <ul className="space-y-1 max-h-28 overflow-y-auto text-[11px] text-zinc-400 pr-1">
                {issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500/80 leading-none mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

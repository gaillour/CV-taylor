"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCvStore } from "@/store/useCvStore";
import { Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function AtsGauge() {
  const lastAts = useCvStore((s) => s.lastAts);
  const evaluatingAts = useCvStore((s) => s.evaluatingAts);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-hairline rounded-md text-text-muted text-xs font-mono">
        <Target className="w-3.5 h-3.5" />
        <span>ATS --</span>
      </div>
    );
  }

  const { score, passed, matches, gaps, issues, breakdown } = lastAts;

  const dotColor = score >= 85 ? "bg-green-text" : score >= 70 ? "bg-warning" : "bg-danger";

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono text-text-secondary hover:text-text-primary transition-colors select-none cursor-pointer"
        title={`Compatibilidad ATS: ${score}% (Click para desglose)`}
      >
        {evaluatingAts ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
        )}
        <span className="tabular-nums">ATS {score}%</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 text-text-muted ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 text-text-muted ml-0.5" />
        )}
      </button>

      {/* Popover Breakdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-surface border border-hairline rounded-xl p-4 shadow-lg z-50 text-xs text-text-primary font-mono">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
            <span className="font-medium text-text-ivory text-xs">Evaluación ATS</span>
            <span className="text-[10px] text-text-muted">
              {passed ? "Aprobado (>=85%)" : "Requiere ajuste"}
            </span>
          </div>

          {/* Sub-scores Breakdown */}
          {breakdown && (
            <div className="space-y-2 mb-3 bg-surface-raised/50 border border-hairline rounded-lg p-2.5">
              <span className="text-[10px] text-text-muted block mb-1">
                Puntaje por sección
              </span>

              {/* Estructura */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-secondary">Estructura</span>
                  <span className="tabular-nums text-text-muted">{breakdown.structure}%</span>
                </div>
                <div className="w-full h-1 bg-canvas rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-150"
                    style={{ width: `${breakdown.structure}%` }}
                  />
                </div>
              </div>

              {/* Experiencia */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-secondary">Experiencia</span>
                  <span className="tabular-nums text-text-muted">{breakdown.experience}%</span>
                </div>
                <div className="w-full h-1 bg-canvas rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-150"
                    style={{ width: `${breakdown.experience}%` }}
                  />
                </div>
              </div>

              {/* Educación */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-secondary">Educación</span>
                  <span className="tabular-nums text-text-muted">{breakdown.education}%</span>
                </div>
                <div className="w-full h-1 bg-canvas rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-150"
                    style={{ width: `${breakdown.education}%` }}
                  />
                </div>
              </div>

              {/* Habilidades & Keywords */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-secondary">Keywords</span>
                  <span className="tabular-nums text-text-muted">{breakdown.skills}%</span>
                </div>
                <div className="w-full h-1 bg-canvas rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-150"
                    style={{ width: `${breakdown.skills}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Keywords Section */}
          {(matches.length > 0 || gaps.length > 0) && (
            <div className="mb-3 space-y-1.5">
              <span className="text-[10px] text-text-muted block">
                Keywords analizadas
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {matches.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-raised border border-hairline text-green-text"
                  >
                    ✓ {kw}
                  </span>
                ))}
                {gaps.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-raised border border-hairline text-text-muted"
                  >
                    ✗ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Issues List */}
          {issues.length > 0 && (
            <div className="space-y-1 border-t border-hairline pt-2">
              <span className="text-[10px] text-text-secondary block font-medium">
                Observaciones ({issues.length})
              </span>
              <ul className="space-y-1 max-h-28 overflow-y-auto text-[10px] text-text-muted pr-1">
                {issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-text-muted leading-none mt-0.5">•</span>
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

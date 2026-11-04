"use client";

import React from "react";
import { BufferedTextarea } from "./BufferedFields";

interface SummarySectionProps {
  summary: string;
  onChange: (summary: string, debounceMs?: number) => void;
  isIncluded?: boolean;
  onToggleIncluded?: (included: boolean) => void;
}

export function SummarySection({
  summary,
  onChange,
  isIncluded = true,
  onToggleIncluded,
}: SummarySectionProps) {
  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Resumen Profesional / Perfil ATS</span>
          {onToggleIncluded && (
            <button
              type="button"
              onClick={() => onToggleIncluded(!isIncluded)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
                isIncluded
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isIncluded ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
              <span>{isIncluded ? "Incluido en PDF" : "Oculto en PDF"}</span>
            </button>
          )}
        </div>
        <span className="font-mono">{summary.length} caracteres</span>
      </div>

      {!isIncluded && (
        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Esta sección está excluida del CV y no se renderizará en el PDF. Tu borrador se
          mantiene guardado.
        </p>
      )}

      <BufferedTextarea
        rows={4}
        value={summary}
        onCommit={(val) => onChange(val, 0)}
        placeholder="Escribe tu resumen profesional aquí..."
        className={`w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-xs resize-y focus:outline-none focus:border-emerald-500/50 leading-relaxed transition ${
          !isIncluded ? "opacity-60" : ""
        }`}
      />
    </div>
  );
}

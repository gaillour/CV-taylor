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
      <div className="flex items-center justify-between text-[11px] text-text-secondary">
        <div className="flex items-center gap-2">
          <span>Resumen Profesional / Perfil ATS</span>
          {onToggleIncluded && (
            <button
              type="button"
              onClick={() => onToggleIncluded(!isIncluded)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                isIncluded
                  ? "bg-green-subtle text-green-text border-green-border"
                  : "bg-surface-raised text-text-muted border-hairline hover:text-text-primary"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isIncluded ? "bg-green-text" : "bg-text-muted"
                }`}
              />
              <span>{isIncluded ? "Incluido en PDF" : "Oculto en PDF"}</span>
            </button>
          )}
        </div>
        <span className="font-mono text-text-muted">{summary.length} caracteres</span>
      </div>

      {!isIncluded && (
        <p className="text-[11px] text-warning bg-warning-subtle border border-warning-border rounded-lg px-2.5 py-1.5">
          Esta sección está excluida del CV y no se renderizará en el PDF. Tu borrador se
          mantiene guardado.
        </p>
      )}

      <BufferedTextarea
        rows={4}
        value={summary}
        onCommit={(val) => onChange(val, 0)}
        placeholder="Escribe tu resumen profesional aquí..."
        className={`w-full bg-canvas border border-hairline rounded-lg p-2.5 text-text-primary placeholder:text-text-muted text-xs resize-y focus-ring leading-relaxed transition ${
          !isIncluded ? "opacity-60" : ""
        }`}
      />
    </div>
  );
}

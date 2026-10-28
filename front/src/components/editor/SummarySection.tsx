"use client";

import React from "react";
import { BufferedTextarea } from "./BufferedFields";

interface SummarySectionProps {
  summary: string;
  onChange: (summary: string, debounceMs?: number) => void;
}

export function SummarySection({ summary, onChange }: SummarySectionProps) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>Resumen Profesional / Perfil ATS</span>
        <span className="font-mono">{summary.length} caracteres</span>
      </div>
      <BufferedTextarea
        rows={4}
        value={summary}
        onCommit={(val) => onChange(val, 0)}
        placeholder="Escribe tu resumen profesional aquí..."
        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-xs resize-y focus:outline-none focus:border-emerald-500/50 leading-relaxed"
      />
    </div>
  );
}

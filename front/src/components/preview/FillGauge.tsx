"use client";

import React from "react";
import { FitReport } from "@/types/cv";
import { FileText } from "lucide-react";

interface FillGaugeProps {
  fitReport: FitReport | null;
  loading?: boolean;
}

export function FillGauge({ fitReport, loading }: FillGaugeProps) {
  if (!fitReport) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-white/[0.08] rounded-md text-zinc-500 text-xs font-mono">
        <FileText className="w-3.5 h-3.5" />
        <span>--</span>
      </div>
    );
  }

  const { fill_pct, pages, fits_one_page, underfilled, density } = fitReport;

  // Status mapping: strictly functional, no glowing fills
  let indicatorColor = "bg-zinc-200";
  let statusText = "1 página (calibrado)";
  let dotColor = "bg-emerald-400";

  if (!fits_one_page || pages > 1) {
    indicatorColor = "bg-rose-400";
    statusText = `Desborde (${pages} págs)`;
    dotColor = "bg-rose-400";
  } else if (underfilled) {
    indicatorColor = "bg-amber-400";
    statusText = "Subllenado (<85%)";
    dotColor = "bg-amber-400";
  }

  const clampedWidth = Math.min(Math.max(fill_pct, 0), 100);

  return (
    <div
      className="flex items-center gap-2.5 bg-zinc-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs select-none cursor-help font-mono"
      title={`Llenado: ${fill_pct.toFixed(1)}% | Densidad: d=${density.toFixed(2)} | ${statusText}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="font-medium text-zinc-200 tabular-nums">{fill_pct.toFixed(1)}%</span>
      </div>

      {/* Technical Millimeter Track */}
      <div className="relative w-16 sm:w-20 h-1 bg-zinc-800 rounded-xs overflow-hidden">
        {/* Fill Level */}
        <div
          className={`h-full transition-all duration-150 ${indicatorColor} ${
            loading ? "opacity-50" : "opacity-100"
          }`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>

      <div className="flex items-center text-[10px] text-zinc-400 tabular-nums">
        <span>{pages} {pages === 1 ? "pág" : "págs"}</span>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { FitReport } from "@/types/cv";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";

interface FillGaugeProps {
  fitReport: FitReport | null;
  loading?: boolean;
}

export function FillGauge({ fitReport, loading }: FillGaugeProps) {
  if (!fitReport) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-xs">
        <FileText className="w-3.5 h-3.5 animate-pulse" />
        <span>Sin datos</span>
      </div>
    );
  }

  const { fill_pct, pages, fits_one_page, underfilled, density } = fitReport;

  // Visual status
  let statusColor = "bg-emerald-500 text-emerald-400";
  let statusText = "1 Página (Óptimo)";
  let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;

  if (!fits_one_page || pages > 1) {
    statusColor = "bg-rose-500 text-rose-400";
    statusText = `Desborde (${pages} págs)`;
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  } else if (underfilled) {
    statusColor = "bg-amber-500 text-amber-400";
    statusText = "Subllenado (<85%)";
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }

  const clampedWidth = Math.min(Math.max(fill_pct, 0), 100);

  return (
    <div
      className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs select-none shadow-sm cursor-help"
      title={`Llenado: ${fill_pct.toFixed(1)}% | Densidad: d=${density.toFixed(2)} | ${statusText}`}
    >
      <div className="flex items-center gap-1.5">
        {statusIcon}
        <span className="font-mono font-semibold text-zinc-100">{fill_pct.toFixed(1)}%</span>
      </div>

      {/* Mini Horizontal Gauge Track */}
      <div className="relative w-20 sm:w-24 h-2 bg-zinc-800/90 rounded-full overflow-hidden border border-zinc-700/50">
        {/* Recommended range marker 85% - 96% */}
        <div
          className="absolute inset-y-0 bg-emerald-500/20 pointer-events-none"
          style={{ left: "85%", width: "11%" }}
          title="Rango óptimo (85% - 96%)"
        />

        {/* Fill Level */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${statusColor.split(" ")[0]} ${
            loading ? "opacity-60 animate-pulse" : "opacity-90"
          }`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>

      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
        <span className="font-medium text-zinc-300">{pages} {pages === 1 ? "pág" : "págs"}</span>
      </div>
    </div>
  );
}

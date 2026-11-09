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
      <div className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-hairline rounded-md text-text-muted text-xs font-mono">
        <FileText className="w-3.5 h-3.5" />
        <span>--</span>
      </div>
    );
  }

  const { fill_pct, pages, fits_one_page, underfilled, density } = fitReport;

  // Status mapping: strictly functional, no glowing fills
  let indicatorColor = "bg-green-text";
  let statusText = "1 página (calibrado)";
  let dotColor = "bg-green-text";

  if (!fits_one_page || pages > 1) {
    indicatorColor = "bg-danger";
    statusText = `Desborde (${pages} págs)`;
    dotColor = "bg-danger";
  } else if (underfilled) {
    indicatorColor = "bg-warning";
    statusText = "Subllenado (<85%)";
    dotColor = "bg-warning";
  }

  const clampedWidth = Math.min(Math.max(fill_pct, 0), 100);

  return (
    <div
      className="flex items-center gap-2.5 bg-surface border border-hairline rounded-md px-2.5 py-1 text-xs select-none cursor-help font-mono"
      title={`Llenado: ${fill_pct.toFixed(1)}% | Densidad: d=${density.toFixed(2)} | ${statusText}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="font-medium text-text-primary tabular-nums">{fill_pct.toFixed(1)}%</span>
      </div>

      {/* Technical Millimeter Track */}
      <div className="relative w-16 sm:w-20 h-1 bg-surface-raised rounded-xs overflow-hidden">
        {/* Fill Level */}
        <div
          className={`h-full transition-all duration-150 ${indicatorColor} ${
            loading ? "opacity-50" : "opacity-100"
          }`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>

      <div className="flex items-center text-[10px] text-text-muted tabular-nums">
        <span>{pages} {pages === 1 ? "pág" : "págs"}</span>
      </div>
    </div>
  );
}

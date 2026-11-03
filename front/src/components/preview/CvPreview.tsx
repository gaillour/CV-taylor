"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from "lucide-react";

interface CvPreviewProps {
  svg: string;
  loading?: boolean;
  error?: string | null;
}

// Typst A4 dimensions: 595.28pt x 841.89pt -> 793.7px x 1122.5px in CSS
const A4_WIDTH_PX = 793.7;
const A4_HEIGHT_PX = 1122.5;

export function CvPreview({ svg, loading, error }: CvPreviewProps) {
  const [scale, setScale] = useState<number>(1.0);
  const [showSlowLoading, setShowSlowLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowLoading(true);
    }, 1000);
    return () => {
      clearTimeout(timer);
      setShowSlowLoading(false);
    };
  }, [loading]);

  const zoomIn = () => setScale((s) => Math.min(Number((s + 0.1).toFixed(2)), 1.8));
  const zoomOut = () => setScale((s) => Math.max(Number((s - 0.1).toFixed(2)), 0.5));
  const resetZoom = () => setScale(1.0);

  return (
    <div className="relative flex-1 h-full flex flex-col items-center overflow-hidden bg-[#0c0c0e] rounded-xl border border-white/[0.08]">
      {/* Floating Zoom Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-0.5 bg-zinc-950/90 backdrop-blur-md border border-white/[0.08] rounded-md p-1 shadow-lg text-zinc-300">
        <button
          onClick={zoomOut}
          className="p-1 hover:bg-zinc-800 rounded transition cursor-pointer text-zinc-400 hover:text-zinc-200"
          title="Alejar (-10%)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetZoom}
          className="text-xs font-mono tabular-nums px-2 py-0.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition select-none cursor-pointer"
          title="Restablecer al 100%"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="p-1 hover:bg-zinc-800 rounded transition cursor-pointer text-zinc-400 hover:text-zinc-200"
          title="Acercar (+10%)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-white/[0.08] mx-0.5" />
        <button
          onClick={resetZoom}
          className="p-1 hover:bg-zinc-800 rounded transition text-zinc-400 hover:text-zinc-200 cursor-pointer"
          title="Restablecer tamaño (100%)"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Loading Overlay */}
      {showSlowLoading && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md border border-white/[0.08] text-zinc-300 text-xs font-mono px-2.5 py-1 rounded-md shadow-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          <span>Compilando Typst...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-4 inset-x-8 z-30 flex items-center gap-2 bg-rose-950/90 border border-rose-500/20 text-rose-200 text-xs px-3.5 py-2 rounded-lg shadow-xl font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 w-full overflow-auto p-8">
        {svg ? (
          <div
            style={{
              width: `${Math.round(A4_WIDTH_PX * scale)}px`,
              height: `${Math.round(A4_HEIGHT_PX * scale)}px`,
            }}
            className="relative mx-auto shadow-2xl shadow-black/90 ring-1 ring-white/10 rounded-xs bg-white overflow-hidden transition-all duration-150 ease-out"
          >
            <div
              style={{
                width: "595.28pt",
                height: "841.89pt",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              className="origin-top-left"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs font-mono gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            <p>Generando vista previa...</p>
          </div>
        )}
      </div>
    </div>
  );
}

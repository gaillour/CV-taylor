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
    <div className="relative flex-1 h-full flex flex-col items-center overflow-hidden bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
      {/* Floating Zoom Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg p-1 shadow-lg text-zinc-300">
        <button
          onClick={zoomOut}
          className="p-1.5 hover:bg-zinc-800 rounded transition"
          title="Alejar (-10%)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="text-xs font-mono px-2 py-0.5 hover:bg-zinc-800 rounded text-zinc-300 hover:text-zinc-100 transition select-none"
          title="Restablecer al 100%"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="p-1.5 hover:bg-zinc-800 rounded transition"
          title="Acercar (+10%)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
        <button
          onClick={resetZoom}
          className="p-1.5 hover:bg-zinc-800 rounded transition text-zinc-400 hover:text-zinc-200"
          title="Restablecer tamaño (100%)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Loading Overlay (only shown if compilation takes longer than 1s) */}
      {showSlowLoading && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-lg shadow-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Compilando Typst...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-4 inset-x-12 z-30 flex items-center gap-2 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs px-4 py-2.5 rounded-xl shadow-xl">
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
            className="relative mx-auto shadow-2xl rounded-sm bg-white overflow-hidden transition-all duration-150 ease-out"
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
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-600 mb-2" />
            <p>Cargando previsualización...</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCvStore } from "@/store/useCvStore";
import { Download, Save, CheckCircle2, AlertCircle, X, RotateCcw } from "lucide-react";

interface ToastNotification {
  type: "success" | "error";
  title: string;
  badge?: string;
}

export function ExportActions() {
  const router = useRouter();
  const {
    exportPdf,
    saveSnapshot,
    exportingPdf,
    savingSnapshot,
    renderModel,
    dirty,
    revertDraft,
    draftParentId,
  } = useCvStore();
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const handleDiscard = async () => {
    if (!dirty) return;
    if (
      !window.confirm(
        draftParentId
          ? "¿Descartar los cambios no guardados y volver a la versión original?"
          : "¿Descartar el borrador y volver a la galería?"
      )
    ) {
      return;
    }
    await revertDraft();
    if (!draftParentId) {
      router.replace("/");
    } else {
      showToast({
        type: "success",
        title: "Cambios descartados",
      });
    }
  };

  const showToast = (notification: ToastNotification) => {
    setToast(notification);
    setTimeout(() => {
      setToast((prev) => (prev === notification ? null : prev));
    }, 3000);
  };

  const handleDownloadPdf = async () => {
    if (!renderModel) return;
    try {
      await exportPdf();
      showToast({
        type: "success",
        title: "PDF descargado",
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: err instanceof Error ? err.message : "Error al descargar PDF",
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (!renderModel) return;
    try {
      const result = await saveSnapshot();
      router.replace(`/editor/${result.id}`);
      showToast({
        type: "success",
        title: "Versión guardada",
        badge: `${result.id} · ${result.pdf_sha256.slice(0, 8)}`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: err instanceof Error ? err.message : "Error al guardar versión",
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Discard Unsaved Changes Button */}
        {dirty && (
          <button
            onClick={handleDiscard}
            title={
              draftParentId
                ? "Revertir cambios a la versión guardada"
                : "Descartar borrador y volver a la galería"
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/60 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Descartar</span>
          </button>
        )}

        {/* Minimalist Save Version Button */}
        <button
          onClick={handleSaveSnapshot}
          disabled={savingSnapshot || !renderModel}
          title="Guardar versión inmutable con hash SHA-256"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-zinc-600 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <Save className={`w-3.5 h-3.5 text-zinc-400 ${savingSnapshot ? "animate-pulse" : ""}`} />
          <span>{savingSnapshot ? "Guardando..." : "Guardar"}</span>
        </button>

        {/* Primary Download PDF Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={exportingPdf || !renderModel}
          title="Descargar PDF binario nativo compilado por Typst"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-950/40 disabled:opacity-50"
        >
          <Download className={`w-3.5 h-3.5 ${exportingPdf ? "animate-bounce" : ""}`} />
          <span>{exportingPdf ? "Generando..." : "Descargar PDF"}</span>
        </button>
      </div>

      {/* Floating Linear/Vercel-style Toast Pill */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-zinc-800 bg-zinc-950/90 backdrop-blur-md shadow-2xl text-xs text-zinc-200 transition-all duration-200 ease-out select-none">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}

          <span className="font-medium">{toast.title}</span>

          {toast.badge && (
            <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900/90 px-2 py-0.5 rounded-full border border-zinc-800/80">
              {toast.badge}
            </span>
          )}

          <button
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5 rounded-full hover:bg-zinc-800 transition cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

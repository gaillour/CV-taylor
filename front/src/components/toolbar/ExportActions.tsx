"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCvStore } from "@/store/useCvStore";
import { Download, Save, CheckCircle2, AlertCircle, X, RotateCcw, Loader2 } from "lucide-react";

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
      router.replace("/cvs");
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
      <div className="flex items-center gap-1.5">
        {/* Discard Unsaved Changes Button */}
        {dirty && (
          <button
            onClick={handleDiscard}
            title={
              draftParentId
                ? "Revertir cambios a la versión guardada"
                : "Descartar borrador y volver a la galería"
            }
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900/60 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-300 border border-white/[0.08] rounded-md text-xs font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Descartar</span>
          </button>
        )}

        {/* Minimalist Save Version Button */}
        <button
          onClick={handleSaveSnapshot}
          disabled={savingSnapshot || !renderModel}
          title="Guardar versión inmutable con hash SHA-256"
          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/[0.08] rounded-md text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          {savingSnapshot ? (
            <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
          ) : (
            <Save className="w-3 h-3 text-zinc-400" />
          )}
          <span>{savingSnapshot ? "Guardando..." : "Guardar"}</span>
        </button>

        {/* Primary Download PDF Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={exportingPdf || !renderModel}
          title="Descargar PDF compilado por Typst"
          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          {exportingPdf ? (
            <Loader2 className="w-3 h-3 animate-spin text-zinc-950" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>{exportingPdf ? "Generando..." : "Descargar PDF"}</span>
        </button>
      </div>

      {/* Floating Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/[0.08] bg-zinc-950/95 backdrop-blur-md shadow-2xl text-xs text-zinc-200 transition-all select-none">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}

          <span className="font-mono text-xs">{toast.title}</span>

          {toast.badge && (
            <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/[0.08]">
              {toast.badge}
            </span>
          )}

          <button
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5 rounded hover:bg-zinc-800 transition cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
}

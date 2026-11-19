"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCvStore } from "@/store/useCvStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Download, Save, CheckCircle2, AlertCircle, X, RotateCcw, Loader2 } from "lucide-react";
import { confirmDialog } from "@/store/useConfirmStore";
import { getStoredSession } from "@/lib/supabase";
import { savePendingAction } from "@/lib/draft";
import { detectNewProfileItems, applySelectedItemsToProfile, ProfileDiffResult } from "@/lib/profileDiff";
import { ProfileSyncModal } from "@/components/editor/ProfileSyncModal";

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

  // Sync modal state
  const [pendingDiff, setPendingDiff] = useState<ProfileDiffResult | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);

  const handleDiscard = async () => {
    if (!dirty) return;
    const ok = await confirmDialog({
      title: "¿Descartar cambios?",
      message: draftParentId
        ? "¿Descartar los cambios no guardados y volver a la versión original de este CV?"
        : "¿Descartar el borrador y volver al archivo de versiones?",
      confirmText: "Descartar",
      variant: "warning",
    });
    if (!ok) return;

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

  const performSaveSnapshot = async () => {
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

  const handleSaveSnapshot = async () => {
    if (!renderModel) return;

    // Si el usuario no está autenticado, gatear guardado a la nube
    const hasAuth = Boolean(getStoredSession()?.access_token);
    if (!hasAuth) {
      savePendingAction("save");
      router.push("/login?next=/editor&action=save");
      return;
    }

    try {
      const profileStore = useProfileStore.getState();
      if (!profileStore.initialized) {
        await profileStore.fetchProfile();
      }

      const currentProfile = useProfileStore.getState().profile;
      const diff = detectNewProfileItems(renderModel, currentProfile);

      if (diff.hasNewItems) {
        setPendingDiff(diff);
        setIsSyncModalOpen(true);
        return;
      }

      await performSaveSnapshot();
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: err instanceof Error ? err.message : "Error al verificar cambios de perfil",
      });
    }
  };

  const handleConfirmSync = async (selectedIds: Set<string>) => {
    setSyncSaving(true);
    try {
      const profileStore = useProfileStore.getState();
      const currentProfile = profileStore.profile;
      if (currentProfile && pendingDiff) {
        const updatedProfile = applySelectedItemsToProfile(currentProfile, pendingDiff, selectedIds);
        useProfileStore.setState({ profile: updatedProfile, dirty: true });
        const savedOk = await profileStore.saveProfile();
        if (!savedOk) {
          throw new Error("No se pudo actualizar el Perfil Base en la nube");
        }
      }
      setIsSyncModalOpen(false);
      setPendingDiff(null);
      await performSaveSnapshot();
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: err instanceof Error ? err.message : "Error al sincronizar con el perfil",
      });
    } finally {
      setSyncSaving(false);
    }
  };

  const handleSaveCvOnly = async () => {
    setIsSyncModalOpen(false);
    setPendingDiff(null);
    await performSaveSnapshot();
  };

  const handleCancelSync = () => {
    if (syncSaving) return;
    setIsSyncModalOpen(false);
    setPendingDiff(null);
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
            className="btn-secondary flex items-center gap-1 px-2.5 py-1 text-text-muted hover:text-danger rounded text-xs font-medium transition-colors cursor-pointer"
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
          className="btn-secondary flex items-center gap-1 px-2.5 py-1 text-text-secondary hover:text-text-primary rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {savingSnapshot ? (
            <Loader2 className="w-3 h-3 animate-spin text-text-muted" />
          ) : (
            <Save className="w-3 h-3 text-text-muted" />
          )}
          <span>{savingSnapshot ? "Guardando..." : "Guardar"}</span>
        </button>

        {/* Primary Download PDF Button */}
        <button
          onClick={handleDownloadPdf}
          disabled={exportingPdf || !renderModel}
          title="Descargar PDF compilado por Typst"
          className="btn-accent flex items-center gap-1.5 px-3.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          {exportingPdf ? (
            <Loader2 className="w-3 h-3 animate-spin text-accent-contrast" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>{exportingPdf ? "Generando..." : "Descargar PDF"}</span>
        </button>
      </div>

      {/* Profile Sync Modal */}
      <ProfileSyncModal
        open={isSyncModalOpen}
        diff={pendingDiff}
        saving={syncSaving}
        onConfirmSync={handleConfirmSync}
        onSaveCvOnly={handleSaveCvOnly}
        onCancel={handleCancelSync}
      />

      {/* Floating Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md border border-hairline bg-surface/95 backdrop-blur-md shadow-sm text-xs text-text-primary transition-colors select-none">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-text shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" />
          )}

          <span className="font-mono text-xs">{toast.title}</span>

          {toast.badge && (
            <span className="font-mono text-[10px] text-text-muted bg-surface-raised px-1.5 py-0.5 rounded border border-hairline">
              {toast.badge}
            </span>
          )}

          <button
            onClick={() => setToast(null)}
            className="text-text-muted hover:text-text-primary ml-1 p-0.5 rounded hover:bg-surface-raised transition-colors cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
}

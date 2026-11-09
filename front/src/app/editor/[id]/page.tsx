"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
import { apiFetch } from "@/lib/api";
import { Snapshot } from "@/types/cv";
import { Loader2 } from "lucide-react";
import { confirmDialog } from "@/store/useConfirmStore";
import { EditorView } from "@/components/editor/EditorView";

function EditorContent() {
  const {
    renderModel,
    hydrated,
    draftParentId,
    fetchPreview,
  } = useCvStore();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const handledIdRef = useRef<string | null>(null);

  const handleBackToGallery = async () => {
    if (useCvStore.getState().dirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en este borrador de CV. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (!ok) return;
      useCvStore.getState().discardDraft();
    }
    router.push("/cvs");
  };

  const isCurrentDraftLoaded = renderModel !== null;
  const ready = hydrated && isCurrentDraftLoaded;

  useEffect(() => {
    if (!hydrated) return;

    const state = useCvStore.getState();

    // Handle reload with unsaved changes discarded by the user (F5 confirmed)
    if (typeof window !== "undefined" && sessionStorage.getItem("cv_discard_pending") === "true") {
      sessionStorage.removeItem("cv_discard_pending");
      if (id === "nuevo" || !state.draftParentId) {
        state.discardDraft();
        router.replace("/cvs");
        return;
      }
      apiFetch(`${API_BASE_URL}/api/snapshots/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Snapshot no encontrado");
          return res.json() as Promise<Snapshot>;
        })
        .then((snapshot) => {
          state.loadSnapshotDraft(snapshot);
          fetchPreview();
        })
        .catch(() => {
          state.discardDraft();
          router.replace("/cvs");
        });
      return;
    }

    // If draftParentId changed (e.g. user saved snapshot), silently sync the route
    if (state.draftParentId && state.draftParentId !== id && handledIdRef.current === id) {
      handledIdRef.current = state.draftParentId;
      router.replace(`/editor/${state.draftParentId}`);
      return;
    }

    if (handledIdRef.current === id) return;
    handledIdRef.current = id;

    if (id === "nuevo") {
      if (!state.renderModel) router.replace("/cvs");
      else if (state.draftParentId) router.replace(`/editor/${state.draftParentId}`);
      else fetchPreview();
      return;
    }

    if (state.renderModel && state.draftParentId === id) {
      fetchPreview();
      return;
    }

    const loadSnapshot = () => {
      apiFetch(`${API_BASE_URL}/api/snapshots/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Snapshot no encontrado (${res.status})`);
          return res.json() as Promise<Snapshot>;
        })
        .then((snapshot) => {
          if (handledIdRef.current !== id) return;
          useCvStore.getState().loadSnapshotDraft(snapshot);
          fetchPreview();
        })
        .catch(() => {
          if (handledIdRef.current === id) router.replace("/cvs");
        });
    };

    // Direct URL access to a snapshot that isn't the active draft
    if (state.renderModel && state.dirty) {
      confirmDialog({
        title: "¿Descartar cambios?",
        message: "Tenés cambios sin guardar en el borrador actual. ¿Descartarlos y abrir esta versión?",
        confirmText: "Descartar",
        variant: "warning",
      }).then((ok) => {
        if (!ok) {
          router.replace(`/editor/${state.draftParentId ?? "nuevo"}`);
          return;
        }
        loadSnapshot();
      });
      return;
    }

    loadSnapshot();
  }, [hydrated, id, router, fetchPreview, draftParentId]);

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm gap-2 font-mono">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        Cargando borrador...
      </div>
    );
  }

  return <EditorView isAnonymous={false} onBack={handleBackToGallery} />;
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm gap-2 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          Cargando editor...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}

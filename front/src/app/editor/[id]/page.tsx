"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL, useCvStore } from "@/store/useCvStore";
import { apiFetch } from "@/lib/api";
import { CvPreview } from "@/components/preview/CvPreview";
import { FillGauge } from "@/components/preview/FillGauge";
import { AtsGauge } from "@/components/editor/AtsGauge";
import { CvEditor } from "@/components/editor/CvEditor";
import { ExportActions } from "@/components/toolbar/ExportActions";
import { Snapshot, ThemeName } from "@/types/cv";
import { RefreshCw, Palette, Target, Loader2, Pencil } from "lucide-react";

const DISCARD_PROMPT =
  "Tenés cambios sin guardar en el borrador actual. ¿Descartarlos y abrir esta versión?";

function EditorContent() {
  const {
    renderModel,
    svg,
    fitReport,
    loading,
    error,
    fetchPreview,
    updateModel,
    lastAts,
    lastJobSpec,
    hydrated,
    draftParentId,
    setDraftRole,
  } = useCvStore();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const handledIdRef = useRef<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState("");

  const handleCommitTitle = () => {
    setIsEditingTitle(false);
    const val = titleInputValue.trim();
    if (val && val !== (lastJobSpec?.role || "CV base")) {
      setDraftRole(val);
    }
  };

  // If a model is loaded in memory and we're editing a draft, we're ready
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
        router.replace("/");
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
          router.replace("/");
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
      if (!state.renderModel) router.replace("/");
      else if (state.draftParentId) router.replace(`/editor/${state.draftParentId}`);
      else fetchPreview();
      return;
    }

    if (state.renderModel && state.draftParentId === id) {
      fetchPreview();
      return;
    }

    // Direct URL access to a snapshot that isn't the active draft
    if (state.renderModel && state.dirty && !window.confirm(DISCARD_PROMPT)) {
      router.replace(`/editor/${state.draftParentId ?? "nuevo"}`);
      return;
    }

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
        if (handledIdRef.current === id) router.replace("/");
      });
  }, [hydrated, id, router, fetchPreview, draftParentId]);

  const handleThemeChange = (theme: ThemeName) => {
    updateModel((prev) => ({
      ...prev,
      theme,
    }));
  };

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando borrador...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black text-zinc-100 font-sans select-none overflow-hidden">
      {/* Editor Toolbar */}
      <header className="h-12 shrink-0 border-b border-zinc-800/80 bg-zinc-950/50 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-xs text-zinc-400 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInputValue}
              onChange={(e) => setTitleInputValue(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-zinc-900 border border-emerald-500/70 rounded px-2 py-0.5 text-xs text-zinc-100 font-medium focus:outline-none max-w-[200px]"
              placeholder="Título del CV..."
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInputValue(lastJobSpec?.role || "CV base");
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 font-medium text-zinc-200 hover:text-white transition text-xs truncate cursor-pointer"
              title="Hacé clic para renombrar el título del CV"
            >
              <span className="truncate">{lastJobSpec?.role || "CV base"}</span>
              <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 opacity-60 group-hover:opacity-100 transition shrink-0" />
            </button>
          )}

          {lastJobSpec?.company && (
            <span className="text-zinc-500 truncate">· {lastJobSpec.company}</span>
          )}

          {!draftParentId && (
            <span className="font-mono text-[11px] text-amber-400/80 shrink-0">sin guardar</span>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {/* Active Adaptation / Reactive ATS Gauge */}
          <AtsGauge />

          {/* A4 Fill Gauge Indicator */}
          <FillGauge fitReport={fitReport} loading={loading} />

          {/* Theme Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <Palette className="w-3.5 h-3.5 text-zinc-400 ml-2 mr-1" />
            {(["classic", "modern", "engineering"] as ThemeName[]).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-2.5 py-1 rounded-md capitalize transition ${
                  renderModel?.theme === t
                    ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export Actions: Save Version + Download PDF */}
          <ExportActions />

          <button
            onClick={() => fetchPreview()}
            disabled={loading}
            className="flex items-center justify-center p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50"
            title="Recargar preview desde backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Split Screen Container */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel: Reactive CV Editor */}
        <div className="w-[480px] xl:w-[520px] shrink-0 flex flex-col bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 overflow-y-auto">
          <CvEditor />
        </div>

        {/* Right Panel: Typst Live SVG Canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          <CvPreview svg={svg} loading={loading} error={error} />
        </div>
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          Cargando editor...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}

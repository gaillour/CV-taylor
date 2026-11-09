"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCvStore } from "@/store/useCvStore";
import { CvPreview } from "@/components/preview/CvPreview";
import { FillGauge } from "@/components/preview/FillGauge";
import { AtsGauge } from "@/components/editor/AtsGauge";
import { CvEditor } from "@/components/editor/CvEditor";
import { ExportActions } from "@/components/toolbar/ExportActions";
import { ThemeName, THEMES_REGISTRY } from "@/types/cv";
import { RefreshCw, Palette, Pencil, ArrowLeft, Home } from "lucide-react";
import { confirmDialog } from "@/store/useConfirmStore";
import { TailorModal } from "@/components/tailor/TailorModal";

interface EditorViewProps {
  isAnonymous?: boolean;
  onBack?: () => void;
  externalTailorOpen?: boolean;
  onCloseExternalTailor?: () => void;
}

export function EditorView({
  isAnonymous = false,
  onBack,
  externalTailorOpen = false,
  onCloseExternalTailor,
}: EditorViewProps) {
  const router = useRouter();
  const {
    renderModel,
    svg,
    fitReport,
    loading,
    error,
    fetchPreview,
    updateModel,
    lastJobSpec,
    draftParentId,
    setDraftRole,
    dirty,
    discardDraft,
  } = useCvStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState("");
  const [localTailorOpen, setLocalTailorOpen] = useState(false);

  const isTailorOpen = externalTailorOpen || localTailorOpen;
  const handleCloseTailor = () => {
    setLocalTailorOpen(false);
    onCloseExternalTailor?.();
  };

  // Fix visor de PDF: si hay renderModel pero no hay SVG compilado ni error ni está cargando,
  // disparar fetchPreview inmediatamente para evitar el congelamiento inicial.
  useEffect(() => {
    if (renderModel && !svg && !loading && !error) {
      fetchPreview(renderModel);
    }
  }, [renderModel, svg, loading, error, fetchPreview]);

  const handleCommitTitle = () => {
    setIsEditingTitle(false);
    const val = titleInputValue.trim();
    if (val && val !== (lastJobSpec?.role || "CV base")) {
      setDraftRole(val);
    }
  };

  const handleBack = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBack) {
      onBack();
      return;
    }

    if (dirty) {
      const ok = await confirmDialog({
        title: "¿Descartar cambios?",
        message:
          "Tenés cambios sin guardar en este borrador de CV. ¿Querés salir y descartar las modificaciones?",
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        variant: "warning",
      });
      if (!ok) return;
      discardDraft();
    }

    if (isAnonymous) {
      router.push("/");
    } else {
      router.push("/cvs");
    }
  };

  const handleThemeChange = (theme: ThemeName) => {
    updateModel((prev) => ({
      ...prev,
      theme,
    }));
  };

  const selectedThemeMeta = THEMES_REGISTRY.find((t) => t.id === renderModel?.theme);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-canvas text-text-primary font-sans select-none overflow-hidden">
      {/* Editor Toolbar */}
      <header className="h-12 shrink-0 border-b border-hairline bg-surface/90 backdrop-blur-md px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-xs text-text-secondary min-w-0 font-mono">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-xs font-mono transition-colors mr-2 pr-3 border-r border-hairline cursor-pointer shrink-0"
            title={isAnonymous ? "Volver al inicio" : "Volver a versiones de CVs"}
          >
            {isAnonymous ? (
              <>
                <Home className="w-3.5 h-3.5 text-text-muted hover:text-accent transition-colors" />
                <span className="hidden sm:inline">Inicio</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5 text-text-muted hover:text-accent transition-colors" />
                <span className="hidden sm:inline">CVs</span>
              </>
            )}
          </button>

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
              className="bg-canvas border border-accent-border rounded-md px-2 py-0.5 text-xs text-text-ivory font-mono focus-ring max-w-[200px]"
              placeholder="Título del CV..."
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInputValue(lastJobSpec?.role || "CV base");
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 text-text-ivory hover:text-accent transition-colors text-xs truncate cursor-pointer"
              title="Hacé clic para renombrar el título del CV"
            >
              <span className="truncate">{lastJobSpec?.role || "CV base"}</span>
              <Pencil className="w-3 h-3 text-text-muted group-hover:text-accent opacity-60 group-hover:opacity-100 transition-colors shrink-0" />
            </button>
          )}

          {lastJobSpec?.company && (
            <span className="text-text-muted truncate">· {lastJobSpec.company}</span>
          )}

          {isAnonymous ? (
            <span className="text-[10px] text-accent px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border shrink-0">
              borrador local
            </span>
          ) : !draftParentId ? (
            <span className="text-[10px] text-warning shrink-0">sin guardar</span>
          ) : null}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2.5">
          {/* Active Adaptation / Reactive ATS Gauge */}
          <AtsGauge />

          {/* A4 Fill Gauge Indicator */}
          <FillGauge fitReport={fitReport} loading={loading} />

          {/* Theme Selector */}
          <div className="flex items-center bg-surface border border-hairline rounded-md px-2 py-1 text-xs font-mono">
            <Palette className="w-3.5 h-3.5 text-text-muted mr-1.5 shrink-0" />
            <select
              value={renderModel?.theme || "classic"}
              onChange={(e) => handleThemeChange(e.target.value as ThemeName)}
              className="bg-transparent text-text-primary text-xs font-mono focus:outline-none cursor-pointer"
            >
              <optgroup
                label="── ATS Strict (1 col) ──"
                className="bg-surface text-text-muted font-sans"
              >
                {THEMES_REGISTRY.filter((t) => t.category === "ats").map((t) => (
                  <option key={t.id} value={t.id} className="bg-surface text-text-primary font-mono">
                    {t.label}
                  </option>
                ))}
              </optgroup>
              <optgroup
                label="── Visual / Con Foto ──"
                className="bg-surface text-text-muted font-sans"
              >
                {THEMES_REGISTRY.filter((t) => t.category === "visual").map((t) => (
                  <option key={t.id} value={t.id} className="bg-surface text-text-primary font-mono">
                    {t.label} (Foto)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Export Actions: Save Version + Download PDF */}
          <ExportActions />

          <button
            onClick={() => fetchPreview()}
            disabled={loading}
            className="btn-secondary flex items-center justify-center p-1.5 rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
            title="Recargar preview desde backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
          </button>
        </div>
      </header>

      {/* Notice banner for visual theme without photo */}
      {selectedThemeMeta?.hasPhoto && !renderModel?.contact?.photo_url && (
        <div className="bg-warning-subtle border-b border-warning-border px-6 py-1.5 flex items-center justify-between text-xs text-warning">
          <span className="flex items-center gap-1.5">
            <span>💡</span>
            <span>
              La plantilla <strong>{selectedThemeMeta.label}</strong> destaca con foto de perfil.
              {isAnonymous
                ? " Podés ingresar la URL de tu foto en la sección de contacto."
                : " Podés subir una en tu Perfil para verla en el diseño."}
            </span>
          </span>
          {!isAnonymous && (
            <button
              onClick={() => router.push("/perfil")}
              className="underline text-warning hover:text-text-ivory transition-colors cursor-pointer font-medium text-[11px]"
            >
              Ir a Perfil
            </button>
          )}
        </div>
      )}

      {/* Main Split Screen Container */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel: Reactive CV Editor */}
        <div className="w-[480px] xl:w-[520px] shrink-0 flex flex-col bg-surface border border-hairline rounded-xl p-5 overflow-y-auto">
          <CvEditor />
        </div>

        {/* Right Panel: Typst Live SVG Canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          <CvPreview svg={svg} loading={loading} error={error} />
        </div>
      </main>

      {/* Tailor Modal para acción pendiente o acceso directo */}
      <TailorModal
        isOpen={isTailorOpen}
        onClose={handleCloseTailor}
        onSuccess={() => {
          handleCloseTailor();
          fetchPreview();
        }}
      />
    </div>
  );
}

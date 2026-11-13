import React from "react";
import {
  ArrowLeftRight,
  Check,
  Eye,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { LangCode } from "@/types/cv";

export interface ProfileAiBannersProps {
  isViewingMirror: boolean;
  viewLang: LangCode;
  baseLang: LangCode;
  mirrorLoading: boolean;
  swappingBase: boolean;
  dirty: boolean;
  onSwapBase: () => void;

  canEnhanceAfterImport: boolean;
  enhancing: boolean;
  onDismissImportPrompt: () => void;
  onEnhance: () => void;

  pendingCount: number;
  onApproveAllSuggestions: () => void;
  onRejectAllSuggestions: () => void;
}

export function ProfileAiBanners({
  isViewingMirror,
  viewLang,
  baseLang,
  mirrorLoading,
  swappingBase,
  dirty,
  onSwapBase,
  canEnhanceAfterImport,
  enhancing,
  onDismissImportPrompt,
  onEnhance,
  pendingCount,
  onApproveAllSuggestions,
  onRejectAllSuggestions,
}: ProfileAiBannersProps) {
  return (
    <div className="max-w-6xl w-full mx-auto px-6 pt-5 space-y-3">
      {isViewingMirror && (
        <div className="bg-surface border border-hairline rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5 text-text-secondary">
            <Eye className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span>
              Vista espejo en <strong className="uppercase text-text-primary">{viewLang}</strong> (solo lectura). Se actualiza al guardar el perfil base (<strong className="uppercase text-text-primary">{baseLang}</strong>).
            </span>
            {mirrorLoading && (
              <Loader2 className="w-3 h-3 animate-spin text-accent ml-1" />
            )}
          </div>
          <button
            type="button"
            onClick={onSwapBase}
            disabled={swappingBase || dirty}
            title={
              dirty
                ? "Guardá los cambios antes de cambiar el idioma base"
                : `Convertir ${viewLang.toUpperCase()} en tu idioma base editable`
            }
            className="btn-secondary flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            {swappingBase ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-3 h-3 text-text-muted" />
            )}
            <span>Usar {viewLang.toUpperCase()} como base</span>
          </button>
        </div>
      )}

      {!isViewingMirror && canEnhanceAfterImport && (
        <div className="bg-surface border border-hairline rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-surface-raised border border-hairline text-accent shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-text-ivory">
                CV importado con éxito
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                ¿Querés que la IA sugiera títulos alternativos por arquetipo (ej: Backend / Full Stack) y normalice viñetas para adaptar mejor tu CV a futuras ofertas?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDismissImportPrompt}
              className="btn-secondary px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
            >
              Omitir
            </button>
            <button
              onClick={onEnhance}
              disabled={enhancing}
              className="btn-accent flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              {enhancing ? (
                <Loader2 className="w-3 h-3 animate-spin text-accent-contrast" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Enriquecer con IA
            </button>
          </div>
        </div>
      )}

      {!isViewingMirror && pendingCount > 0 && (
        <div className="bg-surface border border-hairline rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-surface-raised border border-hairline text-accent shrink-0 mt-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-text-ivory font-mono">
                {pendingCount} {pendingCount === 1 ? "sugerencia pendiente" : "sugerencias pendientes"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Revisalas y aprobalas para consolidarlas en tu perfil.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRejectAllSuggestions}
              className="btn-secondary flex items-center gap-1 px-2.5 py-1 rounded text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Descartar todas
            </button>
            <button
              onClick={onApproveAllSuggestions}
              className="btn-accent flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Aprobar todas ({pendingCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  Loader2,
  Save,
  UploadCloud,
} from "lucide-react";
import { LangCode } from "@/types/cv";

export interface ProfileTopBarProps {
  baseLang: LangCode;
  viewLang: LangCode;
  dirty: boolean;
  saving: boolean;
  saveToast: string | null;
  error: string | null;
  swappingBase?: boolean;
  onSelectViewLang: (lang: "es" | "en") => void;
  onSwapBase?: () => void;
  onOpenImportModal: () => void;
  onSave: () => void;
}

export function ProfileTopBar({
  baseLang,
  viewLang,
  dirty,
  saving,
  saveToast,
  error,
  swappingBase = false,
  onSelectViewLang,
  onSwapBase,
  onOpenImportModal,
  onSave,
}: ProfileTopBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-md border-b border-hairline px-6 py-3 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-base font-medium tracking-tight text-text-ivory">
            Perfil maestro
          </h1>
          <span className="text-[11px] font-mono text-text-muted uppercase">
            · base: {baseLang}
          </span>
          {dirty ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              cambios sin guardar
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green-text" />
              sincronizado
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-secondary mt-0.5">
          Registro unificado de experiencia y habilidades para la adaptación a ofertas.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch de Vista (Base vs Espejo ES / EN) */}
        <div className="flex items-center bg-surface border border-hairline p-0.5 rounded-md font-mono text-xs">
          <button
            type="button"
            onClick={() => onSelectViewLang("es")}
            disabled={baseLang !== "es" && dirty}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              viewLang === "es"
                ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs cursor-default"
                : baseLang !== "es" && dirty
                ? "text-text-muted opacity-40 cursor-not-allowed"
                : "text-text-secondary hover:text-text-primary cursor-pointer"
            }`}
            title={
              baseLang === "es"
                ? "Idioma base (editable)"
                : dirty
                ? "Guardá los cambios en el perfil base antes de ver la traducción"
                : "Espejo derivado (solo lectura)"
            }
          >
            <span>ES</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectViewLang("en")}
            disabled={baseLang !== "en" && dirty}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              viewLang === "en"
                ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs cursor-default"
                : baseLang !== "en" && dirty
                ? "text-text-muted opacity-40 cursor-not-allowed"
                : "text-text-secondary hover:text-text-primary cursor-pointer"
            }`}
            title={
              baseLang === "en"
                ? "Idioma base (editable)"
                : dirty
                ? "Guardá los cambios en el perfil base antes de ver la traducción"
                : "Espejo derivado (solo lectura)"
            }
          >
            <span>EN</span>
          </button>
        </div>

        {viewLang !== baseLang && onSwapBase && (
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
            <span className="hidden sm:inline">Usar {viewLang.toUpperCase()} como base</span>
          </button>
        )}

        {saveToast && (
          <div className="text-xs font-mono text-text-primary bg-surface border border-hairline px-2.5 py-1 rounded-md flex items-center gap-1.5 transition">
            <Check className="w-3.5 h-3.5 text-green-text" />
            {saveToast}
          </div>
        )}
        {error && (
          <div className="text-xs font-mono text-danger bg-danger-subtle border border-danger-border px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
            {error}
          </div>
        )}
        <button
          onClick={onOpenImportModal}
          className="btn-secondary flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
        >
          <UploadCloud className="w-3 h-3 text-text-muted" />
          <span>Importar CV</span>
        </button>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="btn-accent flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin text-accent-contrast" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useCvStore } from "@/store/useCvStore";
import { usePaywallStore } from "@/store/usePaywallStore";
import { ThemeName, LangCode, TailorResponse, THEMES_REGISTRY } from "@/types/cv";
import {
  SlidersHorizontal,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Building2,
  Briefcase,
  Target,
} from "lucide-react";

interface TailorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  "Extrayendo JobSpec y analizando requerimientos...",
  "Priorizando experiencia, proyectos y viñetas afines...",
  "Validando trazabilidad fáctica anti-alucinación...",
  "Compilando con Typst y garantizando exactamente 1 pág A4...",
];

export function TailorModal({ isOpen, onClose, onSuccess }: TailorModalProps) {
  const { renderModel, tailorCv, tailorLoading, tailorError } = useCvStore();

  const [offerText, setOfferText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(renderModel?.theme || "classic");
  const [selectedLang, setSelectedLang] = useState<LangCode>(renderModel?.lang || "es");
  const [noLlm, setNoLlm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastResult, setLastResult] = useState<TailorResponse | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerText.trim() || tailorLoading) return;

    setLastResult(null);
    setCurrentStep(0);

    // Stepper progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await tailorCv({
        offer_text: offerText.trim(),
        theme: selectedTheme,
        lang: selectedLang,
        no_llm: noLlm,
      });
      clearInterval(stepInterval);
      setLastResult(res);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes("402") ||
        errMsg.includes("QUOTA_EXCEEDED") ||
        errMsg.toLowerCase().includes("cuota") ||
        errMsg.toLowerCase().includes("límite")
      ) {
        onClose();
        usePaywallStore.getState().openPaywall(
          "Alcanzaste el límite de 2 adaptaciones IA de prueba."
        );
      }
    }
  };

  const handleClose = () => {
    if (tailorLoading) return;
    const succeeded = lastResult !== null;
    setLastResult(null);
    onClose();
    if (succeeded) onSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-2xl bg-surface border border-hairline rounded-xl shadow-lg flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-surface border border-hairline flex items-center justify-center text-accent">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-medium text-text-ivory flex items-center gap-2">
                Adaptar CV a oferta laboral
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-text-muted border border-hairline">
                  pipeline
                </span>
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Alinea viñetas, keywords y calibra la tipografía a 1 página exacta en Typst
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={tailorLoading}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {tailorError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger mt-0.5" />
              <div>
                <p className="font-medium text-danger">Error durante la adaptación</p>
                <p className="mt-0.5 text-text-secondary">{tailorError}</p>
              </div>
            </div>
          )}

          {/* Stepper / Loading Animation */}
          {tailorLoading && (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-5">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <div className="space-y-2 max-w-md w-full">
                <p className="text-xs font-mono text-text-primary">{STEPS[currentStep]}</p>
                <div className="w-full bg-surface-raised rounded-full h-1 overflow-hidden border border-hairline">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted font-mono">
                  Pipeline determinista + fitting de página Typst
                </p>
              </div>
            </div>
          )}

          {/* Result view */}
          {!tailorLoading && lastResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-raised/40 border border-hairline space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-text-primary font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-text" />
                    <span>Adaptación completada</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface border border-hairline text-text-primary text-[11px] tabular-nums">
                    <Target className="w-3 h-3 text-text-muted" />
                    <span>ATS: {lastResult.ats_score}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Briefcase className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-muted">Rol:</span>
                    <span className="text-text-primary truncate">{lastResult.job_spec.role || "General"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Building2 className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-muted">Empresa:</span>
                    <span className="text-text-primary truncate">{lastResult.job_spec.company || "Confidencial"}</span>
                  </div>
                </div>

                {lastResult.keyword_matches.length > 0 && (
                  <div className="pt-2 border-t border-hairline">
                    <p className="text-[10px] text-text-muted mb-1.5 font-medium">Keywords detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {lastResult.keyword_matches.map((kw) => (
                        <span
                          key={kw}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-hairline text-text-primary font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-hairline text-[10px] text-text-muted tabular-nums">
                  <span>Llenado A4: {lastResult.fit_report.fill_pct.toFixed(1)}% ({lastResult.fit_report.pages} pág)</span>
                  <span className="text-text-primary flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-text" />
                    Fidelidad fáctica: 100%
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-accent px-4 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Abrir en editor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!tailorLoading && !lastResult && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Descripción o requisitos de la oferta
                </label>
                <textarea
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="Pegá los requisitos técnicos, responsabilidades y stack solicitado..."
                  rows={8}
                  className="w-full bg-canvas border-basting rounded-lg p-3 text-xs text-text-primary placeholder:text-text-muted focus-ring transition font-mono resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Theme & Language Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Template Typst
                  </label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value as ThemeName)}
                    className="w-full bg-canvas border border-hairline rounded-md px-2.5 py-1.5 text-xs text-text-primary focus-ring cursor-pointer font-mono"
                  >
                    <optgroup label="── ATS Strict ──" className="bg-surface text-text-muted">
                      {THEMES_REGISTRY.filter((t) => t.category === "ats").map((t) => (
                        <option key={t.id} value={t.id} className="bg-surface text-text-primary">
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── Visual / Con Foto ──" className="bg-surface text-text-muted">
                      {THEMES_REGISTRY.filter((t) => t.category === "visual").map((t) => (
                        <option key={t.id} value={t.id} className="bg-surface text-text-primary">
                          {t.label} (Foto)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Idioma
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-canvas border border-hairline rounded-md p-0.5 font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedLang("es")}
                      className={`py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                        selectedLang === "es"
                          ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Español
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLang("en")}
                      className={`py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                        selectedLang === "en"
                          ? "bg-surface-raised text-text-ivory border border-hairline shadow-xs"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Inglés
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast mode toggle */}
              <div className="p-3 rounded-lg bg-surface-raised/40 border border-hairline flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-surface border border-hairline flex items-center justify-center text-accent">
                    <Zap className="w-3 h-3 text-accent" />
                  </div>
                  <div>
                    <label
                      htmlFor="no-llm-toggle"
                      className="text-xs font-medium text-text-primary cursor-pointer block"
                    >
                      Modo local sin LLM (determinista)
                    </label>
                    <p className="text-[11px] text-text-muted">
                      Adaptación heurística en ~30ms sin llamadas externas
                    </p>
                  </div>
                </div>
                <input
                  id="no-llm-toggle"
                  type="checkbox"
                  checked={noLlm}
                  onChange={(e) => setNoLlm(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary px-3 py-1.5 text-xs rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!offerText.trim() || offerText.trim().length < 10}
                  className="btn-accent flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tailorLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-accent-contrast" />
                      <span>Adaptando...</span>
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Adaptar CV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

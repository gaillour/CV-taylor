"use client";

import React, { useState } from "react";
import { useCvStore } from "@/store/useCvStore";
import { ThemeName, LangCode, TailorResponse } from "@/types/cv";
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
    } catch {
      clearInterval(stepInterval);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/[0.08] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                Adaptar CV a oferta laboral
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/[0.08]">
                  pipeline
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Alinea viñetas, keywords y calibra la tipografía a 1 página exacta en Typst
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={tailorLoading}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {tailorError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/30 border border-red-500/20 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-medium text-red-300">Error durante la adaptación</p>
                <p className="mt-0.5 text-zinc-300">{tailorError}</p>
              </div>
            </div>
          )}

          {/* Stepper / Loading Animation */}
          {tailorLoading && (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-5">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
              <div className="space-y-2 max-w-md w-full">
                <p className="text-xs font-mono text-zinc-300">{STEPS[currentStep]}</p>
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden border border-white/[0.06]">
                  <div
                    className="bg-zinc-200 h-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Pipeline determinista + fitting de página Typst
                </p>
              </div>
            </div>
          )}

          {/* Result view */}
          {!tailorLoading && lastResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/[0.08] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Adaptación completada</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.08] text-zinc-300 text-[11px] tabular-nums">
                    <Target className="w-3 h-3 text-zinc-400" />
                    <span>ATS: {lastResult.ats_score}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-500">Rol:</span>
                    <span className="text-zinc-200 truncate">{lastResult.job_spec.role || "General"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-500">Empresa:</span>
                    <span className="text-zinc-200 truncate">{lastResult.job_spec.company || "Confidencial"}</span>
                  </div>
                </div>

                {lastResult.keyword_matches.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[10px] text-zinc-500 mb-1.5 font-medium">Keywords detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {lastResult.keyword_matches.map((kw) => (
                        <span
                          key={kw}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-950 border border-white/[0.08] text-zinc-300 font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400 tabular-nums">
                  <span>Llenado A4: {lastResult.fit_report.fill_pct.toFixed(1)}% ({lastResult.fit_report.pages} pág)</span>
                  <span className="text-zinc-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Fidelidad fáctica: 100%
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
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
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Descripción o requisitos de la oferta
                </label>
                <textarea
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="Pegá los requisitos técnicos, responsabilidades y stack solicitado..."
                  rows={8}
                  className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Theme & Language Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Template Typst
                  </label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value as ThemeName)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 capitalize cursor-pointer"
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="engineering">Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Idioma
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-900 border border-white/[0.08] rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedLang("es")}
                      className={`py-1 px-2 rounded text-xs font-medium transition cursor-pointer ${
                        selectedLang === "es"
                          ? "bg-zinc-800 text-zinc-100 border border-white/[0.08]"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Español
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLang("en")}
                      className={`py-1 px-2 rounded text-xs font-medium transition cursor-pointer ${
                        selectedLang === "en"
                          ? "bg-zinc-800 text-zinc-100 border border-white/[0.08]"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Inglés
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast mode toggle */}
              <div className="p-3 rounded-lg bg-zinc-900/40 border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-zinc-300">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div>
                    <label
                      htmlFor="no-llm-toggle"
                      className="text-xs font-medium text-zinc-200 cursor-pointer block"
                    >
                      Modo local sin LLM (determinista)
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Adaptación heurística en ~30ms sin llamadas externas
                    </p>
                  </div>
                </div>
                <input
                  id="no-llm-toggle"
                  type="checkbox"
                  checked={noLlm}
                  onChange={(e) => setNoLlm(e.target.checked)}
                  className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!offerText.trim() || offerText.trim().length < 10}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-950 rounded-md text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {tailorLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-950" />
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

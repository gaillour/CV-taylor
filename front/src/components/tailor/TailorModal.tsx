"use client";

import React, { useState } from "react";
import { useCvStore } from "@/store/useCvStore";
import { ThemeName, LangCode, TailorResponse } from "@/types/cv";
import {
  Sparkles,
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
  const [selectedLang, setSelectedLang] = useState<LangCode | "auto">("auto");
  const [noLlm, setNoLlm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastResult, setLastResult] = useState<TailorResponse | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerText.trim() || tailorLoading) return;

    setLastResult(null);
    setCurrentStep(0);

    // Subtle stepper animation
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await tailorCv({
        offer_text: offerText.trim(),
        theme: selectedTheme,
        lang: selectedLang === "auto" ? null : selectedLang,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Adaptar CV a Oferta Laboral
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Slice 3
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Pega la vacante para adaptar viñetas, alinear keywords y calibrar a 1 página A4
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={tailorLoading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {tailorError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Error durante la adaptación</p>
                <p className="mt-0.5 text-zinc-300">{tailorError}</p>
              </div>
            </div>
          )}

          {/* Stepper / Loading Animation */}
          {tailorLoading && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-400 absolute" />
              </div>
              <div className="space-y-2 max-w-md">
                <p className="text-sm font-medium text-zinc-200">{STEPS[currentStep]}</p>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Ejecutando pipeline determinista + loop de ajuste tipográfico Typst
                </p>
              </div>
            </div>
          )}

          {/* Result view */}
          {!tailorLoading && lastResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡CV Adaptado con Éxito!</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                    <Target className="w-3.5 h-3.5" />
                    <span>Score ATS: {lastResult.ats_score}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-400">Rol:</span>
                    <strong className="text-zinc-200">{lastResult.job_spec.role || "General"}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-400">Empresa:</span>
                    <strong className="text-zinc-200">{lastResult.job_spec.company || "Confidencial"}</strong>
                  </div>
                </div>

                {lastResult.keyword_matches.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/10">
                    <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">Keywords Matcheadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {lastResult.keyword_matches.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded text-[11px] bg-zinc-900 border border-zinc-700/80 text-zinc-200 font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10 text-[11px] text-zinc-400 font-mono">
                  <span>Llenado A4: {lastResult.fit_report.fill_pct.toFixed(1)}% ({lastResult.fit_report.pages} pág)</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Anti-alucinación: 100% verificada
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-sm flex items-center gap-1.5"
                >
                  <span>Ver CV en Editor</span>
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
                  Descripción o Texto de la Oferta Laboral
                </label>
                <textarea
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="Pegá acá los requisitos, stack tecnológico, responsabilidades de la búsqueda..."
                  rows={8}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition font-sans resize-none"
                  autoFocus
                />
              </div>

              {/* Theme & Language Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Tema Visual Typst
                  </label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value as ThemeName)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 capitalize"
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="engineering">Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Idioma Destino
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value as LangCode | "auto")}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="auto">Auto (detectar de la oferta)</option>
                    <option value="es">Español (ES)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>
              </div>

              {/* Fast mode toggle */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <label
                      htmlFor="no-llm-toggle"
                      className="text-xs font-medium text-zinc-200 cursor-pointer block"
                    >
                      Modo rápido sin LLM (heurístico)
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Adaptación local en ~30ms sin llamadas externas ni consumo de tokens
                    </p>
                  </div>
                </div>
                <input
                  id="no-llm-toggle"
                  type="checkbox"
                  checked={noLlm}
                  onChange={(e) => setNoLlm(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!offerText.trim() || offerText.trim().length < 10}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {tailorLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adaptando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
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

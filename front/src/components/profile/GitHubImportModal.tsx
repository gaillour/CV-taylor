"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  FolderGit2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { importGitHubProject } from "@/lib/api";
import { Entry, EntryTitle, Fact, LangCode, Skill } from "@/types/cv";

interface GitHubImportModalProps {
  isOpen: boolean;
  activeLang?: LangCode;
  onClose: () => void;
  onImport: (entry: Entry, newSkills: Skill[]) => void;
}

export function GitHubImportModal({
  isOpen,
  activeLang = "es",
  onClose,
  onImport,
}: GitHubImportModalProps) {
  const [url, setUrl] = useState("");
  const [lang, setLang] = useState<LangCode>(activeLang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<"input" | "preview">("input");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [titleText, setTitleText] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleReset = () => {
    setUrl("");
    setError(null);
    setLoading(false);
    setStage("input");
    setEntry(null);
    setTitleText("");
    setSkills([]);
    setSelectedSkillIds(new Set());
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Ingresá una URL de repositorio de GitHub válida.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await importGitHubProject(url.trim(), lang);
      setEntry(res.entry);
      const primaryTitle = res.entry.titles?.[0]?.title || "Autor y Desarrollador";
      setTitleText(primaryTitle);
      setSkills(res.suggested_skills || []);
      setSelectedSkillIds(new Set((res.suggested_skills || []).map((s) => s.id)));
      setStage("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con GitHub";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleUpdateFactText = (idx: number, text: string) => {
    if (!entry) return;
    const newFacts = [...entry.facts];
    if (newFacts[idx]) {
      newFacts[idx] = { ...newFacts[idx], text };
      setEntry({ ...entry, facts: newFacts });
    }
  };

  const handleRemoveFact = (idx: number) => {
    if (!entry) return;
    const newFacts = entry.facts.filter((_, i) => i !== idx);
    setEntry({ ...entry, facts: newFacts });
  };

  const handleAddFact = () => {
    if (!entry) return;
    const newFact: Fact = {
      id: `fact_${Date.now()}`,
      entry_id: entry.id,
      text: "",
      position: entry.facts.length,
      weight: 100,
      source: "user",
      approved: true,
      tags: ["project", "github"],
      skill_ids: [],
    };
    setEntry({ ...entry, facts: [...entry.facts, newFact] });
  };

  const handleConfirmSave = () => {
    if (!entry) return;

    // Filter skills by user selection
    const confirmedSkills = skills.filter((s) => selectedSkillIds.has(s.id));
    const confirmedSkillIds = confirmedSkills.map((s) => s.id);

    // Update entry titles with primaryTitle
    const updatedTitles: EntryTitle[] = [
      {
        id: entry.titles[0]?.id || `title_${Date.now()}`,
        entry_id: entry.id,
        title: titleText.trim() || "Autor y Desarrollador",
        is_default: true,
        source: "user",
        approved: true,
      },
    ];

    const finalEntry: Entry = {
      ...entry,
      titles: updatedTitles,
      skill_ids: confirmedSkillIds,
    };

    onImport(finalEntry, confirmedSkills);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-2xl bg-surface border border-hairline rounded-xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-hairline shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-hairline flex items-center justify-center text-text-ivory">
              <FolderGit2 className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-sm font-medium text-text-ivory">
                Importar proyecto desde GitHub
              </h2>
              <p className="text-xs text-text-secondary">
                {stage === "input"
                  ? "Sintetizá un proyecto de tu perfil pegando el link público del repositorio."
                  : "Revisá y personalizá los datos del proyecto antes de guardarlo en tu perfil."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-lg flex items-start gap-2.5 text-danger text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* STAGE 1: URL & Options */}
        {stage === "input" && (
          <form onSubmit={handleAnalyze} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary block">
                URL del repositorio o atajo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/usuario/mi-proyecto o usuario/mi-proyecto"
                  disabled={loading}
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-50 font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-text-muted">
                Solo repositorios públicos. Se leerá metadata, tags, dependencias y fragmento inicial del README.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary block">
                Idioma objetivo de la síntesis
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="radio"
                    name="github-lang"
                    value="es"
                    checked={lang === "es"}
                    onChange={() => setLang("es")}
                    className="accent-accent"
                  />
                  <span>Español (ES)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="radio"
                    name="github-lang"
                    value="en"
                    checked={lang === "en"}
                    onChange={() => setLang("en")}
                    className="accent-accent"
                  />
                  <span>Inglés (EN)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline/60">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="btn-accent flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analizando repositorio...</span>
                  </>
                ) : (
                  <>
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Analizar repositorio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STAGE 2: Preview & Editing */}
        {stage === "preview" && entry && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={entry.org}
                  onChange={(e) => setEntry({ ...entry, org: e.target.value })}
                  className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary">
                  Rol sugerido
                </label>
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary">
                  Fecha Inicio (YYYY-MM)
                </label>
                <input
                  type="text"
                  value={entry.start_date}
                  onChange={(e) => setEntry({ ...entry, start_date: e.target.value })}
                  className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-secondary">
                  Fecha Fin / Último Push
                </label>
                <input
                  type="text"
                  value={entry.end_date || ""}
                  onChange={(e) => setEntry({ ...entry, end_date: e.target.value })}
                  className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary">
                Enlace al Repositorio
              </label>
              <input
                type="text"
                value={entry.link || ""}
                onChange={(e) => setEntry({ ...entry, link: e.target.value })}
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary">
                Contexto / Resumen breve
              </label>
              <textarea
                rows={2}
                value={entry.context || ""}
                onChange={(e) => setEntry({ ...entry, context: e.target.value })}
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring font-mono"
              />
            </div>

            {/* Bullets */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">
                  Viñetas de Logro / Impacto ({entry.facts.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddFact}
                  className="btn-secondary flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Agregar viñeta
                </button>
              </div>

              <div className="space-y-2">
                {entry.facts.map((fact, idx) => (
                  <div key={fact.id || idx} className="flex items-start gap-2">
                    <span className="text-xs text-text-muted mt-2 font-mono select-none shrink-0">
                      •
                    </span>
                    <textarea
                      rows={2}
                      value={fact.text}
                      onChange={(e) => handleUpdateFactText(idx, e.target.value)}
                      className="flex-1 bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus-ring"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFact(idx)}
                      className="text-text-muted hover:text-danger p-1 rounded hover:bg-danger-subtle transition-colors cursor-pointer shrink-0 mt-1"
                      title="Eliminar viñeta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-hairline/60">
                <label className="text-xs font-medium text-text-secondary block">
                  Skills y Tecnologías detectadas (hacé click para incluir o excluir):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => {
                    const isSelected = selectedSkillIds.has(skill.id);
                    return (
                      <button
                        type="button"
                        key={skill.id}
                        onClick={() => handleToggleSkill(skill.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-accent/10 border-accent/40 text-accent"
                            : "bg-surface-raised border-hairline text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{skill.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline/60 shrink-0">
              <button
                type="button"
                onClick={() => setStage("input")}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              >
                Volver a ingresar URL
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="btn-accent px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Guardar en mi perfil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

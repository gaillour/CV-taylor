"use client";

import React, { useState } from "react";
import { RenderEntry, RenderBullet, Entry } from "@/types/cv";
import { useProfileStore } from "@/store/useProfileStore";
import { useCvStore } from "@/store/useCvStore";
import { BulletList } from "./BulletList";
import { BufferedInput } from "./BufferedFields";
import {
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Briefcase,
  FileCode2,
  X,
} from "lucide-react";

interface ExperienceSectionProps {
  entries: RenderEntry[];
  onChange: (entries: RenderEntry[], debounceMs?: number) => void;
}

function createExperienceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `exp_${crypto.randomUUID()}`;
  }
  return `exp_${Date.now()}`;
}

export function ExperienceSection({ entries, onChange }: ExperienceSectionProps) {
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profile = useProfileStore((s) => s.profile);
  const mirror = useProfileStore((s) => s.mirror);
  const loadMirror = useProfileStore((s) => s.loadMirror);
  const cvLang = (useCvStore((s) => s.renderModel?.lang) as "es" | "en") || "es";
  const [importLang, setImportLang] = useState<"es" | "en">(cvLang);

  const sourceProfile =
    profile && importLang !== profile.base_lang ? mirror || profile : profile;

  const availableProfileExperiences = (sourceProfile?.entries || []).filter(
    (e): e is Entry => e.kind === "experience" || (e.kind as string) === "work"
  );

  const toggleCollapse = (id: string) => {
    setCollapsedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenModal = () => {
    setImportLang(cvLang);
    if (profile && cvLang !== profile.base_lang && !mirror) {
      loadMirror();
    }
    setIsModalOpen(true);
  };

  const handleSelectImportLang = (lang: "es" | "en") => {
    setImportLang(lang);
    if (profile && lang !== profile.base_lang && !mirror) {
      loadMirror();
    }
  };

  const handleToggleEntry = (index: number) => {
    const updated = entries.map((e, i) =>
      i === index ? { ...e, selected: e.selected === false ? true : false } : e
    );
    onChange(updated, 0);
  };

  const handleFieldChange = (
    index: number,
    field: keyof Pick<RenderEntry, "title" | "org" | "date_label" | "location">,
    value: string
  ) => {
    const updated = entries.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    onChange(updated, 150);
  };

  const handleBulletsChange = (index: number, bullets: RenderBullet[], debounceMs: number = 0) => {
    const updated = entries.map((e, i) => (i === index ? { ...e, bullets } : e));
    onChange(updated, debounceMs);
  };

  const handleDelete = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    onChange(updated, 0);
  };

  const handleMoveEntry = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    const updated = [...entries];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated, 0);
  };

  const scrollToNewExperience = (id: string) => {
    setCollapsedEntries((prev) => ({ ...prev, [id]: false }));
    setTimeout(() => {
      const el = document.getElementById(`editor-experience-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  const handleAddFromProfile = (exp: Entry) => {
    const title =
      exp.titles?.find((t) => t.is_default)?.title ||
      exp.titles?.[0]?.title ||
      exp.org ||
      "Puesto";

    const dateLabel = exp.end_date
      ? `${exp.start_date} - ${exp.end_date}`
      : exp.start_date
      ? `${exp.start_date} - Presente`
      : "";

    const bullets: RenderBullet[] = (exp.facts || []).map((f, i) => ({
      text: f.text,
      selected: true,
      priority: f.weight || 100,
      pinned: f.pinned || false,
      position: f.position ?? (i + 1),
      fact_ids: [f.id],
      skill_ids: f.skill_ids || [],
      suggested_alternatives: [],
    }));

    const newId = createExperienceId();
    const newEntry: RenderEntry = {
      entry_id: newId,
      title,
      org: exp.org,
      date_label: dateLabel,
      location: exp.location || "",
      selected: true,
      min_bullets: exp.min_bullets || 1,
      max_bullets: exp.max_bullets || 4,
      bullets:
        bullets.length > 0
          ? bullets
          : [
              {
                text: "Logro o responsabilidad principal en este puesto...",
                selected: true,
                priority: 100,
                pinned: false,
                position: 1,
                fact_ids: [],
                skill_ids: [],
                suggested_alternatives: [],
              },
            ],
    };

    onChange([...entries, newEntry], 0);
    setIsModalOpen(false);
    scrollToNewExperience(newId);
  };

  const handleAddBlank = () => {
    const newId = createExperienceId();
    const newEntry: RenderEntry = {
      entry_id: newId,
      title: "Nuevo Puesto / Cargo",
      org: "Empresa / Organización",
      date_label: "2024 - Presente",
      location: "Remoto / Ciudad",
      selected: true,
      min_bullets: 1,
      max_bullets: 4,
      bullets: [
        {
          text: "Logro o responsabilidad principal en este puesto...",
          selected: true,
          priority: 100,
          pinned: false,
          position: 1,
          fact_ids: [],
          skill_ids: [],
          suggested_alternatives: [],
        },
      ],
    };
    onChange([...entries, newEntry], 0);
    setIsModalOpen(false);
    scrollToNewExperience(newId);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Cabecera de la sección */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span>
          Experiencias ({entries.filter((e) => e.selected !== false).length}/{entries.length} activas)
        </span>
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-[11px] font-medium transition cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Agregar experiencia</span>
        </button>
      </div>

      {/* Modal de Importación de Experiencias */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Agregar Experiencia Laboral
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Insertá una experiencia desde tu perfil o creá un puesto personalizado para este CV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Idioma */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Idioma de origen</span>
                <span className="text-[10px] text-zinc-400">
                  CV configurado en: <strong className="uppercase text-zinc-300">{cvLang}</strong>
                </span>
              </div>
              <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSelectImportLang("es")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    importLang === "es"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ES
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectImportLang("en")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    importLang === "en"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Bloques desde el Perfil */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Experiencias en tu Perfil ({availableProfileExperiences.length})
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableProfileExperiences.map((exp) => {
                  const expTitle =
                    exp.titles?.find((t) => t.is_default)?.title ||
                    exp.titles?.[0]?.title ||
                    exp.org;
                  const alreadyInCv = entries.some(
                    (e) => e.title.toLowerCase() === expTitle.toLowerCase() || e.org === exp.org
                  );

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <p className="font-medium text-xs text-zinc-200 truncate">{expTitle}</p>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                            {importLang}
                          </span>
                          {alreadyInCv && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              En CV
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {exp.org} {exp.location ? `· ${exp.location}` : ""} · {exp.facts?.length || 0} viñetas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFromProfile(exp)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shrink-0"
                      >
                        + Insertar ({importLang.toUpperCase()})
                      </button>
                    </div>
                  );
                })}

                {availableProfileExperiences.length === 0 && (
                  <div className="text-center py-5 border border-dashed border-zinc-800/80 rounded-xl text-zinc-500 text-xs">
                    No tenés experiencias cargadas en tu perfil todavía.
                  </div>
                )}
              </div>
            </div>

            {/* Opción En Blanco */}
            <div className="pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleAddBlank}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Crear puesto en blanco</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Experiencias en el CV */}
      <div className="space-y-3">
        {entries.map((entry, idx) => {
          const isSelected = entry.selected !== false;
          const isCollapsed = collapsedEntries[entry.entry_id];

          return (
            <div
              key={entry.entry_id || idx}
              id={`editor-experience-${entry.entry_id}`}
              className={`rounded-xl border transition p-3 space-y-3 ${
                isSelected
                  ? "bg-zinc-900/60 border-zinc-800/80 shadow-sm"
                  : "bg-zinc-950/40 border-zinc-900 opacity-60"
              }`}
            >
              {/* Header card with toggle and title preview */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleEntry(idx)}
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-500 text-black shadow-sm"
                        : "bg-zinc-900 border-zinc-700 text-transparent hover:border-zinc-500"
                    }`}
                    title={isSelected ? "Desactivar toda la experiencia" : "Activar experiencia"}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>
                  <span className="font-semibold text-zinc-200 truncate">
                    {entry.title || "Sin título"}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate">
                    • {entry.org || "Sin empresa"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveEntry(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Subir puesto"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveEntry(idx, "down")}
                      disabled={idx === entries.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Bajar puesto"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(entry.entry_id)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    title="Eliminar puesto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Puesto / Cargo</label>
                      <BufferedInput
                        type="text"
                        value={entry.title}
                        onCommit={(val) => handleFieldChange(idx, "title", val)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Empresa</label>
                      <BufferedInput
                        type="text"
                        value={entry.org}
                        onCommit={(val) => handleFieldChange(idx, "org", val)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Fechas</label>
                      <BufferedInput
                        type="text"
                        value={entry.date_label}
                        onCommit={(val) => handleFieldChange(idx, "date_label", val)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Ubicación</label>
                      <BufferedInput
                        type="text"
                        value={entry.location || ""}
                        onCommit={(val) => handleFieldChange(idx, "location", val)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  {/* Bullet list for this entry */}
                  <BulletList
                    bullets={entry.bullets}
                    sectionKey="experience"
                    entryId={entry.entry_id}
                    onChange={(bullets, debounceMs) =>
                      handleBulletsChange(idx, bullets, debounceMs)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

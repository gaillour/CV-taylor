"use client";

import React, { useState } from "react";
import { RenderSkillGroup, Skill } from "@/types/cv";
import { useProfileStore } from "@/store/useProfileStore";
import { useCvStore } from "@/store/useCvStore";
import { BufferedInput } from "./BufferedFields";
import { Plus, Trash2, Wrench, FileCode2, X } from "lucide-react";

interface SkillsSectionProps {
  skills: RenderSkillGroup[];
  onChange: (skills: RenderSkillGroup[], debounceMs?: number) => void;
}

interface GroupedCategory {
  category: string;
  skills: Skill[];
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profile = useProfileStore((s) => s.profile);
  const mirror = useProfileStore((s) => s.mirror);
  const loadMirror = useProfileStore((s) => s.loadMirror);
  const cvLang = (useCvStore((s) => s.renderModel?.lang) as "es" | "en") || "es";
  const [importLang, setImportLang] = useState<"es" | "en">(cvLang);

  const sourceProfile =
    profile && importLang !== profile.base_lang ? mirror || profile : profile;

  // Agrupar skills del perfil activo según su campo category
  const groupedCategories: GroupedCategory[] = React.useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const sk of sourceProfile?.skills || []) {
      const cat = sk.category?.trim() || "General";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(sk);
    }
    return Array.from(map.entries()).map(([category, skList]) => ({
      category,
      skills: skList,
    }));
  }, [sourceProfile]);

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

  const handleCategoryChange = (index: number, category: string) => {
    const updated = skills.map((s, i) => (i === index ? { ...s, category } : s));
    onChange(updated, 150);
  };

  const handleItemsChange = (index: number, items: string) => {
    const updated = skills.map((s, i) => (i === index ? { ...s, items } : s));
    onChange(updated, 150);
  };

  const handleDelete = (index: number) => {
    const updated = skills.filter((_, i) => i !== index);
    onChange(updated, 0);
  };

  const handleAddFromProfile = (cat: GroupedCategory) => {
    const items = cat.skills.map((s) => s.name).join(", ");
    const skill_ids = cat.skills.map((s) => s.id);
    const newGroup: RenderSkillGroup = {
      category: cat.category,
      items: items || "Habilidad 1, Habilidad 2",
      skill_ids,
    };
    onChange([...skills, newGroup], 0);
    setIsModalOpen(false);
  };

  const handleAddBlank = () => {
    const newGroup: RenderSkillGroup = {
      category: "Nueva Categoría",
      items: "Habilidad 1, Habilidad 2",
      skill_ids: [],
    };
    onChange([...skills, newGroup], 0);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Cabecera de la sección */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span>Grupos de Habilidades ({skills.length})</span>
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-[11px] font-medium transition cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Agregar categoría</span>
        </button>
      </div>

      {/* Modal de Importación de Categorías de Habilidades */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Agregar Categoría de Habilidades
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Insertá una categoría desde tu perfil o creá un grupo personalizado para este CV.
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
                Categorías en tu Perfil ({groupedCategories.length})
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {groupedCategories.map((cat) => {
                  const alreadyInCv = skills.some(
                    (s) => s.category.toLowerCase() === cat.category.toLowerCase()
                  );
                  const itemsPreview = cat.skills.map((s) => s.name).join(", ");

                  return (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <p className="font-medium text-xs text-zinc-200 truncate">{cat.category}</p>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                            {importLang}
                          </span>
                          {alreadyInCv && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              En CV
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                          {itemsPreview || "Sin habilidades"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFromProfile(cat)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shrink-0"
                      >
                        + Insertar ({importLang.toUpperCase()})
                      </button>
                    </div>
                  );
                })}

                {groupedCategories.length === 0 && (
                  <div className="text-center py-5 border border-dashed border-zinc-800/80 rounded-xl text-zinc-500 text-xs">
                    No tenés habilidades catalogadas en tu perfil todavía.
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
                <span>Crear categoría en blanco</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Grupos de Habilidades en el CV */}
      <div className="space-y-2">
        {skills.map((skillGroup, idx) => (
          <div
            key={idx}
            className="group p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg space-y-2"
          >
            <div className="flex items-center gap-2">
              <BufferedInput
                type="text"
                value={skillGroup.category}
                onCommit={(val) => handleCategoryChange(idx, val)}
                placeholder="Categoría (ej: Backend & DBs)"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                title="Eliminar grupo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <BufferedInput
                type="text"
                value={skillGroup.items}
                onCommit={(val) => handleItemsChange(idx, val)}
                placeholder="Ítems separados por comas (ej: Python, FastAPI, PostgreSQL)"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

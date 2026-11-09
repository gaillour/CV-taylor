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
      <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
        <span>Grupos de Habilidades ({skills.length})</span>
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-raised hover:bg-surface border border-hairline text-text-secondary hover:text-text-primary rounded-lg text-[11px] font-medium transition cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-accent" />
          <span>Agregar categoría</span>
        </button>
      </div>

      {/* Modal de Importación de Categorías de Habilidades */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-surface border border-hairline rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="text-sm font-medium text-text-ivory">
                  Agregar Categoría de Habilidades
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Insertá una categoría desde tu perfil o creá un grupo personalizado para este CV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Idioma */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50 border border-hairline">
              <div>
                <span className="text-xs font-medium text-text-primary block">Idioma de origen</span>
                <span className="text-[10px] text-text-muted">
                  CV configurado en: <strong className="uppercase text-text-secondary">{cvLang}</strong>
                </span>
              </div>
              <div className="flex items-center bg-surface-raised border border-hairline p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSelectImportLang("es")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    importLang === "es"
                      ? "bg-surface text-text-ivory shadow-sm border border-hairline"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  ES
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectImportLang("en")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    importLang === "en"
                      ? "bg-surface text-text-ivory shadow-sm border border-hairline"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Bloques desde el Perfil */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-text-muted block">
                Categorías en tu perfil ({groupedCategories.length})
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
                      className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 border border-hairline hover:border-accent-border transition gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-accent shrink-0" />
                          <p className="font-medium text-xs text-text-primary truncate">{cat.category}</p>
                          <span className="text-[10px] font-mono text-text-muted uppercase">
                            · {importLang}
                          </span>
                          {alreadyInCv && (
                            <span className="text-[10px] font-mono text-text-muted">
                              · en CV
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted truncate mt-0.5 font-mono">
                          {itemsPreview || "Sin habilidades"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFromProfile(cat)}
                        className="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface border border-hairline hover:border-accent text-text-primary text-xs font-medium transition cursor-pointer shrink-0"
                      >
                        + Insertar ({importLang.toUpperCase()})
                      </button>
                    </div>
                  );
                })}

                {groupedCategories.length === 0 && (
                  <div className="text-center py-5 border border-dashed border-hairline rounded-xl text-text-muted text-xs">
                    No tenés habilidades catalogadas en tu perfil todavía.
                  </div>
                )}
              </div>
            </div>

            {/* Opción En Blanco */}
            <div className="pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={handleAddBlank}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-raised hover:bg-surface border border-hairline text-text-secondary hover:text-text-primary text-xs font-medium transition cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-text-muted" />
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
            className="group p-2.5 bg-surface/60 border border-hairline rounded-lg space-y-2"
          >
            <div className="flex items-center gap-2">
              <BufferedInput
                type="text"
                value={skillGroup.category}
                onCommit={(val) => handleCategoryChange(idx, val)}
                placeholder="Categoría (ej: Backend & DBs)"
                className="flex-1 bg-canvas border border-hairline rounded px-2 py-1 text-xs font-medium text-text-primary focus-ring"
              />
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger rounded transition cursor-pointer"
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
                className="w-full bg-canvas/80 border border-hairline rounded px-2 py-1 text-[11px] text-text-secondary focus-ring font-mono"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

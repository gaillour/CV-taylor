import React, { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Skill } from "@/types/cv";

export function SkillsTab({
  skills,
  onAddSkill,
  onRemoveSkill,
  onApproveSkill,
  onRejectSkill,
  onConfirmSkillRemoval,
  onDismissSkillRemoval,
}: {
  skills: Skill[];
  onAddSkill: (s: Skill) => void;
  onRemoveSkill: (id: string) => void;
  onApproveSkill: (id: string) => void;
  onRejectSkill: (id: string) => void;
  onConfirmSkillRemoval?: (id: string) => void;
  onDismissSkillRemoval?: (id: string) => void;
}) {
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCat, setNewSkillCat] = useState("Lenguajes");
  const [newSkillLevel, setNewSkillLevel] = useState("");

  const categories = Array.from(
    new Set(skills.map((s) => s.category || "Otros"))
  ).sort();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const cleanId = `skill_${newSkillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    onAddSkill({
      id: cleanId,
      name: newSkillName.trim(),
      category: newSkillCat.trim() || "Otros",
      level: newSkillLevel.trim() || undefined,
      aliases: [newSkillName.toLowerCase().trim()],
      tags: [],
      source: "user",
      approved: true,
    });
    setNewSkillName("");
    setNewSkillLevel("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Habilidades y Herramientas</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Tecnologías y competencias que el motor utiliza para validar y redactar tus CVs.
        </p>
      </div>

      {/* Agregar rápida */}
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-2 bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg"
      >
        <input
          type="text"
          placeholder="Habilidad (ej: FastAPI, Docker)"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          className="flex-1 min-w-[150px] bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <input
          type="text"
          placeholder="Categoría (ej: Lenguajes, DevOps)"
          value={newSkillCat}
          onChange={(e) => setNewSkillCat(e.target.value)}
          className="w-36 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <input
          type="text"
          placeholder="Nivel (opcional)"
          value={newSkillLevel}
          onChange={(e) => setNewSkillLevel(e.target.value)}
          className="w-28 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </form>

      {/* Categorías y Pills */}
      <div className="space-y-5">
        {categories.map((cat) => {
          const catSkills = skills.filter((s) => (s.category || "Otros") === cat);
          return (
            <div key={cat} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-300">{cat}</span>
                <span className="text-[10px] text-zinc-500 font-mono">({catSkills.length})</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {catSkills.map((skill) => {
                  const isPending = skill.approved === false;
                  const isRemoval = Boolean(skill.marked_for_removal);
                  return (
                    <div
                      key={skill.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border group ${
                        isRemoval
                          ? "bg-red-500/10 border-red-500/40 text-red-200"
                          : isPending
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                            : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-700"
                      }`}
                      title={skill.removal_reason || undefined}
                    >
                      <span className="font-medium">{skill.name}</span>
                      {skill.level && (
                        <span className="text-[10px] text-zinc-500 font-normal">
                          · {skill.level}
                        </span>
                      )}
                      {isRemoval && (
                        <span className="text-[10px] font-mono px-1 rounded bg-red-500/20 text-red-300">
                          Duplicado
                        </span>
                      )}

                      {isRemoval ? (
                        <div className="inline-flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => onConfirmSkillRemoval?.(skill.id)}
                            className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                            title="Eliminar habilidad duplicada"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDismissSkillRemoval?.(skill.id)}
                            className="p-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                            title="Conservar habilidad"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isPending ? (
                        <div className="inline-flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => onApproveSkill(skill.id)}
                            className="p-0.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                            title="Aprobar habilidad sugerida"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectSkill(skill.id)}
                            className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                            title="Descartar sugerencia"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveSkill(skill.id)}
                          className="text-zinc-600 hover:text-red-400 opacity-60 group-hover:opacity-100 transition ml-0.5 cursor-pointer"
                          title="Eliminar habilidad"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {skills.length === 0 && (
          <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
            No tenés habilidades registradas en esta sección.
          </div>
        )}
      </div>
    </div>
  );
}

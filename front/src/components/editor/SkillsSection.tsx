"use client";

import React from "react";
import { RenderSkillGroup } from "@/types/cv";
import { BufferedInput } from "./BufferedFields";
import { Plus, Trash2 } from "lucide-react";

interface SkillsSectionProps {
  skills: RenderSkillGroup[];
  onChange: (skills: RenderSkillGroup[], debounceMs?: number) => void;
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
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

  const handleAdd = () => {
    const newGroup: RenderSkillGroup = {
      category: "Nueva Categoría",
      items: "Habilidad 1, Habilidad 2",
      skill_ids: [],
    };
    onChange([...skills, newGroup], 0);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span>Grupos de Habilidades ({skills.length})</span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
        >
          <Plus className="w-3 h-3" />
          <span>Añadir grupo</span>
        </button>
      </div>

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
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition"
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

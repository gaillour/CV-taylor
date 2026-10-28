"use client";

import React, { useState } from "react";
import { RenderEntry, RenderBullet } from "@/types/cv";
import { BulletList } from "./BulletList";
import { Plus, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";

interface ExperienceSectionProps {
  entries: RenderEntry[];
  onChange: (entries: RenderEntry[], debounceMs?: number) => void;
}

export function ExperienceSection({ entries, onChange }: ExperienceSectionProps) {
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const handleAdd = () => {
    const newId = `exp_${Date.now()}`;
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
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span>
          Experiencias ({entries.filter((e) => e.selected !== false).length}/{entries.length} activas)
        </span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
        >
          <Plus className="w-3 h-3" />
          <span>Añadir puesto</span>
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry, idx) => {
          const isSelected = entry.selected !== false;
          const isCollapsed = collapsedEntries[entry.entry_id];

          return (
            <div
              key={entry.entry_id || idx}
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
                  <button
                    type="button"
                    onClick={() => toggleCollapse(entry.entry_id)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 transition"
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
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
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(e) => handleFieldChange(idx, "title", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Empresa</label>
                      <input
                        type="text"
                        value={entry.org}
                        onChange={(e) => handleFieldChange(idx, "org", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Fechas</label>
                      <input
                        type="text"
                        value={entry.date_label}
                        onChange={(e) => handleFieldChange(idx, "date_label", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-0.5">Ubicación</label>
                      <input
                        type="text"
                        value={entry.location || ""}
                        onChange={(e) => handleFieldChange(idx, "location", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  {/* Bullet list for this entry */}
                  <BulletList
                    bullets={entry.bullets}
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

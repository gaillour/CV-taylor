"use client";

import React from "react";
import { RenderBullet } from "@/types/cv";
import { Check, Pin, Trash2, Plus } from "lucide-react";
import { BufferedTextarea } from "./BufferedFields";

interface BulletListProps {
  bullets: RenderBullet[];
  onChange: (bullets: RenderBullet[], debounceMs?: number) => void;
}

export function BulletList({ bullets, onChange }: BulletListProps) {
  const handleToggle = (index: number) => {
    const updated = bullets.map((b, i) =>
      i === index ? { ...b, selected: b.selected === false ? true : false } : b
    );
    onChange(updated, 0); // Immediate Typst compile on toggle
  };

  const handleTextChange = (index: number, text: string) => {
    const updated = bullets.map((b, i) => (i === index ? { ...b, text } : b));
    onChange(updated, 150); // 150ms debounce on keystroke
  };

  const handleDelete = (index: number) => {
    const updated = bullets.filter((_, i) => i !== index);
    onChange(updated, 0);
  };

  const handleAdd = () => {
    const newBullet: RenderBullet = {
      text: "Nueva viñeta de impacto...",
      selected: true,
      priority: 100,
      pinned: false,
      position: bullets.length + 1,
      fact_ids: [],
      skill_ids: [],
      suggested_alternatives: [],
    };
    onChange([...bullets, newBullet], 0);
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span>Viñetas ({bullets.filter((b) => b.selected !== false).length}/{bullets.length} activas)</span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
        >
          <Plus className="w-3 h-3" />
          <span>Añadir viñeta</span>
        </button>
      </div>

      <div className="space-y-2">
        {bullets.map((bullet, idx) => {
          const isSelected = bullet.selected !== false;
          return (
            <div
              key={idx}
              className={`group flex items-start gap-2 p-2 rounded-lg border transition ${
                isSelected
                  ? "bg-zinc-900/60 border-zinc-800/80"
                  : "bg-zinc-950/40 border-zinc-900 opacity-60"
              }`}
            >
              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                className={`mt-1 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                  isSelected
                    ? "bg-emerald-500 border-emerald-500 text-black shadow-sm"
                    : "bg-zinc-900 border-zinc-700 text-transparent hover:border-zinc-500"
                }`}
                title={isSelected ? "Desactivar viñeta" : "Activar viñeta"}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>

              {/* Textarea with local buffer */}
              <div className="flex-1 min-w-0">
                <BufferedTextarea
                  rows={2}
                  value={bullet.text}
                  onCommit={(text) => handleTextChange(idx, text)}
                  className={`w-full bg-transparent text-xs text-zinc-200 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded p-1 transition leading-relaxed ${
                    !isSelected ? "line-through text-zinc-500" : ""
                  }`}
                  placeholder="Texto de la viñeta..."
                />
              </div>

              {/* Meta & actions */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                {bullet.pinned && (
                  <span title="Fijada" className="text-amber-400">
                    <Pin className="w-3 h-3 fill-amber-400" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                  title="Eliminar viñeta"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

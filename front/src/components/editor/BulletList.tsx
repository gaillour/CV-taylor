"use client";

import React, { useState } from "react";
import { RenderBullet } from "@/types/cv";
import { Check, Pin, Trash2, Plus, BookmarkPlus, Loader2, CheckCheck } from "lucide-react";
import { BufferedTextarea } from "./BufferedFields";
import { useCvStore } from "@/store/useCvStore";

interface BulletListProps {
  bullets: RenderBullet[];
  onChange: (bullets: RenderBullet[], debounceMs?: number) => void;
  sectionKey?: "experience" | "projects" | "education";
  entryId?: string;
}

export function BulletList({ bullets, onChange, sectionKey, entryId }: BulletListProps) {
  const saveBulletToProfile = useCvStore((s) => s.saveBulletToProfile);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<{ idx: number; message: string } | null>(null);

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

  const handleSaveToProfile = async (index: number) => {
    if (!sectionKey || !entryId) return;
    setSavingIdx(index);
    setSaveError(null);
    try {
      await saveBulletToProfile(sectionKey, entryId, index);
      setSavedIdx(index);
      setTimeout(() => {
        setSavedIdx((cur) => (cur === index ? null : cur));
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar en perfil";
      setSaveError({ idx: index, message: msg });
      setTimeout(() => {
        setSaveError((cur) => (cur?.idx === index ? null : cur));
      }, 4000);
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
        <span>Viñetas ({bullets.filter((b) => b.selected !== false).length}/{bullets.length} activas)</span>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-[11px] text-accent hover:underline transition-colors cursor-pointer font-mono"
        >
          <Plus className="w-3 h-3" />
          <span>Añadir viñeta</span>
        </button>
      </div>

      <div className="space-y-2">
        {bullets.map((bullet, idx) => {
          const isSelected = bullet.selected !== false;
          const isSaving = savingIdx === idx;
          const isSaved = savedIdx === idx;
          const err = saveError?.idx === idx ? saveError.message : null;

          return (
            <div
              key={idx}
              className={`group flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                isSelected
                  ? "bg-surface border-hairline"
                  : "bg-canvas border-hairline opacity-60"
              }`}
            >
              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                className={`mt-1 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent border-accent text-accent-contrast shadow-xs"
                    : "bg-canvas border-hairline text-transparent hover:border-accent-border"
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
                  className={`w-full bg-transparent text-xs text-text-primary resize-y focus-ring rounded p-1 transition leading-relaxed ${
                    !isSelected ? "line-through text-text-muted" : ""
                  }`}
                  placeholder="Texto de la viñeta..."
                />
                {err && (
                  <p className="text-[10px] text-danger mt-1 font-mono">{err}</p>
                )}
              </div>

              {/* Meta & actions */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                {sectionKey && entryId && (
                  <button
                    type="button"
                    onClick={() => handleSaveToProfile(idx)}
                    disabled={isSaving}
                    className={`p-1 rounded transition-colors text-xs flex items-center justify-center cursor-pointer ${
                      isSaved
                        ? "text-green-text bg-green-subtle"
                        : "text-text-muted hover:text-green-text hover:bg-surface-raised"
                    }`}
                    title={
                      isSaved
                        ? "¡Guardado en el Perfil Maestro!"
                        : bullet.fact_ids && bullet.fact_ids.length > 0
                        ? "Actualizar este hecho en el Perfil Maestro"
                        : "Guardar como nuevo hecho en el Perfil Maestro"
                    }
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                    ) : isSaved ? (
                      <CheckCheck className="w-3.5 h-3.5 text-green-text" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                {bullet.pinned && (
                  <span title="Fijada" className="text-accent">
                    <Pin className="w-3 h-3 fill-accent" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger rounded transition-colors cursor-pointer"
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

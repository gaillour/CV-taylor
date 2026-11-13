import React, { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { EntryTitle } from "@/types/cv";

export interface EntryTitlesSublistProps {
  entryId: string;
  titles: EntryTitle[];
  readOnly?: boolean;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onApproveTitle: (entryId: string, titleId: string) => void;
  onRejectTitle: (entryId: string, titleId: string) => void;
}

export function EntryTitlesSublist({
  entryId,
  titles,
  readOnly = false,
  onAddTitle,
  onRemoveTitle,
  onApproveTitle,
  onRejectTitle,
}: EntryTitlesSublistProps) {
  const [showNewTitle, setShowNewTitle] = useState(false);
  const [newTitleText, setNewTitleText] = useState("");
  const [newTitleArchetype, setNewTitleArchetype] = useState("");

  const handleAddTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !newTitleText.trim()) return;
    const titleId = `title_${Date.now()}`;
    onAddTitle(entryId, {
      id: titleId,
      entry_id: entryId,
      title: newTitleText.trim(),
      archetype: newTitleArchetype.trim() || undefined,
      is_default: titles.length === 0,
      source: "user",
      approved: true,
    });
    setNewTitleText("");
    setNewTitleArchetype("");
    setShowNewTitle(false);
  };

  return (
    <div className="space-y-2 pt-2 border-t border-hairline">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          Títulos o roles alternativos
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowNewTitle(!showNewTitle)}
            className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer font-mono"
          >
            <Plus className="w-3 h-3" />
            Agregar variante de título
          </button>
        )}
      </div>

      {!readOnly && showNewTitle && (
        <form
          onSubmit={handleAddTitleSubmit}
          className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-hairline"
        >
          <input
            type="text"
            placeholder="Título (ej: Fullstack Engineer)"
            value={newTitleText}
            onChange={(e) => setNewTitleText(e.target.value)}
            className="flex-1 bg-canvas border border-hairline rounded px-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus-ring"
          />
          <input
            type="text"
            placeholder="Arquetipo (ej: backend)"
            value={newTitleArchetype}
            onChange={(e) => setNewTitleArchetype(e.target.value)}
            className="w-32 bg-canvas border border-hairline rounded px-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus-ring"
          />
          <button
            type="submit"
            className="btn-secondary px-3 py-1 text-xs rounded font-medium cursor-pointer"
          >
            Guardar
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {titles.map((t) => {
          const isPending = !readOnly && t.approved === false;
          return (
            <div
              key={t.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
                isPending
                  ? "bg-warning-subtle border-warning-border text-warning"
                  : t.is_default
                    ? "bg-surface-raised border-hairline text-text-ivory font-medium"
                    : "bg-surface border-hairline text-text-secondary"
              }`}
            >
              <span>{t.title}</span>
              {t.archetype && (
                <span className="text-[10px] text-text-muted font-mono">
                  ({t.archetype})
                </span>
              )}

              {!readOnly &&
                (isPending ? (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => onApproveTitle(entryId, t.id)}
                      className="text-green-text hover:bg-green-subtle p-0.5 rounded cursor-pointer"
                      title="Aprobar título"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectTitle(entryId, t.id)}
                      className="text-danger hover:bg-danger/20 p-0.5 rounded cursor-pointer"
                      title="Descartar título"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  titles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveTitle(entryId, t.id)}
                      className="text-text-muted hover:text-danger ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Fact } from "@/types/cv";

export interface EntryFactsSublistProps {
  entryId: string;
  facts: Fact[];
  readOnly?: boolean;
  onAddFact: (entryId: string, f: Fact) => void;
  onUpdateFactText?: (entryId: string, factId: string, text: string) => void;
  onRemoveFact: (entryId: string, factId: string) => void;
  onApproveFact: (entryId: string, factId: string) => void;
  onRejectFact: (entryId: string, factId: string) => void;
  onConfirmFactRemoval?: (entryId: string, factId: string) => void;
  onDismissFactRemoval?: (entryId: string, factId: string) => void;
}

export function EntryFactsSublist({
  entryId,
  facts,
  readOnly = false,
  onAddFact,
  onUpdateFactText,
  onRemoveFact,
  onApproveFact,
  onRejectFact,
  onConfirmFactRemoval,
  onDismissFactRemoval,
}: EntryFactsSublistProps) {
  const [showNewFact, setShowNewFact] = useState(false);
  const [newFactText, setNewFactText] = useState("");
  const [newFactPriority, setNewFactPriority] = useState(100);

  const handleAddFactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !newFactText.trim()) return;
    const factId = `fact_${Date.now()}`;
    onAddFact(entryId, {
      id: factId,
      entry_id: entryId,
      text: newFactText.trim(),
      weight: Number(newFactPriority) || 100,
      tags: [],
      skill_ids: [],
      source: "user",
      approved: true,
    });
    setNewFactText("");
    setShowNewFact(false);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-hairline">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          Logros y viñetas verificables
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowNewFact(!showNewFact)}
            className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer font-mono"
          >
            <Plus className="w-3 h-3" />
            Agregar logro
          </button>
        )}
      </div>

      {!readOnly && showNewFact && (
        <form
          onSubmit={handleAddFactSubmit}
          className="space-y-2 bg-surface p-3 rounded-lg border border-hairline"
        >
          <textarea
            rows={2}
            placeholder="Describí tu impacto, métrica o hito técnico logrado..."
            value={newFactText}
            onChange={(e) => setNewFactText(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded p-2 text-xs text-text-primary placeholder:text-text-muted focus-ring resize-y font-mono"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted font-mono">Prioridad:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={newFactPriority}
                onChange={(e) => setNewFactPriority(Number(e.target.value))}
                className="w-16 bg-canvas border border-hairline rounded px-2 py-0.5 text-xs text-text-primary focus-ring font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewFact(false)}
                className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-secondary px-3 py-1 text-xs rounded font-medium cursor-pointer"
              >
                Guardar logro
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {facts.map((fact) => {
          const isNewAiFact = !readOnly && fact.approved === false;
          const hasProposal = !readOnly && Boolean(fact.proposed_text);

          return (
            <div
              key={fact.id}
              className={`rounded-lg p-2.5 text-xs transition border group ${
                isNewAiFact
                  ? "bg-warning-subtle border-warning-border"
                  : hasProposal
                    ? "bg-accent-subtle/30 border-accent-border"
                    : "bg-surface-raised/40 hover:bg-surface-raised/80 border-hairline"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  {isNewAiFact && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning-subtle text-warning border border-warning-border">
                        ✨ Sugerencia IA pendiente
                      </span>
                    </div>
                  )}
                  {!readOnly && fact.marked_for_removal && (
                    <div className="p-2.5 rounded-lg bg-warning-subtle border border-warning-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-medium text-warning flex items-center gap-1.5 text-[11px]">
                          ⚠️ Sugerencia IA: Viñeta redundante o repetida
                        </span>
                        <p className="text-text-secondary text-[11px]">
                          {fact.removal_reason || "Contenido repetido con otra viñeta."}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onConfirmFactRemoval?.(entryId, fact.id)}
                          className="px-2.5 py-1 rounded bg-danger hover:bg-danger-hover text-white text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissFactRemoval?.(entryId, fact.id)}
                          className="btn-secondary px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Conservar
                        </button>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={fact.text}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) =>
                      onUpdateFactText?.(entryId, fact.id, e.target.value)
                    }
                    placeholder="Describí tu impacto, métrica o hito técnico logrado..."
                    className={`w-full bg-canvas border rounded-lg p-2 text-xs text-text-primary placeholder:text-text-muted focus-ring resize-y transition disabled:opacity-70 font-mono ${
                      hasProposal
                        ? "line-through text-text-muted border-hairline"
                        : "border-hairline"
                    }`}
                  />

                  {hasProposal && (
                    <div className="p-2.5 rounded bg-surface border border-accent-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-accent">
                          ✨ Redacción mejorada sugerida:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onApproveFact(entryId, fact.id)}
                            className="btn-accent flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectFact(entryId, fact.id)}
                            className="btn-secondary flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            Conservar
                          </button>
                        </div>
                      </div>
                      <p className="text-text-ivory font-medium font-mono">{fact.proposed_text}</p>
                    </div>
                  )}
                </div>

                {!readOnly &&
                  (isNewAiFact ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onApproveFact(entryId, fact.id)}
                        className="btn-accent flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer"
                        title="Aprobar logro"
                      >
                        <Check className="w-3 h-3" />
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectFact(entryId, fact.id)}
                        className="p-1 rounded bg-danger-subtle hover:bg-danger/20 text-danger transition-colors cursor-pointer"
                        title="Descartar logro"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveFact(entryId, fact.id)}
                      className="text-text-muted hover:text-danger opacity-40 group-hover:opacity-100 transition p-1 cursor-pointer"
                      title="Eliminar logro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ))}
              </div>
            </div>
          );
        })}

        {facts.length === 0 && (
          <div className="text-[11px] text-text-muted italic py-1">
            Esta entrada aún no tiene viñetas o logros agregados.
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Entry, EntryTitle, Fact } from "@/types/cv";
import { Field } from "../Field";
import { EntryTitlesSublist } from "./EntryTitlesSublist";
import { EntryFactsSublist } from "./EntryFactsSublist";

export interface EntryCardItemProps {
  entry: Entry;
  readOnly?: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onToggle: () => void;
  onUpdateEntry: (id: string, e: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onMoveEntry?: (id: string, direction: "up" | "down") => void;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onUpsertEntryTitle?: (entryId: string, titleText: string) => void;
  onAddFact: (entryId: string, f: Fact) => void;
  onUpdateFactText?: (entryId: string, factId: string, text: string) => void;
  onRemoveFact: (entryId: string, factId: string) => void;
  onApproveTitle: (entryId: string, titleId: string) => void;
  onRejectTitle: (entryId: string, titleId: string) => void;
  onApproveFact: (entryId: string, factId: string) => void;
  onRejectFact: (entryId: string, factId: string) => void;
  onConfirmFactRemoval?: (entryId: string, factId: string) => void;
  onDismissFactRemoval?: (entryId: string, factId: string) => void;
}

export function EntryCardItem({
  entry,
  readOnly = false,
  isExpanded,
  isHighlighted,
  isFirst = false,
  isLast = false,
  onToggle,
  onUpdateEntry,
  onRemoveEntry,
  onMoveEntry,
  onAddTitle,
  onRemoveTitle,
  onUpsertEntryTitle,
  onAddFact,
  onUpdateFactText,
  onRemoveFact,
  onApproveTitle,
  onRejectTitle,
  onApproveFact,
  onRejectFact,
  onConfirmFactRemoval,
  onDismissFactRemoval,
}: EntryCardItemProps) {
  const primaryTitle =
    entry.titles.find((t) => t.is_default)?.title ||
    entry.titles[0]?.title ||
    "";
  const displayTitle = primaryTitle || "Entrada sin título";

  const pendingTitlesCount = readOnly
    ? 0
    : entry.titles.filter((t) => t.approved === false).length;
  const pendingFactsCount = readOnly
    ? 0
    : entry.facts.filter((f) => f.approved === false || Boolean(f.proposed_text)).length;
  const totalPending = pendingTitlesCount + pendingFactsCount;

  return (
    <div
      id={`entry-card-${entry.id}`}
      className={`rounded-xl overflow-hidden transition-colors border ${
        isHighlighted
          ? "border-accent-border ring-2 ring-accent-subtle bg-accent-subtle/20"
          : isExpanded
            ? "bg-surface border-hairline"
            : "bg-surface/60 hover:bg-surface-raised/40 border-hairline"
      }`}
    >
      {/* Resumen / Fila de Acordeón */}
      <div
        onClick={onToggle}
        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            className="text-text-muted hover:text-text-primary p-0.5 shrink-0"
            aria-label="Expandir/colapsar"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-primary" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-ivory truncate">
                {displayTitle}
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-secondary truncate">{entry.org}</span>
            </div>
            <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
              <span>
                {entry.end_date
                  ? entry.end_date === entry.start_date
                    ? entry.start_date
                    : `${entry.start_date} — ${entry.end_date}`
                  : `${entry.start_date} — presente`}
              </span>
              {entry.location && <span>· {entry.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {totalPending > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-warning">
              <Sparkles className="w-3 h-3" />
              <span>{totalPending}</span>
            </span>
          )}
          <span className="text-[11px] text-text-muted font-mono tabular-nums">
            {entry.facts.length} {entry.facts.length === 1 ? "logro" : "logros"}
          </span>
          {!readOnly && onMoveEntry && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={isFirst}
                onClick={() => onMoveEntry(entry.id, "up")}
                className="p-1 rounded hover:bg-surface-raised disabled:opacity-20 text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Subir prioridad en perfil"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => onMoveEntry(entry.id, "down")}
                className="p-1 rounded hover:bg-surface-raised disabled:opacity-20 text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Bajar prioridad en perfil"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveEntry(entry.id);
              }}
              className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger-subtle transition-colors cursor-pointer"
              title="Eliminar entrada completa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo Desplegable */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-hairline space-y-5 bg-surface-raised/30">
          {/* Título y Rol */}
          <div className="pt-2">
            <Field label="Título / Puesto">
              <input
                type="text"
                value={primaryTitle}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onUpsertEntryTitle?.(entry.id, e.target.value)}
                placeholder="Desarrollador Backend"
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70 font-mono"
              />
            </Field>
          </div>

          {/* Datos Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <Field label="Organización / Empresa">
              <input
                id={`entry-input-${entry.id}`}
                type="text"
                value={entry.org}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onUpdateEntry(entry.id, { org: e.target.value })}
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70 font-mono"
              />
            </Field>
            <Field label="Ubicación">
              <input
                type="text"
                value={entry.location || ""}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onUpdateEntry(entry.id, { location: e.target.value })}
                placeholder="Ciudad, País o Remoto"
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70 font-mono"
              />
            </Field>
            <Field label="Fecha Inicio">
              <input
                type="text"
                value={entry.start_date}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="YYYY-MM"
                onChange={(e) => onUpdateEntry(entry.id, { start_date: e.target.value })}
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70 font-mono"
              />
            </Field>
            <Field label="Fecha Fin">
              <input
                type="text"
                value={entry.end_date || ""}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="YYYY-MM o present"
                onChange={(e) => onUpdateEntry(entry.id, { end_date: e.target.value })}
                className="w-full bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus-ring disabled:opacity-70 font-mono"
              />
            </Field>
          </div>

          {/* Contexto de fondo para destilar IA */}
          <Field label="Contexto adicional (opcional, para destilar logros con IA)">
            <textarea
              rows={2}
              placeholder="Describí tus funciones principales, stack o responsabilidades generales..."
              value={entry.context || ""}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => onUpdateEntry(entry.id, { context: e.target.value })}
              className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-xs text-text-primary placeholder:text-text-muted focus-ring resize-y disabled:opacity-70"
            />
          </Field>

          {/* Títulos / Variantes */}
          <EntryTitlesSublist
            entryId={entry.id}
            titles={entry.titles}
            readOnly={readOnly}
            onAddTitle={onAddTitle}
            onRemoveTitle={onRemoveTitle}
            onApproveTitle={onApproveTitle}
            onRejectTitle={onRejectTitle}
          />

          {/* Logros / Viñetas */}
          <EntryFactsSublist
            entryId={entry.id}
            facts={entry.facts}
            readOnly={readOnly}
            onAddFact={onAddFact}
            onUpdateFactText={onUpdateFactText}
            onRemoveFact={onRemoveFact}
            onApproveFact={onApproveFact}
            onRejectFact={onRejectFact}
            onConfirmFactRemoval={onConfirmFactRemoval}
            onDismissFactRemoval={onDismissFactRemoval}
          />
        </div>
      )}
    </div>
  );
}

import React from "react";
import { ChevronDown, ChevronRight, Eye, GitBranch, Trash2 } from "lucide-react";
import { SnapshotSummary } from "@/types/cv";
import { formatDate, SnapshotGroup } from "./snapshotGrouping";

export interface SnapshotGroupCardProps {
  group: SnapshotGroup;
  isExpanded: boolean;
  onToggleExpand: (e?: React.MouseEvent) => void;
  onOpenDraft: (snapSummary: SnapshotSummary) => void;
  onOpenPreview: (id: string, e: React.MouseEvent) => void;
  onDeleteSnapshot: (id: string, e: React.MouseEvent) => void;
}

export function SnapshotGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onOpenDraft,
  onOpenPreview,
  onDeleteSnapshot,
}: SnapshotGroupCardProps) {
  const latest = group.latest;
  const hasHistory = group.history.length > 0;

  return (
    <div className="transition-colors">
      {/* Fila Principal */}
      <div
        onClick={() => onOpenDraft(latest)}
        className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-0 hover:bg-surface-raised/40 cursor-pointer group transition-colors"
      >
        {/* Columna Empresa y Rol */}
        <div className="col-span-5 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-ivory group-hover:text-accent transition-colors truncate">
              {group.company}
            </span>
            {hasHistory && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                title="Ver versiones previas"
              >
                <GitBranch className="w-3 h-3 text-text-muted" />
                <span>+{group.history.length}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary truncate mt-0.5 font-mono">
            {group.role}
          </p>
        </div>

        {/* Columna Score ATS */}
        <div className="col-span-2">
          {latest.ats_score !== null ? (
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  latest.ats_score >= 85
                    ? "bg-green-text"
                    : latest.ats_score >= 70
                    ? "bg-warning"
                    : "bg-text-muted"
                }`}
              />
              <span
                className={
                  latest.ats_score >= 85
                    ? "text-green-text font-medium"
                    : latest.ats_score >= 70
                    ? "text-warning font-medium"
                    : "text-text-secondary"
                }
              >
                ATS {latest.ats_score}%
              </span>
            </div>
          ) : (
            <span className="text-xs font-mono text-text-muted">— Base</span>
          )}
        </div>

        {/* Columna Variante (Idioma / Tema) */}
        <div className="col-span-2 text-xs font-mono text-text-muted">
          <span className="uppercase text-text-secondary">{latest.lang}</span>
          <span className="mx-1 text-text-muted/60">·</span>
          <span className="capitalize">{latest.theme}</span>
        </div>

        {/* Columna Fecha */}
        <div className="col-span-2 text-xs font-mono text-text-muted tabular-nums">
          {formatDate(latest.created_at)}
        </div>

        {/* Columna Acciones */}
        <div className="col-span-1 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => onOpenPreview(latest.id, e)}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            title="Previsualizar documento"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => onDeleteSnapshot(latest.id, e)}
            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
            title="Archivar versión"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Linaje histórico (Sub-filas de versiones previas) */}
      {isExpanded && hasHistory && (
        <div className="bg-surface/50 border-t border-hairline/60 pl-8 pr-6 py-2 divide-y divide-hairline/40">
          {group.history.map((hSnap) => (
            <div
              key={hSnap.id}
              onClick={() => onOpenDraft(hSnap)}
              className="py-2.5 grid grid-cols-1 md:grid-cols-12 items-center text-xs font-mono hover:bg-surface-raised/30 transition-colors cursor-pointer group/history"
            >
              <div className="col-span-5 flex items-center gap-2 pl-2">
                <span className="text-text-muted text-[10px]">↳</span>
                <span className="text-text-secondary group-hover/history:text-text-ivory transition-colors">
                  {hSnap.role}
                </span>
                <span className="text-[10px] text-text-muted font-mono">
                  ({hSnap.id})
                </span>
              </div>
              <div className="col-span-2">
                {hSnap.ats_score !== null ? (
                  <span className="text-text-muted tabular-nums">
                    ATS {hSnap.ats_score}%
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
              <div className="col-span-2 text-text-muted">
                <span className="uppercase">{hSnap.lang}</span> · {hSnap.theme}
              </div>
              <div className="col-span-2 text-text-muted tabular-nums">
                {formatDate(hSnap.created_at)}
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={(e) => onOpenPreview(hSnap.id, e)}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Previsualizar"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeleteSnapshot(hSnap.id, e)}
                  className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                  title="Archivar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

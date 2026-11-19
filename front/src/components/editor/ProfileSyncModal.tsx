"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Briefcase, CheckSquare, Square, Loader2 } from "lucide-react";
import { ProfileDiffResult } from "@/lib/profileDiff";

interface ProfileSyncModalProps {
  open: boolean;
  diff: ProfileDiffResult | null;
  saving: boolean;
  onConfirmSync: (selectedIds: Set<string>) => void;
  onSaveCvOnly: () => void;
  onCancel: () => void;
}

export function ProfileSyncModal({
  open,
  diff,
  saving,
  onConfirmSync,
  onSaveCvOnly,
  onCancel,
}: ProfileSyncModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (diff && open) {
      const allIds = new Set<string>();
      diff.newEntries.forEach((e) => allIds.add(e.id));
      diff.newBullets.forEach((b) => allIds.add(b.id));
      diff.newSkills.forEach((s) => allIds.add(s.id));
      setSelectedIds(allIds);
    }
  }, [diff, open]);

  if (!open || !diff) return null;

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = (select: boolean) => {
    if (!select) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set<string>();
      diff.newEntries.forEach((e) => allIds.add(e.id));
      diff.newBullets.forEach((b) => allIds.add(b.id));
      diff.newSkills.forEach((s) => allIds.add(s.id));
      setSelectedIds(allIds);
    }
  };

  const totalItems =
    diff.newEntries.length + diff.newBullets.length + diff.newSkills.length;
  const allSelected = selectedIds.size === totalItems;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-lg bg-surface border border-hairline rounded-xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-surface-raised border-hairline text-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-medium text-text-ivory">
              S sincronizar nuevos ítems con tu Perfil Base
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Detectamos cambios o adiciones nuevas en este CV que no están registrados en tu Perfil Base SSOT. Seleccioná cuáles querés incorporar:
            </p>
          </div>
        </div>

        {/* Selection master control */}
        <div className="flex items-center justify-between text-xs text-text-muted px-1 border-b border-hairline/60 pb-2">
          <span>{selectedIds.size} de {totalItems} seleccionados</span>
          <button
            type="button"
            onClick={() => toggleAll(!allSelected)}
            className="text-accent hover:underline cursor-pointer font-medium"
          >
            {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1 max-h-[45vh]">
          {/* New Entries */}
          {diff.newEntries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted font-medium">
                Nuevas Entradas ({diff.newEntries.length})
              </h4>
              <div className="space-y-1.5">
                {diff.newEntries.map((entry) => {
                  const checked = selectedIds.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => toggleId(entry.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                        checked
                          ? "bg-surface-raised border-accent/40"
                          : "bg-surface border-hairline opacity-70 hover:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-accent cursor-pointer shrink-0"
                        tabIndex={-1}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">
                          {entry.label}
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          {entry.sublabel} · {entry.renderEntry.date_label}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-hairline text-text-muted shrink-0">
                        {entry.kind}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Bullets */}
          {diff.newBullets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted font-medium">
                Nuevas Viñetas ({diff.newBullets.length})
              </h4>
              <div className="space-y-1.5">
                {diff.newBullets.map((bullet) => {
                  const checked = selectedIds.has(bullet.id);
                  return (
                    <div
                      key={bullet.id}
                      onClick={() => toggleId(bullet.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                        checked
                          ? "bg-surface-raised border-accent/40"
                          : "bg-surface border-hairline opacity-70 hover:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-accent cursor-pointer shrink-0"
                        tabIndex={-1}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-text-muted truncate">
                          En: {bullet.entryLabel}
                        </div>
                        <p className="text-xs text-text-primary leading-relaxed">
                          {bullet.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Skills */}
          {diff.newSkills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted font-medium">
                Nuevas Habilidades ({diff.newSkills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {diff.newSkills.map((skill) => {
                  const checked = selectedIds.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleId(skill.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer select-none ${
                        checked
                          ? "bg-accent/15 border-accent text-text-ivory font-medium"
                          : "bg-surface border-hairline text-text-muted hover:text-text-primary opacity-70"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      )}
                      <span>{skill.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">
                        ({skill.category})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-hairline/60">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveCvOnly}
              disabled={saving}
              className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-text-secondary hover:text-text-primary"
            >
              Solo guardar en este CV
            </button>
            <button
              type="button"
              onClick={() => onConfirmSync(selectedIds)}
              disabled={selectedIds.size === 0 || saving}
              className="btn-accent px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Guardar y sumar al Perfil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

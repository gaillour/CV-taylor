import React, { useState } from "react";
import { FolderGit2, Plus } from "lucide-react";
import { Entry, EntryKind, EntryTitle, Fact, LangCode, Skill } from "@/types/cv";
import { GitHubImportModal } from "../GitHubImportModal";
import { EntryCardItem } from "./entries/EntryCardItem";

export function EntriesTab({
  kind,
  title,
  entries,
  activeLang = "es",
  readOnly = false,
  onAddEntry,
  onImportGitHub,
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
}: {
  kind: EntryKind;
  title: string;
  entries: Entry[];
  activeLang?: LangCode;
  readOnly?: boolean;
  onAddEntry: (e: Entry) => void;
  onImportGitHub?: (entry: Entry, newSkills: Skill[]) => void;
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
}) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [gitHubModalOpen, setGitHubModalOpen] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGitHubImport = (newEntry: Entry, newSkills: Skill[]) => {
    if (onImportGitHub) {
      onImportGitHub(newEntry, newSkills);
    } else {
      onAddEntry(newEntry);
    }
    setExpandedIds({ [newEntry.id]: true });
    setHighlightedEntryId(newEntry.id);
  };

  const handleCreateEntry = () => {
    if (readOnly) return;
    const newId = `${kind}_${Date.now()}`;
    const newTitleId = `title_${Date.now()}`;
    const defaultRole =
      kind === "experience"
        ? "Nuevo Puesto"
        : kind === "project"
          ? "Nuevo Proyecto"
          : "Carrera / Título";

    const defaultOrg =
      kind === "experience"
        ? "Empresa u Organización"
        : kind === "project"
          ? ""
          : "Universidad o Instituto";

    const newEntry: Entry = {
      id: newId,
      kind,
      org: defaultOrg,
      start_date: "2024-01-01",
      end_date: "present",
      context: "",
      titles: [
        {
          id: newTitleId,
          entry_id: newId,
          title: defaultRole,
          is_default: true,
          source: "user",
          approved: true,
        },
      ],
      facts: [],
    };

    onAddEntry(newEntry);

    setExpandedIds({ [newId]: true });
    setHighlightedEntryId(newId);

    setTimeout(() => {
      const el = document.getElementById(`entry-card-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const firstInput = document.getElementById(`entry-input-${newId}`) as HTMLInputElement | null;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 60);

    setTimeout(() => {
      setHighlightedEntryId((prev) => (prev === newId ? null : prev));
    }, 1600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-text-ivory">{title}</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {kind === "experience"
              ? "Cargos e historial laboral con logros clave."
              : kind === "project"
                ? "Proyectos relevantes, código abierto o productos construidos."
                : "Títulos académicos, certificaciones o cursos destacados."}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            {kind === "project" && (
              <button
                type="button"
                onClick={() => setGitHubModalOpen(true)}
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer"
                title="Importar proyecto automáticamente desde GitHub"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-accent" />
                Importar de GitHub
              </button>
            )}
            <button
              onClick={handleCreateEntry}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva entrada
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {entries.map((entry, idx) => {
          const isExpanded = Boolean(expandedIds[entry.id]);
          const isHighlighted = highlightedEntryId === entry.id;
          const isFirst = idx === 0;
          const isLast = idx === entries.length - 1;

          return (
            <EntryCardItem
              key={entry.id}
              entry={entry}
              readOnly={readOnly}
              isExpanded={isExpanded}
              isHighlighted={isHighlighted}
              isFirst={isFirst}
              isLast={isLast}
              onToggle={() => toggleExpand(entry.id)}
              onUpdateEntry={onUpdateEntry}
              onRemoveEntry={onRemoveEntry}
              onMoveEntry={onMoveEntry}
              onAddTitle={onAddTitle}
              onRemoveTitle={onRemoveTitle}
              onUpsertEntryTitle={onUpsertEntryTitle}
              onAddFact={onAddFact}
              onUpdateFactText={onUpdateFactText}
              onRemoveFact={onRemoveFact}
              onApproveTitle={onApproveTitle}
              onRejectTitle={onRejectTitle}
              onApproveFact={onApproveFact}
              onRejectFact={onRejectFact}
              onConfirmFactRemoval={onConfirmFactRemoval}
              onDismissFactRemoval={onDismissFactRemoval}
            />
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-10 border border-dashed border-hairline rounded-xl text-text-muted text-xs">
            No tenés registros de {title.toLowerCase()} cargados todavía.
          </div>
        )}
      </div>

      {kind === "project" && (
        <GitHubImportModal
          isOpen={gitHubModalOpen}
          activeLang={activeLang}
          onClose={() => setGitHubModalOpen(false)}
          onImport={handleGitHubImport}
        />
      )}
    </div>
  );
}

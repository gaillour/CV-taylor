import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Entry, EntryKind, EntryTitle, Fact } from "@/types/cv";
import { Field } from "./Field";

export function EntriesTab({
  kind,
  title,
  entries,
  activeEditLang = "es",
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
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
  activeEditLang?: "es" | "en";
  onAddEntry: (e: Entry) => void;
  onUpdateEntry: (id: string, e: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onUpsertEntryTitle?: (entryId: string, titleText: string, lang?: "es" | "en") => void;
  onAddFact: (entryId: string, f: Fact) => void;
  onUpdateFactText?: (entryId: string, factId: string, text: string, lang?: "es" | "en") => void;
  onRemoveFact: (entryId: string, factId: string) => void;
  onApproveTitle: (entryId: string, titleId: string) => void;
  onRejectTitle: (entryId: string, titleId: string) => void;
  onApproveFact: (entryId: string, factId: string) => void;
  onRejectFact: (entryId: string, factId: string) => void;
  onConfirmFactRemoval?: (entryId: string, factId: string) => void;
  onDismissFactRemoval?: (entryId: string, factId: string) => void;
}) {
  // Por defecto, todas las entradas están siempre cerradas para una vista limpia y compacta
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateEntry = () => {
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
          ? "Proyecto o Repositorio"
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

    // Expandir únicamente la nueva entrada y resaltarla
    setExpandedIds({ [newId]: true });
    setHighlightedEntryId(newId);

    // Scroll suave y autofocus en el primer campo a completar
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

    // Desvanecer el resaltado sutil después de 1.6s
    setTimeout(() => {
      setHighlightedEntryId((prev) => (prev === newId ? null : prev));
    }, 1600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {kind === "experience"
              ? "Cargos e historial laboral con logros clave."
              : kind === "project"
                ? "Proyectos relevantes, código abierto o productos construidos."
                : "Títulos académicos, certificaciones o cursos destacados."}
          </p>
        </div>
        <button
          onClick={handleCreateEntry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva entrada
        </button>
      </div>

      <div className="space-y-2.5">
        {entries.map((entry) => {
          const isExpanded = Boolean(expandedIds[entry.id]);
          const isHighlighted = highlightedEntryId === entry.id;

          return (
            <EntryCardItem
              key={entry.id}
              entry={entry}
              activeEditLang={activeEditLang}
              isExpanded={isExpanded}
              isHighlighted={isHighlighted}
              onToggle={() => toggleExpand(entry.id)}
              onUpdateEntry={onUpdateEntry}
              onRemoveEntry={onRemoveEntry}
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
          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
            No tenés registros de {title.toLowerCase()} cargados todavía.
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCardItem({
  entry,
  activeEditLang = "es",
  isExpanded,
  isHighlighted,
  onToggle,
  onUpdateEntry,
  onRemoveEntry,
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
  entry: Entry;
  activeEditLang?: "es" | "en";
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggle: () => void;
  onUpdateEntry: (id: string, e: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onUpsertEntryTitle?: (entryId: string, titleText: string, lang?: "es" | "en") => void;
  onAddFact: (entryId: string, f: Fact) => void;
  onUpdateFactText?: (entryId: string, factId: string, text: string, lang?: "es" | "en") => void;
  onRemoveFact: (entryId: string, factId: string) => void;
  onApproveTitle: (entryId: string, titleId: string) => void;
  onRejectTitle: (entryId: string, titleId: string) => void;
  onApproveFact: (entryId: string, factId: string) => void;
  onRejectFact: (entryId: string, factId: string) => void;
  onConfirmFactRemoval?: (entryId: string, factId: string) => void;
  onDismissFactRemoval?: (entryId: string, factId: string) => void;
}) {
  const [showNewFact, setShowNewFact] = useState(false);
  const [newFactText, setNewFactText] = useState("");
  const [newFactPriority, setNewFactPriority] = useState(100);

  const [showNewTitle, setShowNewTitle] = useState(false);
  const [newTitleText, setNewTitleText] = useState("");
  const [newTitleArchetype, setNewTitleArchetype] = useState("");

  const currentLangTitle =
    entry.titles.find((t) => (t.lang || "es") === activeEditLang)?.title || "";
  const fallbackTitle =
    entry.titles.find((t) => t.is_default)?.title ||
    entry.titles[0]?.title ||
    "Entrada sin título";

  const displayTitle =
    (activeEditLang === "en" ? currentLangTitle : "") ||
    fallbackTitle ||
    "Entrada sin título";

  const pendingTitlesCount = entry.titles.filter((t) => t.approved === false).length;
  const pendingFactsCount = entry.facts.filter(
    (f) => f.approved === false || Boolean(f.proposed_text)
  ).length;
  const totalPending = pendingTitlesCount + pendingFactsCount;

  const handleAddFactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    const factId = `fact_${Date.now()}`;
    onAddFact(entry.id, {
      id: factId,
      entry_id: entry.id,
      text: newFactText.trim(),
      text_en: activeEditLang === "en" ? newFactText.trim() : undefined,
      lang: activeEditLang,
      weight: Number(newFactPriority) || 100,
      tags: [],
      skill_ids: [],
      source: "user",
      approved: true,
    });
    setNewFactText("");
    setShowNewFact(false);
  };

  const handleAddTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleText.trim()) return;
    const titleId = `title_${Date.now()}`;
    onAddTitle(entry.id, {
      id: titleId,
      entry_id: entry.id,
      title: newTitleText.trim(),
      archetype: newTitleArchetype.trim() || undefined,
      lang: activeEditLang,
      is_default: entry.titles.length === 0,
      source: "user",
      approved: true,
    });
    setNewTitleText("");
    setNewTitleArchetype("");
    setShowNewTitle(false);
  };

  return (
    <div
      id={`entry-card-${entry.id}`}
      className={`rounded-xl overflow-hidden transition-all duration-300 border ${
        isHighlighted
          ? "border-emerald-500/80 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04]"
          : isExpanded
            ? "bg-zinc-950 border-zinc-800"
            : "bg-zinc-950/60 hover:bg-zinc-900/40 border-zinc-800/60"
      }`}
    >
      {/* Resumen / Fila de Acordeón */}
      <div
        onClick={onToggle}
        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
            aria-label="Expandir/colapsar"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-300" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100 truncate">
                {displayTitle}
              </span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-400 truncate">{entry.org}</span>
              {activeEditLang === "en" && !currentLangTitle && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Falta EN
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
              <span>
                {entry.start_date} — {entry.end_date || "presente"}
              </span>
              {entry.location && <span>· {entry.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalPending > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Sparkles className="w-3 h-3" />
              {totalPending}
            </span>
          )}
          <span className="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {entry.facts.length} {entry.facts.length === 1 ? "logro" : "logros"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveEntry(entry.id);
            }}
            className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
            title="Eliminar entrada completa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cuerpo Desplegable */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-zinc-900 space-y-5 bg-zinc-950/40">
          {/* Título y Rol en el idioma activo */}
          <div className="pt-2">
            <Field label={`Título / Puesto (${activeEditLang === "en" ? "Inglés" : "Español"})`}>
              <input
                type="text"
                value={currentLangTitle}
                onChange={(e) => onUpsertEntryTitle?.(entry.id, e.target.value, activeEditLang)}
                placeholder={
                  activeEditLang === "en"
                    ? (fallbackTitle ? `Traducción de "${fallbackTitle}"` : "Software Engineer")
                    : "Desarrollador Backend"
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
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
                onChange={(e) => onUpdateEntry(entry.id, { org: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </Field>
            <Field label="Ubicación">
              <input
                type="text"
                value={entry.location || ""}
                onChange={(e) => onUpdateEntry(entry.id, { location: e.target.value })}
                placeholder="Ciudad, País o Remoto"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </Field>
            <Field label="Fecha Inicio">
              <input
                type="text"
                value={entry.start_date}
                placeholder="YYYY-MM"
                onChange={(e) => onUpdateEntry(entry.id, { start_date: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </Field>
            <Field label="Fecha Fin">
              <input
                type="text"
                value={entry.end_date || ""}
                placeholder="YYYY-MM o present"
                onChange={(e) => onUpdateEntry(entry.id, { end_date: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </Field>
          </div>

          {/* Contexto de fondo para destilar IA */}
          <Field label="Contexto adicional (opcional, para destilar logros con IA)">
            <textarea
              rows={2}
              placeholder="Describí tus funciones principales, stack o responsabilidades generales..."
              value={entry.context || ""}
              onChange={(e) => onUpdateEntry(entry.id, { context: e.target.value })}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 resize-y"
            />
          </Field>

          {/* Títulos / Variantes */}
          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Títulos o roles alternativos
              </span>
              <button
                type="button"
                onClick={() => setShowNewTitle(!showNewTitle)}
                className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Agregar variante de título
              </button>
            </div>

            {showNewTitle && (
              <form
                onSubmit={handleAddTitleSubmit}
                className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800"
              >
                <input
                  type="text"
                  placeholder="Título (ej: Fullstack Engineer)"
                  value={newTitleText}
                  onChange={(e) => setNewTitleText(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
                <input
                  type="text"
                  placeholder="Arquetipo (ej: backend)"
                  value={newTitleArchetype}
                  onChange={(e) => setNewTitleArchetype(e.target.value)}
                  className="w-32 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium cursor-pointer"
                >
                  Guardar
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              {entry.titles.map((t) => {
                const isPending = t.approved === false;
                return (
                  <div
                    key={t.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
                      isPending
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                        : t.is_default
                          ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-medium"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span>{t.title}</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400 uppercase">
                      {t.lang || "es"}
                    </span>
                    {t.archetype && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ({t.archetype})
                      </span>
                    )}

                    {isPending ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() => onApproveTitle(entry.id, t.id)}
                          className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                          title="Aprobar título"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectTitle(entry.id, t.id)}
                          className="text-red-400 hover:text-red-300 p-0.5 cursor-pointer"
                          title="Descartar título"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      entry.titles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveTitle(entry.id, t.id)}
                          className="text-zinc-500 hover:text-red-400 ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logros / Viñetas */}
          <div className="space-y-3 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Logros y viñetas verificables
              </span>
              <button
                type="button"
                onClick={() => setShowNewFact(!showNewFact)}
                className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Agregar logro
              </button>
            </div>

            {showNewFact && (
              <form
                onSubmit={handleAddFactSubmit}
                className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800"
              >
                <textarea
                  rows={2}
                  placeholder="Describí tu impacto, métrica o hito técnico logrado..."
                  value={newFactText}
                  onChange={(e) => setNewFactText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-y"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Prioridad:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newFactPriority}
                      onChange={(e) => setNewFactPriority(Number(e.target.value))}
                      className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewFact(false)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium cursor-pointer"
                    >
                      Guardar logro
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {entry.facts.map((fact) => {
                const isNewAiFact = fact.approved === false;
                const hasProposal = Boolean(fact.proposed_text);

                return (
                  <div
                    key={fact.id}
                    className={`rounded-lg p-2.5 text-xs transition border group ${
                      isNewAiFact
                        ? "bg-amber-500/10 border-amber-500/40"
                        : hasProposal
                          ? "bg-violet-500/10 border-violet-500/40"
                          : "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        {isNewAiFact && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ✨ Sugerencia IA pendiente
                            </span>
                          </div>
                        )}
                        {fact.marked_for_removal && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                                ⚠️ Sugerencia IA: Viñeta redundante o repetida
                              </span>
                              <p className="text-zinc-300 text-[11px]">{fact.removal_reason || "Contenido repetido con otra viñeta."}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onConfirmFactRemoval?.(entry.id, fact.id)}
                                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium transition cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => onDismissFactRemoval?.(entry.id, fact.id)}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                              >
                                Conservar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Edición contextual por idioma (ES / EN) */}
                        <div className="space-y-1">
                          <textarea
                            rows={2}
                            value={activeEditLang === "en" ? (fact.text_en ?? "") : fact.text}
                            onChange={(e) =>
                              onUpdateFactText?.(
                                entry.id,
                                fact.id,
                                e.target.value,
                                activeEditLang
                              )
                            }
                            placeholder={
                              activeEditLang === "en"
                                ? (fact.text ? `Traducción al inglés de: "${fact.text.slice(0, 60)}..."` : "Traducí este logro al inglés...")
                                : "Describí tu impacto, métrica o hito técnico logrado..."
                            }
                            className={`w-full bg-zinc-950/80 border rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-y transition ${
                              hasProposal ? "line-through text-zinc-400 border-zinc-800" : "border-zinc-800"
                            }`}
                          />

                          {activeEditLang === "en" && !fact.text_en && fact.text && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 pl-1">
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                Pendiente EN
                              </span>
                              <span className="truncate italic">Base ES: "{fact.text}"</span>
                            </div>
                          )}

                          {activeEditLang === "es" && fact.text_en && (
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pl-1">
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                EN
                              </span>
                              <span className="truncate italic">"{fact.text_en}"</span>
                            </div>
                          )}
                        </div>

                        {hasProposal && (
                          <div className="p-2 rounded bg-zinc-950/90 border border-violet-500/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-violet-300">
                                ✨ Redacción mejorada sugerida:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onApproveFact(entry.id, fact.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  Aceptar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRejectFact(entry.id, fact.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  Conservar
                                </button>
                              </div>
                            </div>
                            <p className="text-zinc-100 font-medium">{fact.proposed_text}</p>
                          </div>
                        )}
                      </div>

                      {isNewAiFact ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApproveFact(entry.id, fact.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition cursor-pointer"
                            title="Aprobar logro"
                          >
                            <Check className="w-3 h-3" />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectFact(entry.id, fact.id)}
                            className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition cursor-pointer"
                            title="Descartar logro"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveFact(entry.id, fact.id)}
                          className="text-zinc-600 hover:text-red-400 opacity-40 group-hover:opacity-100 transition p-1 cursor-pointer"
                          title="Eliminar logro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {entry.facts.length === 0 && (
                <div className="text-[11px] text-zinc-500 italic py-1">
                  Esta entrada aún no tiene viñetas o logros agregados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

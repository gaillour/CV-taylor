"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Check,
  FolderGit2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { TopNav } from "@/components/nav/TopNav";
import { useProfileStore } from "@/store/useProfileStore";
import { Entry, EntryKind, EntryTitle, Fact, Profile, Skill } from "@/types/cv";

type SectionTab = "general" | "skills" | "experience" | "project" | "education";

export default function ProfilePage() {
  const {
    profile,
    loading,
    saving,
    dirty,
    error,
    fetchProfile,
    saveProfile,
    updateFullName,
    updateContact,
    updateSummary,
    addSkill,
    removeSkill,
    addEntry,
    updateEntry,
    removeEntry,
    addTitle,
    removeTitle,
    addFact,
    removeFact,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<SectionTab>("general");
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    const ok = await saveProfile();
    if (ok) {
      setSaveToast("Perfil maestro guardado exitosamente");
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Cargando perfil maestro...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl max-w-md text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">No se pudo cargar el perfil maestro.</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
            <button
              onClick={() => fetchProfile()}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <TopNav />

      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              Perfil Maestro
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              v{profile.schema_version}
            </span>
            {dirty ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Cambios sin guardar
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                <Check className="w-3 h-3" />
                Sincronizado
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Fuente única de verdad. Toda adaptación generada en la app se nutre de este banco.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition">
              <Check className="w-3.5 h-3.5" />
              {saveToast}
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-md flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-lg shadow-sm transition"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-1">
          <TabButton
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            icon={<User className="w-4 h-4" />}
            label="Datos Generales"
            badge="Contacto"
          />
          <TabButton
            active={activeTab === "skills"}
            onClick={() => setActiveTab("skills")}
            icon={<Layers className="w-4 h-4" />}
            label="Habilidades"
            badge={`${profile.skills.length}`}
          />
          <TabButton
            active={activeTab === "experience"}
            onClick={() => setActiveTab("experience")}
            icon={<Briefcase className="w-4 h-4" />}
            label="Experiencia"
            badge={`${profile.entries.filter((e) => e.kind === "experience").length}`}
          />
          <TabButton
            active={activeTab === "project"}
            onClick={() => setActiveTab("project")}
            icon={<FolderGit2 className="w-4 h-4" />}
            label="Proyectos"
            badge={`${profile.entries.filter((e) => e.kind === "project").length}`}
          />
          <TabButton
            active={activeTab === "education"}
            onClick={() => setActiveTab("education")}
            icon={<GraduationCap className="w-4 h-4" />}
            label="Educación"
            badge={`${profile.entries.filter((e) => e.kind === "education").length}`}
          />
        </aside>

        {/* Content Panel */}
        <main className="flex-1 min-w-0 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          {activeTab === "general" && (
            <GeneralTab
              fullName={profile.full_name}
              contact={profile.contact}
              summary={profile.summary || ""}
              summaryEn={profile.summary_en || ""}
              onUpdateFullName={updateFullName}
              onUpdateContact={updateContact}
              onUpdateSummary={updateSummary}
            />
          )}

          {activeTab === "skills" && (
            <SkillsTab
              skills={profile.skills}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
            />
          )}

          {activeTab === "experience" && (
            <EntriesTab
              kind="experience"
              title="Experiencia Laboral"
              entries={profile.entries.filter((e) => e.kind === "experience")}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onAddFact={addFact}
              onRemoveFact={removeFact}
            />
          )}

          {activeTab === "project" && (
            <EntriesTab
              kind="project"
              title="Proyectos Destacados"
              entries={profile.entries.filter((e) => e.kind === "project")}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onAddFact={addFact}
              onRemoveFact={removeFact}
            />
          )}

          {activeTab === "education" && (
            <EntriesTab
              kind="education"
              title="Formación y Educación"
              entries={profile.entries.filter((e) => e.kind === "education")}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onAddFact={addFact}
              onRemoveFact={removeFact}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
        active
          ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? "text-emerald-400" : "text-zinc-500"}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            active ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800/80 text-zinc-500"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------
// Sub-tabs
// ----------------------------------------------------------------------

function GeneralTab({
  fullName,
  contact,
  summary,
  summaryEn,
  onUpdateFullName,
  onUpdateContact,
  onUpdateSummary,
}: {
  fullName: string;
  contact: Profile["contact"];
  summary: string;
  summaryEn: string;
  onUpdateFullName: (name: string) => void;
  onUpdateContact: (c: Partial<Profile["contact"]>) => void;
  onUpdateSummary: (s: string, lang?: "es" | "en") => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">Datos Personales y Contacto</h2>
        <p className="text-xs text-zinc-400">Información de cabecera estándar de tus CVs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre Completo">
          <input
            type="text"
            value={fullName}
            onChange={(e) => onUpdateFullName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={contact.email}
            onChange={(e) => onUpdateContact({ email: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>

        <Field label="Teléfono">
          <input
            type="text"
            value={contact.phone}
            onChange={(e) => onUpdateContact({ phone: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>

        <Field label="Ubicación">
          <input
            type="text"
            value={contact.location}
            onChange={(e) => onUpdateContact({ location: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>

        <Field label="GitHub">
          <input
            type="text"
            value={contact.github || ""}
            onChange={(e) => onUpdateContact({ github: e.target.value })}
            placeholder="github.com/usuario"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>

        <Field label="LinkedIn">
          <input
            type="text"
            value={contact.linkedin || ""}
            onChange={(e) => onUpdateContact({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/usuario"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </Field>
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Resumen Profesional</h2>
          <p className="text-xs text-zinc-400">Párrafo de perfil profesional general.</p>
        </div>

        <Field label="Resumen (Español)">
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => onUpdateSummary(e.target.value, "es")}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-y"
          />
        </Field>

        <Field label="Resumen (Inglés)">
          <textarea
            rows={3}
            value={summaryEn}
            onChange={(e) => onUpdateSummary(e.target.value, "en")}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-y"
          />
        </Field>
      </div>
    </div>
  );
}

function SkillsTab({
  skills,
  onAddSkill,
  onRemoveSkill,
}: {
  skills: Skill[];
  onAddSkill: (s: Skill) => void;
  onRemoveSkill: (id: string) => void;
}) {
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCat, setNewSkillCat] = useState("Lenguajes");
  const [newSkillLevel, setNewSkillLevel] = useState("");

  const categories = Array.from(new Set(skills.map((s) => s.category))).sort();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const cleanId = `skill_${newSkillName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    onAddSkill({
      id: cleanId,
      name: newSkillName.trim(),
      category: newSkillCat.trim() || "Otros",
      level: newSkillLevel.trim() || undefined,
      aliases: [newSkillName.toLowerCase().trim()],
      tags: [],
    });
    setNewSkillName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Catálogo de Habilidades</h2>
          <p className="text-xs text-zinc-400">
            Skills canónicas para matching ATS y anti-alucinación.
          </p>
        </div>
      </div>

      {/* Form rápida para agregar */}
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-2 bg-zinc-950/70 border border-zinc-800 p-3 rounded-lg"
      >
        <input
          type="text"
          placeholder="Nombre (ej: FastAPI, Docker)"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <input
          type="text"
          placeholder="Categoría (ej: Lenguajes, DevOps)"
          value={newSkillCat}
          onChange={(e) => setNewSkillCat(e.target.value)}
          className="w-36 bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <input
          type="text"
          placeholder="Nivel (ej: Avanzado)"
          value={newSkillLevel}
          onChange={(e) => setNewSkillLevel(e.target.value)}
          className="w-28 bg-zinc-900 border border-zinc-700/80 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </form>

      {/* Lista agrupada */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catSkills = skills.filter((s) => s.category === cat);
          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {cat} ({catSkills.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {catSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800/80 rounded px-2.5 py-1.5 text-xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-200 truncate flex items-center gap-1.5">
                        <span>{skill.name}</span>
                        {skill.level && (
                          <span className="text-[10px] text-zinc-500 font-normal">
                            ({skill.level})
                          </span>
                        )}
                      </div>
                      {skill.aliases && skill.aliases.length > 0 && (
                        <div className="text-[10px] text-zinc-500 truncate">
                          {skill.aliases.slice(0, 3).join(", ")}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveSkill(skill.id)}
                      className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                      title="Eliminar skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntriesTab({
  kind,
  title,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onAddTitle,
  onRemoveTitle,
  onAddFact,
  onRemoveFact,
}: {
  kind: EntryKind;
  title: string;
  entries: Entry[];
  onAddEntry: (e: Entry) => void;
  onUpdateEntry: (id: string, e: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onAddFact: (entryId: string, f: Fact) => void;
  onRemoveFact: (entryId: string, factId: string) => void;
}) {
  const handleCreateEntry = () => {
    const newId = `${kind}_${Date.now()}`;
    const newTitleId = `title_${Date.now()}`;
    const newEntry: Entry = {
      id: newId,
      kind,
      org: kind === "experience" ? "Nueva Empresa" : kind === "project" ? "Nuevo Proyecto" : "Institución",
      start_date: "2024-01-01",
      end_date: "present",
      titles: [
        {
          id: newTitleId,
          entry_id: newId,
          title: kind === "experience" ? "Desarrollador" : "Proyecto Principal",
          is_default: true,
          approved: true,
        },
      ],
      facts: [],
    };
    onAddEntry(newEntry);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          <p className="text-xs text-zinc-400">
            Entradas estructuradas con títulos multi-arquetipo y banco de hechos (facts).
          </p>
        </div>
        <button
          onClick={handleCreateEntry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva entrada
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onUpdateEntry={onUpdateEntry}
            onRemoveEntry={onRemoveEntry}
            onAddTitle={onAddTitle}
            onRemoveTitle={onRemoveTitle}
            onAddFact={onAddFact}
            onRemoveFact={onRemoveFact}
          />
        ))}

        {entries.length === 0 && (
          <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
            No hay entradas de {title.toLowerCase()} registradas.
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onUpdateEntry,
  onRemoveEntry,
  onAddTitle,
  onRemoveTitle,
  onAddFact,
  onRemoveFact,
}: {
  entry: Entry;
  onUpdateEntry: (id: string, e: Partial<Entry>) => void;
  onRemoveEntry: (id: string) => void;
  onAddTitle: (entryId: string, t: EntryTitle) => void;
  onRemoveTitle: (entryId: string, titleId: string) => void;
  onAddFact: (entryId: string, f: Fact) => void;
  onRemoveFact: (entryId: string, factId: string) => void;
}) {
  const [showNewFact, setShowNewFact] = useState(false);
  const [newFactText, setNewFactText] = useState("");
  const [newFactPriority, setNewFactPriority] = useState(100);

  const [showNewTitle, setShowNewTitle] = useState(false);
  const [newTitleText, setNewTitleText] = useState("");
  const [newTitleArchetype, setNewTitleArchetype] = useState("");

  const handleAddFactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    const factId = `fact_${Date.now()}`;
    onAddFact(entry.id, {
      id: factId,
      entry_id: entry.id,
      text: newFactText.trim(),
      weight: Number(newFactPriority) || 100,
      tags: [],
      skill_ids: [],
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
      is_default: entry.titles.length === 0,
      approved: true,
    });
    setNewTitleText("");
    setNewTitleArchetype("");
    setShowNewTitle(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
      {/* Cabecera de la entrada */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Organización / Empresa">
            <input
              type="text"
              value={entry.org}
              onChange={(e) => onUpdateEntry(entry.id, { org: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </Field>
          <Field label="Ubicación">
            <input
              type="text"
              value={entry.location || ""}
              onChange={(e) => onUpdateEntry(entry.id, { location: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </Field>
          <Field label="Inicio (YYYY-MM)">
            <input
              type="text"
              value={entry.start_date}
              onChange={(e) => onUpdateEntry(entry.id, { start_date: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </Field>
          <Field label="Fin (YYYY-MM o 'present')">
            <input
              type="text"
              value={entry.end_date || ""}
              onChange={(e) => onUpdateEntry(entry.id, { end_date: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50"
            />
          </Field>
        </div>
        <button
          onClick={() => onRemoveEntry(entry.id)}
          className="text-zinc-600 hover:text-red-400 p-1.5 rounded transition"
          title="Eliminar entrada completa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Títulos / Arquetipos */}
      <div className="pt-2 border-t border-zinc-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Títulos de la entrada ({entry.titles.length})
          </span>
          <button
            onClick={() => setShowNewTitle(!showNewTitle)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Agregar título alternativo
          </button>
        </div>

        {showNewTitle && (
          <form
            onSubmit={handleAddTitleSubmit}
            className="flex items-center gap-2 bg-zinc-900/60 p-2.5 rounded border border-zinc-800"
          >
            <input
              type="text"
              placeholder="Título (ej: Desarrollador Backend)"
              value={newTitleText}
              onChange={(e) => setNewTitleText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100"
            />
            <input
              type="text"
              placeholder="Arquetipo (ej: backend)"
              value={newTitleArchetype}
              onChange={(e) => setNewTitleArchetype(e.target.value)}
              className="w-36 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded"
            >
              Guardar
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {entry.titles.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                t.is_default
                  ? "bg-zinc-800 border-emerald-500/30 text-zinc-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300"
              }`}
            >
              <span className="font-medium">{t.title}</span>
              {t.archetype && (
                <span className="text-[10px] font-mono px-1 py-0.2 bg-zinc-950 text-emerald-400 rounded">
                  {t.archetype}
                </span>
              )}
              {t.is_default && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">
                  default
                </span>
              )}
              {entry.titles.length > 1 && (
                <button
                  onClick={() => onRemoveTitle(entry.id, t.id)}
                  className="text-zinc-500 hover:text-red-400 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Banco de hechos (Facts) */}
      <div className="pt-2 border-t border-zinc-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Hechos atómicos / Viñetas ({entry.facts.length})
          </span>
          <button
            onClick={() => setShowNewFact(!showNewFact)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Agregar hecho
          </button>
        </div>

        {showNewFact && (
          <form
            onSubmit={handleAddFactSubmit}
            className="space-y-2 bg-zinc-900/60 p-3 rounded border border-zinc-800"
          >
            <textarea
              rows={2}
              placeholder="Descripción del logro o hecho verificable..."
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 resize-y"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Peso:</span>
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
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded"
                >
                  Guardar hecho
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-1.5">
          {entry.facts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-start justify-between gap-3 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 rounded p-2 text-xs transition group"
            >
              <div className="flex-1 space-y-1">
                <p className="text-zinc-200">{fact.text}</p>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>peso: {fact.weight}</span>
                  {fact.skill_ids && fact.skill_ids.length > 0 && (
                    <span>skills: {fact.skill_ids.join(", ")}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveFact(entry.id, fact.id)}
                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1"
                title="Eliminar hecho"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {entry.facts.length === 0 && (
            <div className="text-[11px] text-zinc-600 italic">
              Esta entrada aún no contiene viñetas o hechos atómicos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-zinc-400 block">{label}</label>
      {children}
    </div>
  );
}

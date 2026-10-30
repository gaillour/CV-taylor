"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Briefcase,
  Check,
  Eye,
  FolderGit2,
  GraduationCap,
  Layers,
  Loader2,
  Save,
  Sparkles,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { CvDropzone } from "@/components/profile/CvDropzone";
import { EntriesTab } from "@/components/profile/tabs/EntriesTab";
import { GeneralTab } from "@/components/profile/tabs/GeneralTab";
import { SkillsTab } from "@/components/profile/tabs/SkillsTab";
import {
  countPendingSuggestions,
  isProfileEmpty,
  useProfileStore,
} from "@/store/useProfileStore";
import { EntryKind } from "@/types/cv";

type SectionTab = "general" | "skills" | "experience" | "project" | "education";

export default function ProfilePage() {
  const {
    profile,
    mirror,
    mirrorLoading,
    swappingBase,
    viewLang,
    setViewLang,
    swapBaseLang,
    loading,
    saving,
    enhancing,
    canEnhanceAfterImport,
    dirty,
    error,
    fetchProfile,
    saveProfile,
    enhanceProfile,
    dismissImportPrompt,
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
    upsertEntryTitle,
    addFact,
    updateFactText,
    removeFact,
    approveSkill,
    rejectSkill,
    approveTitle,
    rejectTitle,
    approveFact,
    rejectFact,
    confirmFactRemoval,
    dismissFactRemoval,
    confirmSkillRemoval,
    dismissSkillRemoval,
    approveAllSuggestions,
    rejectAllSuggestions,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<SectionTab>("general");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    const ok = await saveProfile();
    if (ok) {
      setSaveToast("Perfil guardado exitosamente");
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleEnhance = async () => {
    const ok = await enhanceProfile();
    if (ok) {
      setSaveToast("Sugerencias IA generadas. Revisá y aprobá las que quieras conservar.");
      setTimeout(() => setSaveToast(null), 4500);
    }
  };

  const handleSwapBase = async () => {
    const ok = await swapBaseLang();
    if (ok) {
      setSaveToast("Idioma base actualizado");
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs">Cargando perfil...</span>
          </div>
        </div>
      </div>
    );
  }

  if (profile && isProfileEmpty(profile) && !manualMode) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span>Tu Perfil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Cargá tu Currículum
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Subí tu CV para organizar automáticamente tu experiencia, educación y habilidades.
            </p>
          </div>

          <CvDropzone />

          <div className="mt-8 text-center">
            <button
              onClick={() => setManualMode(true)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4 cursor-pointer"
            >
              ¿Preferís empezar desde cero? Completar perfil manualmente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl max-w-md text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium text-xs">No se pudo cargar el perfil.</p>
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

  const baseLang = profile.base_lang || "es";
  const isViewingMirror = viewLang !== baseLang;
  const displayedProfile = isViewingMirror ? mirror || profile : profile;

  const pendingCount = countPendingSuggestions(profile);
  const pendingSkillsCount = profile.skills.filter((s) => s.approved === false).length;
  const countEntryPending = (kind: EntryKind) =>
    profile.entries
      .filter((e) =>
        kind === "project"
          ? e.kind === "project" || e.kind === ("projects" as EntryKind)
          : e.kind === kind
      )
      .reduce(
        (acc, e) =>
          acc +
          e.titles.filter((t) => t.approved === false).length +
          e.facts.filter((f) => f.approved === false || Boolean(f.proposed_text)).length,
        0
      );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              Perfil
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase">
              Base: {baseLang}
            </span>
            {dirty ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Cambios sin guardar
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                Sincronizado
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Base central de experiencia y habilidades para generar y adaptar tus CVs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch de Vista (Base vs Espejo ES / EN) */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewLang("es")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewLang === "es"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={baseLang === "es" ? "Idioma base (editable)" : "Espejo derivado (solo lectura)"}
            >
              <span>ES</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLang("en")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewLang === "en"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={baseLang === "en" ? "Idioma base (editable)" : "Espejo derivado (solo lectura)"}
            >
              <span>EN</span>
            </button>
          </div>

          {saveToast && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
              <Check className="w-3.5 h-3.5" />
              {saveToast}
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>Importar CV</span>
          </button>
          <button
            onClick={handleEnhance}
            disabled={enhancing || isViewingMirror}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-40 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-lg transition cursor-pointer"
            title="Pule viñetas y detecta redundancias con IA"
          >
            {enhancing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span>Acomodar con IA</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-lg shadow-sm transition cursor-pointer"
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

      {/* Banners Guiados */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-5 space-y-3">
        {isViewingMirror && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Vista espejo en <strong className="uppercase">{viewLang}</strong> (solo lectura). Se actualiza automáticamente al guardar tu perfil base (<strong className="uppercase">{baseLang}</strong>).
              </span>
              {mirrorLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 ml-1" />
              )}
            </div>
            <button
              type="button"
              onClick={handleSwapBase}
              disabled={swappingBase || dirty}
              title={
                dirty
                  ? "Guardá los cambios antes de cambiar el idioma base"
                  : `Convertir ${viewLang.toUpperCase()} en tu idioma base editable`
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 text-xs text-zinc-200 font-medium transition cursor-pointer shrink-0"
            >
              {swappingBase ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Usar {viewLang.toUpperCase()} como idioma base</span>
            </button>
          </div>
        )}

        {!isViewingMirror && canEnhanceAfterImport && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  CV importado. ¿Querés acomodarlo con IA?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Una pasada opcional para pulir la redacción de viñetas y detectar tecnologías ausentes sin inventar datos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={dismissImportPrompt}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition cursor-pointer"
              >
                Dejar así
              </button>
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition cursor-pointer"
              >
                {enhancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Acomodar con IA
              </button>
            </div>
          </div>
        )}

        {!isViewingMirror && pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  Tenés {pendingCount} {pendingCount === 1 ? "sugerencia" : "sugerencias"} de IA pendientes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Revisalas y aprobalas para que formen parte activa de tu perfil.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rejectAllSuggestions}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-red-300 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Descartar todas
              </button>
              <button
                onClick={approveAllSuggestions}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Aprobar todas ({pendingCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="max-w-6xl w-full mx-auto px-6 py-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-1">
          <TabButton
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            icon={<User className="w-4 h-4" />}
            label="Datos Generales"
          />
          <TabButton
            active={activeTab === "skills"}
            onClick={() => setActiveTab("skills")}
            icon={<Layers className="w-4 h-4" />}
            label="Habilidades"
            badge={`${displayedProfile.skills.length}`}
            pendingCount={isViewingMirror ? 0 : pendingSkillsCount}
          />
          <TabButton
            active={activeTab === "experience"}
            onClick={() => setActiveTab("experience")}
            icon={<Briefcase className="w-4 h-4" />}
            label="Experiencia"
            badge={`${displayedProfile.entries.filter((e) => e.kind === "experience").length}`}
            pendingCount={isViewingMirror ? 0 : countEntryPending("experience")}
          />
          <TabButton
            active={activeTab === "project"}
            onClick={() => setActiveTab("project")}
            icon={<FolderGit2 className="w-4 h-4" />}
            label="Proyectos"
            badge={`${displayedProfile.entries.filter((e) => e.kind === "project" || e.kind === ("projects" as EntryKind)).length}`}
            pendingCount={isViewingMirror ? 0 : countEntryPending("project")}
          />
          <TabButton
            active={activeTab === "education"}
            onClick={() => setActiveTab("education")}
            icon={<GraduationCap className="w-4 h-4" />}
            label="Educación"
            badge={`${displayedProfile.entries.filter((e) => e.kind === "education").length}`}
            pendingCount={isViewingMirror ? 0 : countEntryPending("education")}
          />
        </aside>

        {/* Content Panel */}
        <main className="flex-1 min-w-0 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6">
          {activeTab === "general" && (
            <GeneralTab
              fullName={displayedProfile.full_name}
              contact={displayedProfile.contact}
              summary={displayedProfile.summary || ""}
              readOnly={isViewingMirror}
              onUpdateFullName={updateFullName}
              onUpdateContact={updateContact}
              onUpdateSummary={updateSummary}
            />
          )}

          {activeTab === "skills" && (
            <SkillsTab
              skills={displayedProfile.skills}
              readOnly={isViewingMirror}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
              onApproveSkill={approveSkill}
              onRejectSkill={rejectSkill}
              onConfirmSkillRemoval={confirmSkillRemoval}
              onDismissSkillRemoval={dismissSkillRemoval}
            />
          )}

          {activeTab === "experience" && (
            <EntriesTab
              kind="experience"
              title="Experiencia Laboral"
              entries={displayedProfile.entries.filter((e) => e.kind === "experience")}
              readOnly={isViewingMirror}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onUpsertEntryTitle={upsertEntryTitle}
              onAddFact={addFact}
              onUpdateFactText={updateFactText}
              onRemoveFact={removeFact}
              onApproveTitle={approveTitle}
              onRejectTitle={rejectTitle}
              onApproveFact={approveFact}
              onRejectFact={rejectFact}
              onConfirmFactRemoval={confirmFactRemoval}
              onDismissFactRemoval={dismissFactRemoval}
            />
          )}

          {activeTab === "project" && (
            <EntriesTab
              kind="project"
              title="Proyectos Destacados"
              entries={displayedProfile.entries.filter(
                (e) => e.kind === "project" || e.kind === ("projects" as EntryKind)
              )}
              readOnly={isViewingMirror}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onUpsertEntryTitle={upsertEntryTitle}
              onAddFact={addFact}
              onUpdateFactText={updateFactText}
              onRemoveFact={removeFact}
              onApproveTitle={approveTitle}
              onRejectTitle={rejectTitle}
              onApproveFact={approveFact}
              onRejectFact={rejectFact}
              onConfirmFactRemoval={confirmFactRemoval}
              onDismissFactRemoval={dismissFactRemoval}
            />
          )}

          {activeTab === "education" && (
            <EntriesTab
              kind="education"
              title="Formación y Educación"
              entries={displayedProfile.entries.filter((e) => e.kind === "education")}
              readOnly={isViewingMirror}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onRemoveEntry={removeEntry}
              onAddTitle={addTitle}
              onRemoveTitle={removeTitle}
              onUpsertEntryTitle={upsertEntryTitle}
              onAddFact={addFact}
              onUpdateFactText={updateFactText}
              onRemoveFact={removeFact}
              onApproveTitle={approveTitle}
              onRejectTitle={rejectTitle}
              onApproveFact={approveFact}
              onRejectFact={rejectFact}
              onConfirmFactRemoval={confirmFactRemoval}
              onDismissFactRemoval={dismissFactRemoval}
            />
          )}
        </main>
      </div>

      {/* Overlay de procesamiento IA */}
      {enhancing && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Sparkles className="w-6 h-6 animate-spin text-violet-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">Procesando perfil con IA</h3>
              <p className="text-xs text-zinc-400">
                Puliendo viñetas y chequeando consistencia y redundancias...
              </p>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CV */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Importar CV a tu Perfil
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Fusionará nuevas experiencias, variantes de puesto, logros y habilidades sin borrar tu información actual.
                </p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CvDropzone
              onSuccess={() => {
                setImportModalOpen(false);
                setSaveToast("CV fusionado en borrador. Revisá los datos y guardá los cambios.");
                setTimeout(() => setSaveToast(null), 4000);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  pendingCount = 0,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  pendingCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
        active
          ? "bg-zinc-800/90 text-zinc-100 shadow-sm border border-zinc-700/70"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? "text-emerald-400" : "text-zinc-500"}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {pendingCount > 0 && (
          <span
            title={`${pendingCount} sugerencias IA pendientes`}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
          >
            ✨ {pendingCount}
          </span>
        )}
        {badge && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              active ? "bg-zinc-700 text-zinc-200" : "bg-zinc-900 text-zinc-500"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

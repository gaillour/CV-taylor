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
  SlidersHorizontal,
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
    isManualMode,
    enableManualMode,
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
    moveEntry,
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
    return () => {
      // Al salir de la vista de perfil sin guardar, descartar sugerencias y prompts efímeros
      useProfileStore.getState().dismissImportPrompt();
    };
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

  if (profile && isProfileEmpty(profile) && !manualMode && !isManualMode) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#09090b] text-zinc-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
              Cargar Currículum
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Subí tu CV para extraer y estructurar automáticamente experiencia, proyectos y habilidades en tu perfil base.
            </p>
          </div>

          <CvDropzone />

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setManualMode(true);
                enableManualMode();
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4 cursor-pointer"
            >
              Completar perfil manualmente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#09090b] text-zinc-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-950/30 border border-red-500/20 text-red-300 p-6 rounded-xl max-w-md text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <p className="font-medium text-xs">No se pudo cargar el perfil.</p>
            <p className="text-xs text-red-300/80 mt-1 font-mono">{error}</p>
            <button
              onClick={() => fetchProfile()}
              className="mt-4 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-xs text-zinc-200 rounded-md transition cursor-pointer"
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
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#09090b] text-zinc-100">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-semibold tracking-tight text-zinc-100">
              Perfil maestro
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/[0.08] uppercase">
              base: {baseLang}
            </span>
            {dirty ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                cambios sin guardar
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                sincronizado
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Registro unificado de experiencia y habilidades para la adaptación a ofertas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch de Vista (Base vs Espejo ES / EN) */}
          <div className="flex items-center bg-zinc-900 border border-white/[0.08] p-0.5 rounded-md font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewLang("es")}
              className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                viewLang === "es"
                  ? "bg-zinc-800 text-zinc-100 border border-white/[0.06]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={baseLang === "es" ? "Idioma base (editable)" : "Espejo derivado (solo lectura)"}
            >
              <span>ES</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLang("en")}
              className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                viewLang === "en"
                  ? "bg-zinc-800 text-zinc-100 border border-white/[0.06]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={baseLang === "en" ? "Idioma base (editable)" : "Espejo derivado (solo lectura)"}
            >
              <span>EN</span>
            </button>
          </div>

          {saveToast && (
            <div className="text-xs font-mono text-zinc-300 bg-zinc-900 border border-white/[0.08] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {saveToast}
            </div>
          )}
          {error && (
            <div className="text-xs font-mono text-rose-300 bg-rose-950/40 border border-rose-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              {error}
            </div>
          )}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 text-xs font-medium rounded-md transition cursor-pointer"
          >
            <UploadCloud className="w-3 h-3 text-zinc-400" />
            <span>Importar CV</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-950 text-xs font-medium rounded-md transition cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin text-zinc-950" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Banners Guiados */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-5 space-y-3">
        {isViewingMirror && (
          <div className="bg-zinc-950 border border-white/[0.08] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5 text-zinc-300">
              <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                Vista espejo en <strong className="uppercase">{viewLang}</strong> (solo lectura). Se actualiza al guardar el perfil base (<strong className="uppercase">{baseLang}</strong>).
              </span>
              {mirrorLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400 ml-1" />
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-white/[0.08] text-xs text-zinc-200 transition cursor-pointer shrink-0"
            >
              {swappingBase ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowLeftRight className="w-3 h-3 text-zinc-400" />
              )}
              <span>Usar {viewLang.toUpperCase()} como base</span>
            </button>
          </div>
        )}

        {!isViewingMirror && canEnhanceAfterImport && (
          <div className="bg-zinc-950 border border-white/[0.08] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-zinc-900 border border-white/[0.08] text-violet-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  CV importado con éxito
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ¿Querés que la IA sugiera títulos alternativos por arquetipo (ej: Backend / Full Stack) y normalice viñetas para adaptar mejor tu CV a futuras ofertas?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={dismissImportPrompt}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-xs text-zinc-300 transition cursor-pointer"
              >
                Omitir
              </button>
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition cursor-pointer"
              >
                {enhancing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-950" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Enriquecer con IA
              </button>
            </div>
          </div>
        )}

        {!isViewingMirror && pendingCount > 0 && (
          <div className="bg-zinc-950 border border-white/[0.08] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-zinc-900 border border-white/[0.08] text-zinc-300 shrink-0 mt-0.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100 font-mono">
                  {pendingCount} {pendingCount === 1 ? "sugerencia pendiente" : "sugerencias pendientes"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Revisalas y aprobalas para consolidarlas en tu perfil.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rejectAllSuggestions}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
                Descartar todas
              </button>
              <button
                onClick={approveAllSuggestions}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition cursor-pointer"
              >
                <Check className="w-3 h-3" />
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
        <main className="flex-1 min-w-0 bg-zinc-950 border border-white/[0.08] rounded-xl p-6">
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
              onMoveEntry={moveEntry}
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
              onMoveEntry={moveEntry}
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
              onMoveEntry={moveEntry}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/[0.08] rounded-xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-zinc-100">Enriqueciendo perfil</h3>
              <p className="text-[11px] text-zinc-400">
                Generando títulos alternativos y normalizando redacción...
              </p>
            </div>
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden border border-white/[0.06]">
              <div className="bg-zinc-200 h-full w-2/3 transition-all duration-300" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CV */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  Importar CV a tu perfil
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Fusiona experiencias, logros y habilidades sin sobrescribir información verificada.
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
                setSaveToast("CV fusionado en borrador. Revisá y guardá los cambios.");
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
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
        active
          ? "bg-zinc-900 text-zinc-100 border border-white/[0.08]"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? "text-zinc-200" : "text-zinc-500"}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        {pendingCount > 0 && (
          <span
            title={`${pendingCount} sugerencias pendientes`}
            className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 tabular-nums"
          >
            {pendingCount}
          </span>
        )}
        {badge && (
          <span
            className={`px-1.5 py-0.5 rounded border border-white/[0.06] tabular-nums ${
              active ? "bg-zinc-800 text-zinc-200" : "bg-zinc-950 text-zinc-500"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

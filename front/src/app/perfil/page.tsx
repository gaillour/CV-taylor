"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Layers,
  Loader2,
  User,
  X,
} from "lucide-react";
import { CvDropzone } from "@/components/profile/CvDropzone";
import { ProfileTopBar } from "@/components/profile/header/ProfileTopBar";
import { ProfileAiBanners } from "@/components/profile/header/ProfileAiBanners";
import { EntriesTab } from "@/components/profile/tabs/EntriesTab";
import { GeneralTab } from "@/components/profile/tabs/GeneralTab";
import { SkillsTab } from "@/components/profile/tabs/SkillsTab";
import {
  countPendingSuggestions,
  isProfileEmpty,
  useProfileStore,
} from "@/store/useProfileStore";
import { buildRenderModelFromProfile, mergeProfileWithDraft } from "@/lib/api";
import {
  clearDraft,
  clearPendingAction,
  getPendingAction,
  loadDraft,
  saveDraft,
  savePendingAction,
} from "@/lib/draft";
import { getStoredSession } from "@/lib/supabase";
import { useCvStore } from "@/store/useCvStore";
import { confirmChoice } from "@/store/useConfirmStore";
import { Entry, EntryKind, Skill } from "@/types/cv";
import { toast } from "@/store/useToastStore";

type SectionTab = "general" | "skills" | "experience" | "project" | "education";

export default function ProfilePage() {
  const {
    profile,
    initialized,
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

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SectionTab>("general");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [generatingCv, setGeneratingCv] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const draftCheckHandledRef = useRef(false);

  useEffect(() => {
    const initProfile = async () => {
      const hasAuth = Boolean(getStoredSession()?.access_token);
      setIsAnonymous(!hasAuth);

      await fetchProfile();

      if (!hasAuth || draftCheckHandledRef.current) return;
      draftCheckHandledRef.current = true;

      const localDraft = loadDraft();
      const pending = getPendingAction();

      if (localDraft?.profile && isProfileEmpty(localDraft.profile)) {
        clearDraft();
        if (pending?.action === "save") clearPendingAction();
        return;
      }

      if (localDraft && localDraft.profile) {
        const cloudProfile = useProfileStore.getState().profile;
        const cloudEmpty = isProfileEmpty(cloudProfile);

        if (cloudEmpty) {
          useProfileStore.setState({
            profile: localDraft.profile,
            isManualMode: !isProfileEmpty(localDraft.profile),
          });
          await useProfileStore.getState().saveProfile().catch(() => false);
          clearDraft();
          if (pending?.action === "save") clearPendingAction();
          toast.success("Tu perfil fue guardado en tu cuenta.");
        } else {
          // Mostrar temporalmente el CV recién cargado mientras decide
          useProfileStore.setState({
            profile: localDraft.profile,
            isManualMode: true,
          });

          const draftName = localDraft.profile.full_name?.trim();
          const choice = await confirmChoice({
            title: "Ya tenés un perfil guardado en tu cuenta",
            message: `Subiste un CV nuevo${draftName ? ` (${draftName})` : ""}, pero tu cuenta ya tiene un perfil anterior. ¿Qué querés hacer con los datos que acabás de cargar?`,
            confirmText: "Reemplazar con el CV nuevo",
            secondaryText: "Sumar a mi perfil actual",
            cancelText: "Conservar perfil anterior",
            variant: "default",
          });

          if (choice === "confirm") {
            useProfileStore.setState({
              profile: localDraft.profile,
              dirty: false,
              isManualMode: true,
            });
            await useProfileStore.getState().saveProfile().catch(() => false);
            clearDraft();
            if (pending?.action === "save") clearPendingAction();
            toast.success("Tu perfil fue actualizado con el CV recién cargado.");
          } else if (choice === "secondary") {
            const merged = await mergeProfileWithDraft(localDraft.profile);
            useProfileStore.setState({
              profile: merged,
              dirty: false,
              isManualMode: !isProfileEmpty(merged),
            });
            clearDraft();
            if (pending?.action === "save") clearPendingAction();
            toast.success("Se sumaron los datos nuevos a tu perfil existente.");
          } else {
            useProfileStore.setState({
              profile: cloudProfile,
              dirty: false,
              isManualMode: !isProfileEmpty(cloudProfile),
            });
            clearDraft();
            if (pending?.action === "save") clearPendingAction();
            toast.info("Se conservó tu perfil guardado anterior.");
          }
        }
      } else if (pending?.action === "save") {
        clearPendingAction();
      }
    };

    initProfile();
    return () => {
      // Al salir de la vista de perfil sin guardar, descartar sugerencias y prompts efímeros
      useProfileStore.getState().dismissImportPrompt();
    };
  }, [fetchProfile]);

  const handleSave = async () => {
    const isAnon = !getStoredSession()?.access_token;
    if (isAnon) {
      if (profile) {
        const existingDraft = loadDraft();
        saveDraft(profile, existingDraft?.theme || "classic");
      }
      savePendingAction("save");
      router.push("/login?next=/perfil&action=save");
      return;
    }

    const ok = await saveProfile();
    if (ok) {
      setSaveToast("Perfil guardado exitosamente");
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleGenerateCv = async () => {
    if (!profile || generatingCv) return;
    setGeneratingCv(true);
    try {
      const isAnon = !getStoredSession()?.access_token;
      const existingDraft = loadDraft();
      const theme =
        existingDraft?.theme || useCvStore.getState().renderModel?.theme || "classic";

      if (dirty) {
        if (isAnon) {
          saveDraft(profile, theme);
          useProfileStore.setState({ dirty: false });
        } else {
          await saveProfile();
        }
      } else if (isAnon) {
        saveDraft(profile, theme);
      }

      const currentProfile = useProfileStore.getState().profile || profile;
      const model = await buildRenderModelFromProfile(currentProfile, theme);
      useCvStore.getState().loadAnonymousModel(model);
      router.push("/editor");
    } finally {
      setGeneratingCv(false);
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

  const handleSelectViewLang = async (lang: "es" | "en") => {
    if (lang === viewLang) return;
    if (lang !== baseLang && dirty) {
      toast.error("Guardá los cambios en tu perfil antes de ver la traducción");
      return;
    }
    await setViewLang(lang);
  };

  const handleGitHubImport = (newEntry: Entry, newSkills: Skill[]) => {
    addEntry(newEntry);
    if (newSkills && newSkills.length > 0) {
      const existingIds = new Set((profile?.skills || []).map((s) => s.id));
      const existingNames = new Set((profile?.skills || []).map((s) => s.name.toLowerCase()));
      for (const s of newSkills) {
        if (!existingIds.has(s.id) && !existingNames.has(s.name.toLowerCase())) {
          addSkill(s);
        }
      }
    }
    toast.success("Proyecto importado exitosamente desde GitHub.");
  };

  if ((!initialized || loading) && !profile) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-canvas text-text-primary flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-xs font-mono">Cargando perfil...</span>
          </div>
        </div>
      </div>
    );
  }

  if (profile && isProfileEmpty(profile) && !manualMode && !isManualMode) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-canvas text-text-primary flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
          <div className="text-center space-y-2 mb-8">
            <h1 className="font-display text-xl font-medium tracking-tight text-text-ivory">
              Cargar Currículum
            </h1>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
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
              className="text-xs text-text-muted hover:text-text-primary transition-colors underline underline-offset-4 cursor-pointer font-mono"
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
      <div className="flex-1 min-h-0 overflow-y-auto bg-canvas text-text-primary flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-danger-subtle border border-danger-border text-danger p-6 rounded-xl max-w-md text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-danger" />
            <p className="font-medium text-xs">No se pudo cargar el perfil.</p>
            <p className="text-xs text-danger/80 mt-1 font-mono">{error}</p>
            <button
              onClick={() => fetchProfile()}
              className="mt-4 px-3 py-1.5 btn-secondary text-xs rounded transition-colors cursor-pointer"
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
    <div className="flex-1 min-h-0 overflow-y-auto bg-canvas text-text-primary">
      {/* Header Sticky */}
      <ProfileTopBar
        baseLang={baseLang}
        viewLang={viewLang}
        dirty={dirty}
        saving={saving}
        isAnonymous={isAnonymous}
        canSave={isAnonymous ? !isProfileEmpty(profile) : dirty}
        generatingCv={generatingCv}
        saveToast={saveToast}
        error={error}
        swappingBase={swappingBase}
        onSelectViewLang={handleSelectViewLang}
        onSwapBase={handleSwapBase}
        onOpenImportModal={() => setImportModalOpen(true)}
        onSave={handleSave}
        onGenerateCv={handleGenerateCv}
      />

      {/* Banners Guiados */}
      <ProfileAiBanners
        isViewingMirror={isViewingMirror}
        viewLang={viewLang}
        baseLang={baseLang}
        mirrorLoading={mirrorLoading}
        swappingBase={swappingBase}
        dirty={dirty}
        onSwapBase={handleSwapBase}
        canEnhanceAfterImport={canEnhanceAfterImport}
        enhancing={enhancing}
        onDismissImportPrompt={dismissImportPrompt}
        onEnhance={handleEnhance}
        pendingCount={pendingCount}
        onApproveAllSuggestions={approveAllSuggestions}
        onRejectAllSuggestions={rejectAllSuggestions}
      />

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
        <main className="flex-1 min-w-0 bg-surface border border-hairline rounded-xl p-6">
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
              activeLang={displayedProfile.base_lang}
              readOnly={isViewingMirror}
              onAddEntry={addEntry}
              onImportGitHub={handleGitHubImport}
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
        <div className="fixed inset-0 z-50 bg-canvas/85 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-xl p-6 max-w-sm w-full shadow-lg flex flex-col items-center text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <div className="space-y-1">
              <h3 className="font-display text-sm font-medium text-text-ivory">Enriqueciendo perfil</h3>
              <p className="text-[11px] text-text-secondary">
                Generando títulos alternativos y normalizando redacción...
              </p>
            </div>
            <div className="w-full bg-surface-raised h-1 rounded-full overflow-hidden border border-hairline">
              <div className="bg-accent h-full w-2/3 transition-all duration-300" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CV */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative w-full max-w-lg bg-surface border border-hairline rounded-xl shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="font-display text-sm font-medium text-text-ivory">
                  Importar CV a tu perfil
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Fusiona experiencias, logros y habilidades sin sobrescribir información verificada.
                </p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 cursor-pointer transition-colors"
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
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        active
          ? "bg-surface text-text-ivory border border-hairline shadow-xs"
          : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? "text-accent" : "text-text-muted"}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        {pendingCount > 0 && (
          <span
            title={`${pendingCount} sugerencias pendientes`}
            className="text-[10px] text-warning font-medium tabular-nums flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            {pendingCount}
          </span>
        )}
        {badge && (
          <span
            className={`text-[11px] tabular-nums font-mono ${
              active ? "text-text-secondary" : "text-text-muted"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

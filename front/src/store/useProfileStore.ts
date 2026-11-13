import { create } from "zustand";
import {
  ContactInfo,
  EnhanceProfileResponse,
  EnhanceStats,
  Entry,
  EntryTitle,
  Fact,
  ImportProfileResponse,
  LangCode,
  MirrorResponse,
  MirrorStatus,
  Profile,
  Skill,
  SwapBaseResponse,
} from "@/types/cv";

import { API_BASE_URL, apiFetch, parseAnonymousCv } from "@/lib/api";
import { loadDraft, saveDraft } from "@/lib/draft";
import { DEFAULT_ANONYMOUS_PROFILE } from "@/lib/profileTransform";
import { getStoredSession } from "@/lib/supabase";
import * as mutators from "./profile/profileMutators";
import * as reducers from "./profile/profileSuggestionReducers";

export { API_BASE_URL };
export { isProfileEmpty, countPendingSuggestions } from "./profile/profileSuggestionReducers";

interface ProfileState {
  profile: Profile | null;
  mirror: Profile | null;
  mirrorStatus: MirrorStatus | null;
  mirrorLoading: boolean;
  swappingBase: boolean;
  viewLang: LangCode;
  loading: boolean;
  initialized: boolean;
  saving: boolean;
  importing: boolean;
  enhancing: boolean;
  canEnhanceAfterImport: boolean;
  lastEnhanceStats: EnhanceStats | null;
  lastImportInfo: { detectedLang: LangCode; translatedToBase: boolean } | null;
  dirty: boolean;
  isManualMode: boolean;
  error: string | null;

  setViewLang: (lang: LangCode) => Promise<void>;
  loadMirror: () => Promise<void>;
  swapBaseLang: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  saveProfile: () => Promise<boolean>;
  importProfile: (file: File, sourceLang?: "auto" | LangCode) => Promise<boolean>;
  enhanceProfile: () => Promise<boolean>;
  dismissImportPrompt: () => void;
  discardUnsavedChanges: () => Promise<void>;
  enableManualMode: () => void;
  setProfile: (updater: (prev: Profile) => Profile) => void;

  updateContact: (contact: Partial<ContactInfo>) => void;
  updateSummary: (text: string) => void;
  updateFullName: (name: string) => void;

  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;

  addEntry: (entry: Entry) => void;
  updateEntry: (id: string, entry: Partial<Entry>) => void;
  moveEntry: (id: string, direction: "up" | "down") => void;
  removeEntry: (id: string) => void;

  addTitle: (entryId: string, title: EntryTitle) => void;
  updateTitle: (entryId: string, titleId: string, title: Partial<EntryTitle>) => void;
  upsertEntryTitle: (entryId: string, titleText: string) => void;
  removeTitle: (entryId: string, titleId: string) => void;

  addFact: (entryId: string, fact: Fact) => void;
  updateFact: (entryId: string, factId: string, fact: Partial<Fact>) => void;
  updateFactText: (entryId: string, factId: string, text: string) => void;
  removeFact: (entryId: string, factId: string) => void;

  approveSkill: (skillId: string) => void;
  rejectSkill: (skillId: string) => void;
  approveTitle: (entryId: string, titleId: string) => void;
  rejectTitle: (entryId: string, titleId: string) => void;
  approveFact: (entryId: string, factId: string) => void;
  rejectFact: (entryId: string, factId: string) => void;
  confirmFactRemoval: (entryId: string, factId: string) => void;
  dismissFactRemoval: (entryId: string, factId: string) => void;
  confirmSkillRemoval: (skillId: string) => void;
  dismissSkillRemoval: (skillId: string) => void;
  approveAllSuggestions: () => void;
  rejectAllSuggestions: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  mirror: null,
  mirrorStatus: null,
  mirrorLoading: false,
  swappingBase: false,
  viewLang: "es",
  loading: false,
  initialized: false,
  saving: false,
  importing: false,
  enhancing: false,
  canEnhanceAfterImport: false,
  lastEnhanceStats: null,
  lastImportInfo: null,
  dirty: false,
  isManualMode: false,
  error: null,

  setViewLang: async (lang) => {
    const { profile, mirror, dirty } = get();
    // No permitir cambiar al espejo derivado si hay cambios sin guardar
    if (profile && lang !== profile.base_lang && dirty) {
      return;
    }
    set({ viewLang: lang });
    if (profile && lang !== profile.base_lang && !mirror) {
      await get().loadMirror();
    }
  },

  loadMirror: async () => {
    if (!getStoredSession()?.access_token) {
      return;
    }
    set({ mirrorLoading: true });
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile/mirror`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as MirrorResponse;
      set({ mirror: data.profile, mirrorStatus: data.mirror_status, mirrorLoading: false });
    } catch {
      set({ mirrorLoading: false });
    }
  },

  swapBaseLang: async () => {
    if (!getStoredSession()?.access_token) {
      const { profile, viewLang } = get();
      if (!profile) return false;
      const updated: Profile = { ...profile, base_lang: viewLang };
      const existingDraft = loadDraft();
      saveDraft(updated, existingDraft?.theme || "classic");
      set({ profile: updated, dirty: false, error: null });
      return true;
    }
    set({ swappingBase: true, error: null });
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile/swap-base`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as SwapBaseResponse;
      set({
        profile: data.profile,
        mirror: data.mirror,
        mirrorStatus: data.mirror_status,
        viewLang: data.profile.base_lang,
        swappingBase: false,
        dirty: false,
      });
      return true;
    } catch (err: unknown) {
      set({
        swappingBase: false,
        error: err instanceof Error ? err.message : "Error al cambiar idioma base",
      });
      return false;
    }
  },

  fetchProfile: async () => {
    set({ loading: true, error: null });
    if (!getStoredSession()?.access_token) {
      const draft = loadDraft();
      const data = draft?.profile ?? DEFAULT_ANONYMOUS_PROFILE;
      if (!draft?.profile) {
        saveDraft(data, "classic");
      }
      const hasData = !reducers.isProfileEmpty(data);
      set({
        profile: data,
        viewLang: data.base_lang || "es",
        loading: false,
        initialized: true,
        dirty: false,
        canEnhanceAfterImport: false,
        lastImportInfo: null,
        lastEnhanceStats: null,
        isManualMode: hasData,
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as Profile;
      const hasData = !reducers.isProfileEmpty(data);
      set({
        profile: data,
        viewLang: data.base_lang || "es",
        loading: false,
        initialized: true,
        dirty: false,
        canEnhanceAfterImport: false,
        lastImportInfo: null,
        lastEnhanceStats: null,
        isManualMode: hasData,
      });
    } catch (err: unknown) {
      set({
        loading: false,
        initialized: true,
        error: err instanceof Error ? err.message : "Error al cargar perfil",
      });
    }
  },

  importProfile: async (file: File, sourceLang: "auto" | LangCode = "auto") => {
    set({ importing: true, error: null, lastImportInfo: null });
    if (!getStoredSession()?.access_token) {
      try {
        const data = await parseAnonymousCv(file, sourceLang);
        if (!data || !data.profile) {
          throw new Error("No se pudo estructurar el contenido del CV.");
        }
        const existingDraft = loadDraft();
        saveDraft(data.profile, existingDraft?.theme || "classic");
        set({
          profile: data.profile,
          mirror: null,
          mirrorStatus: null,
          viewLang: data.profile.base_lang || "es",
          importing: false,
          canEnhanceAfterImport: false,
          lastImportInfo: null,
          dirty: false,
          isManualMode: true,
          error: null,
        });
        return true;
      } catch (err: unknown) {
        set({
          importing: false,
          error: err instanceof Error ? err.message : "Error al importar CV",
        });
        return false;
      }
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_lang", sourceLang);
      const currentProfile = get().profile;
      if (currentProfile) {
        formData.append("base_profile", JSON.stringify(currentProfile));
      }
      const res = await apiFetch(`${API_BASE_URL}/api/profile/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let errorMsg = `Error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {
          errorMsg = await res.text();
        }
        throw new Error(errorMsg);
      }
      const data = (await res.json()) as ImportProfileResponse;
      set({
        profile: data.profile,
        mirror: data.mirror,
        mirrorStatus: data.mirror_status,
        viewLang: data.profile.base_lang || "es",
        importing: false,
        canEnhanceAfterImport: true,
        lastImportInfo: {
          detectedLang: data.detected_lang,
          translatedToBase: data.translated_to_base,
        },
        dirty: true,
        isManualMode: true,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      set({
        importing: false,
        error: err instanceof Error ? err.message : "Error al importar CV",
      });
      return false;
    }
  },

  enhanceProfile: async () => {
    const { profile, enhancing } = get();
    if (!profile || enhancing) return false;

    set({ enhancing: true, error: null, canEnhanceAfterImport: false });
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        let errorMsg = `Error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {
          errorMsg = await res.text();
        }
        throw new Error(errorMsg);
      }
      const data = (await res.json()) as EnhanceProfileResponse;
      set({
        profile: data.profile,
        lastEnhanceStats: data.stats,
        enhancing: false,
        dirty: true,
        isManualMode: true,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      set({
        enhancing: false,
        canEnhanceAfterImport: true,
        error: err instanceof Error ? err.message : "Error al enriquecer perfil con IA",
      });
      return false;
    }
  },

  dismissImportPrompt: () => {
    set({ canEnhanceAfterImport: false, lastImportInfo: null });
  },

  discardUnsavedChanges: async () => {
    set({
      canEnhanceAfterImport: false,
      lastImportInfo: null,
      lastEnhanceStats: null,
      dirty: false,
    });
    await get().fetchProfile();
  },

  saveProfile: async () => {
    const { profile } = get();
    if (!profile) return false;

    if (!getStoredSession()?.access_token) {
      const existingDraft = loadDraft();
      saveDraft(profile, existingDraft?.theme || "classic");
      set({ saving: false, dirty: false, error: null });
      return true;
    }

    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const updated = (await res.json()) as Profile;
      set({ profile: updated, mirror: null, saving: false, dirty: false });
      if (get().viewLang !== updated.base_lang) {
        await get().loadMirror();
      }
      return true;
    } catch (err: unknown) {
      set({
        saving: false,
        error: err instanceof Error ? err.message : "Error al guardar perfil",
      });
      return false;
    }
  },

  enableManualMode: () => {
    set({ isManualMode: true });
  },

  setProfile: (updater) => {
    const { profile } = get();
    if (!profile) return;
    const nextProfile = updater(profile);
    if (!getStoredSession()?.access_token) {
      const existingDraft = loadDraft();
      saveDraft(nextProfile, existingDraft?.theme || "classic");
    }
    set({ profile: nextProfile, dirty: true, isManualMode: true });
  },

  updateFullName: (full_name) => {
    get().setProfile((p) => mutators.updateFullName(p, full_name));
  },

  updateContact: (contactUpdate) => {
    get().setProfile((p) => mutators.updateContact(p, contactUpdate));
  },

  updateSummary: (text) => {
    get().setProfile((p) => mutators.updateSummary(p, text));
  },

  addSkill: (skill) => {
    get().setProfile((p) => mutators.addSkill(p, skill));
  },

  updateSkill: (id, skillUpdate) => {
    get().setProfile((p) => mutators.updateSkill(p, id, skillUpdate));
  },

  removeSkill: (id) => {
    get().setProfile((p) => mutators.removeSkill(p, id));
  },

  addEntry: (entry) => {
    get().setProfile((p) => mutators.addEntry(p, entry));
  },

  updateEntry: (id, entryUpdate) => {
    get().setProfile((p) => mutators.updateEntry(p, id, entryUpdate));
  },

  moveEntry: (id, direction) => {
    get().setProfile((p) => mutators.moveEntry(p, id, direction));
  },

  removeEntry: (id) => {
    get().setProfile((p) => mutators.removeEntry(p, id));
  },

  addTitle: (entryId, title) => {
    get().setProfile((p) => mutators.addTitle(p, entryId, title));
  },

  updateTitle: (entryId, titleId, titleUpdate) => {
    get().setProfile((p) => mutators.updateTitle(p, entryId, titleId, titleUpdate));
  },

  upsertEntryTitle: (entryId, titleText) => {
    get().setProfile((p) => mutators.upsertEntryTitle(p, entryId, titleText));
  },

  removeTitle: (entryId, titleId) => {
    get().setProfile((p) => mutators.removeTitle(p, entryId, titleId));
  },

  addFact: (entryId, fact) => {
    get().setProfile((p) => mutators.addFact(p, entryId, fact));
  },

  updateFact: (entryId, factId, factUpdate) => {
    get().setProfile((p) => mutators.updateFact(p, entryId, factId, factUpdate));
  },

  updateFactText: (entryId, factId, text) => {
    get().setProfile((p) => mutators.updateFactText(p, entryId, factId, text));
  },

  removeFact: (entryId, factId) => {
    get().setProfile((p) => mutators.removeFact(p, entryId, factId));
  },

  approveSkill: (skillId) => {
    get().setProfile((p) => reducers.approveSkill(p, skillId));
  },

  rejectSkill: (skillId) => {
    get().setProfile((p) => reducers.rejectSkill(p, skillId));
  },

  approveTitle: (entryId, titleId) => {
    get().setProfile((p) => reducers.approveTitle(p, entryId, titleId));
  },

  rejectTitle: (entryId, titleId) => {
    get().setProfile((p) => reducers.rejectTitle(p, entryId, titleId));
  },

  approveFact: (entryId, factId) => {
    get().setProfile((p) => reducers.approveFact(p, entryId, factId));
  },

  rejectFact: (entryId, factId) => {
    get().setProfile((p) => reducers.rejectFact(p, entryId, factId));
  },

  confirmFactRemoval: (entryId, factId) => {
    get().setProfile((p) => reducers.confirmFactRemoval(p, entryId, factId));
  },

  dismissFactRemoval: (entryId, factId) => {
    get().setProfile((p) => reducers.dismissFactRemoval(p, entryId, factId));
  },

  confirmSkillRemoval: (skillId) => {
    get().setProfile((p) => reducers.confirmSkillRemoval(p, skillId));
  },

  dismissSkillRemoval: (skillId) => {
    get().setProfile((p) => reducers.dismissSkillRemoval(p, skillId));
  },

  approveAllSuggestions: () => {
    get().setProfile((p) => reducers.approveAllSuggestions(p));
  },

  rejectAllSuggestions: () => {
    get().setProfile((p) => reducers.rejectAllSuggestions(p));
  },
}));

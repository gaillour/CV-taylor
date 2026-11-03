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

import { API_BASE_URL, apiFetch } from "@/lib/api";

export { API_BASE_URL };

export function isProfileEmpty(profile: Profile | null): boolean {
  if (!profile) return true;
  return (
    !profile.full_name?.trim() &&
    profile.entries.length === 0 &&
    profile.skills.length === 0
  );
}

export function countPendingSuggestions(profile: Profile | null): number {
  if (!profile) return 0;
  let count = 0;
  for (const s of profile.skills) {
    if (s.approved === false || s.marked_for_removal) count++;
  }
  for (const e of profile.entries) {
    for (const t of e.titles) {
      if (t.approved === false) count++;
    }
    for (const f of e.facts) {
      if (f.approved === false || Boolean(f.proposed_text) || f.marked_for_removal) count++;
    }
  }
  return count;
}

export function hasPendingSuggestions(profile: Profile | null): boolean {
  if (!profile || isProfileEmpty(profile)) return false;
  return countPendingSuggestions(profile) > 0;
}

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
  error: string | null;

  setViewLang: (lang: LangCode) => Promise<void>;
  loadMirror: () => Promise<void>;
  swapBaseLang: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  saveProfile: () => Promise<boolean>;
  importProfile: (file: File, sourceLang?: "auto" | LangCode) => Promise<boolean>;
  enhanceProfile: () => Promise<boolean>;
  dismissImportPrompt: () => void;
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
  error: null,

  setViewLang: async (lang) => {
    set({ viewLang: lang });
    const { profile, mirror } = get();
    if (profile && lang !== profile.base_lang && !mirror) {
      await get().loadMirror();
    }
  },

  loadMirror: async () => {
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
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/profile`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as Profile;
      set({
        profile: data,
        viewLang: data.base_lang || "es",
        loading: false,
        initialized: true,
        dirty: false,
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
    set({ canEnhanceAfterImport: false });
  },

  saveProfile: async () => {
    const { profile } = get();
    if (!profile) return false;

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

  setProfile: (updater) => {
    const { profile } = get();
    if (!profile) return;
    set({ profile: updater(profile), dirty: true });
  },

  updateFullName: (full_name) => {
    get().setProfile((p) => ({ ...p, full_name }));
  },

  updateContact: (contactUpdate) => {
    get().setProfile((p) => ({
      ...p,
      contact: { ...p.contact, ...contactUpdate },
    }));
  },

  updateSummary: (text) => {
    get().setProfile((p) => ({ ...p, summary: text }));
  },

  addSkill: (skill) => {
    get().setProfile((p) => ({
      ...p,
      skills: [...p.skills, skill],
    }));
  },

  updateSkill: (id, skillUpdate) => {
    get().setProfile((p) => ({
      ...p,
      skills: p.skills.map((s) => (s.id === id ? { ...s, ...skillUpdate } : s)),
    }));
  },

  removeSkill: (id) => {
    get().setProfile((p) => ({
      ...p,
      skills: p.skills.filter((s) => s.id !== id),
    }));
  },

  addEntry: (entry) => {
    get().setProfile((p) => ({
      ...p,
      entries: [...p.entries, entry],
    }));
  },

  updateEntry: (id, entryUpdate) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => (e.id === id ? { ...e, ...entryUpdate } : e)),
    }));
  },

  moveEntry: (id, direction) => {
    get().setProfile((p) => {
      const entry = p.entries.find((e) => e.id === id);
      if (!entry) return p;
      const sameKind = p.entries.filter((e) => e.kind === entry.kind && !e.archived);
      sameKind.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const currIdx = sameKind.findIndex((e) => e.id === id);
      if (currIdx === -1) return p;
      const targetIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
      if (targetIdx < 0 || targetIdx >= sameKind.length) return p;

      const swapped = [...sameKind];
      const temp = swapped[currIdx];
      swapped[currIdx] = swapped[targetIdx];
      swapped[targetIdx] = temp;

      const posMap = new Map<string, number>();
      swapped.forEach((item, idx) => {
        posMap.set(item.id, idx);
      });

      return {
        ...p,
        entries: p.entries.map((e) => (posMap.has(e.id) ? { ...e, position: posMap.get(e.id)! } : e)),
      };
    });
  },

  removeEntry: (id) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.filter((e) => e.id !== id),
    }));
  },

  addTitle: (entryId, title) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId ? { ...e, titles: [...e.titles, title] } : e
      ),
    }));
  },

  updateTitle: (entryId, titleId, titleUpdate) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          titles: e.titles.map((t) => (t.id === titleId ? { ...t, ...titleUpdate } : t)),
        };
      }),
    }));
  },

  upsertEntryTitle: (entryId, titleText) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        const defaultIdx = e.titles.findIndex((t) => t.is_default);
        const existingIdx = defaultIdx >= 0 ? defaultIdx : (e.titles.length > 0 ? 0 : -1);
        if (existingIdx >= 0) {
          const updatedTitles = [...e.titles];
          updatedTitles[existingIdx] = {
            ...updatedTitles[existingIdx],
            title: titleText,
          };
          return { ...e, titles: updatedTitles };
        }
        const newTitle: EntryTitle = {
          id: `title_${Date.now()}`,
          entry_id: entryId,
          title: titleText,
          is_default: true,
          approved: true,
        };
        return { ...e, titles: [newTitle] };
      }),
    }));
  },

  removeTitle: (entryId, titleId) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId ? { ...e, titles: e.titles.filter((t) => t.id !== titleId) } : e
      ),
    }));
  },

  addFact: (entryId, fact) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId ? { ...e, facts: [...e.facts, fact] } : e
      ),
    }));
  },

  updateFact: (entryId, factId, factUpdate) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          facts: e.facts.map((f) => (f.id === factId ? { ...f, ...factUpdate } : f)),
        };
      }),
    }));
  },

  updateFactText: (entryId, factId, text) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          facts: e.facts.map((f) => (f.id === factId ? { ...f, text } : f)),
        };
      }),
    }));
  },

  removeFact: (entryId, factId) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId ? { ...e, facts: e.facts.filter((f) => f.id !== factId) } : e
      ),
    }));
  },

  approveSkill: (skillId) => {
    const now = new Date().toISOString();
    get().setProfile((p) => ({
      ...p,
      skills: p.skills.map((s) =>
        s.id === skillId ? { ...s, approved: true, approved_at: now } : s
      ),
    }));
  },

  rejectSkill: (skillId) => {
    get().removeSkill(skillId);
  },

  approveTitle: (entryId, titleId) => {
    const now = new Date().toISOString();
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              titles: e.titles.map((t) =>
                t.id === titleId ? { ...t, approved: true, approved_at: now } : t
              ),
            }
          : e
      ),
    }));
  },

  rejectTitle: (entryId, titleId) => {
    get().removeTitle(entryId, titleId);
  },

  approveFact: (entryId, factId) => {
    const now = new Date().toISOString();
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          facts: e.facts.map((f) => {
            if (f.id !== factId) return f;
            if (f.proposed_text) {
              return {
                ...f,
                text: f.proposed_text,
                proposed_text: null,
                source: "ai",
                approved: true,
                approved_at: now,
              };
            }
            return { ...f, approved: true, approved_at: now };
          }),
        };
      }),
    }));
  },

  rejectFact: (entryId, factId) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) => {
        if (e.id !== entryId) return e;
        const target = e.facts.find((f) => f.id === factId);
        if (!target) return e;
        // If it's an existing approved fact with a proposed rewrite, just clear proposed_text
        if (target.approved !== false && target.proposed_text) {
          return {
            ...e,
            facts: e.facts.map((f) =>
              f.id === factId ? { ...f, proposed_text: null } : f
            ),
          };
        }
        // If it's a newly distilled unapproved fact, remove it
        return {
          ...e,
          facts: e.facts.filter((f) => f.id !== factId),
        };
      }),
    }));
  },

  confirmFactRemoval: (entryId, factId) => {
    get().removeFact(entryId, factId);
  },

  dismissFactRemoval: (entryId, factId) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              facts: e.facts.map((f) =>
                f.id === factId
                  ? { ...f, marked_for_removal: false, removal_reason: null }
                  : f
              ),
            }
          : e
      ),
    }));
  },

  confirmSkillRemoval: (skillId) => {
    get().removeSkill(skillId);
  },

  dismissSkillRemoval: (skillId) => {
    get().setProfile((p) => ({
      ...p,
      skills: p.skills.map((s) =>
        s.id === skillId
          ? { ...s, marked_for_removal: false, removal_reason: null }
          : s
      ),
    }));
  },

  approveAllSuggestions: () => {
    const now = new Date().toISOString();
    get().setProfile((p) => ({
      ...p,
      skills: p.skills
        .filter((s) => !s.marked_for_removal)
        .map((s) =>
          s.approved === false ? { ...s, approved: true, approved_at: now } : s
        ),
      entries: p.entries.map((e) => ({
        ...e,
        titles: e.titles.map((t) =>
          t.approved === false ? { ...t, approved: true, approved_at: now } : t
        ),
        facts: e.facts
          .filter((f) => !f.marked_for_removal)
          .map((f) => {
            if (f.proposed_text) {
              return {
                ...f,
                text: f.proposed_text,
                proposed_text: null,
                source: "ai",
                approved: true,
                approved_at: now,
              };
            }
            if (f.approved === false) {
              return { ...f, approved: true, approved_at: now };
            }
            return f;
          }),
      })),
    }));
  },

  rejectAllSuggestions: () => {
    get().setProfile((p) => ({
      ...p,
      skills: p.skills
        .filter((s) => s.approved !== false)
        .map((s) =>
          s.marked_for_removal
            ? { ...s, marked_for_removal: false, removal_reason: null }
            : s
        ),
      entries: p.entries.map((e) => ({
        ...e,
        titles: e.titles.filter((t) => t.approved !== false),
        facts: e.facts
          .filter((f) => f.approved !== false)
          .map((f) => {
            const next = f.proposed_text ? { ...f, proposed_text: null } : f;
            return next.marked_for_removal
              ? { ...next, marked_for_removal: false, removal_reason: null }
              : next;
          }),
      })),
    }));
  },
}));

import { create } from "zustand";
import { ContactInfo, Entry, EntryTitle, Fact, Profile, Skill } from "@/types/cv";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  saveProfile: () => Promise<boolean>;
  setProfile: (updater: (prev: Profile) => Profile) => void;

  updateContact: (contact: Partial<ContactInfo>) => void;
  updateSummary: (text: string, lang?: "es" | "en") => void;
  updateFullName: (name: string) => void;

  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;

  addEntry: (entry: Entry) => void;
  updateEntry: (id: string, entry: Partial<Entry>) => void;
  removeEntry: (id: string) => void;

  addTitle: (entryId: string, title: EntryTitle) => void;
  updateTitle: (entryId: string, titleId: string, title: Partial<EntryTitle>) => void;
  removeTitle: (entryId: string, titleId: string) => void;

  addFact: (entryId: string, fact: Fact) => void;
  updateFact: (entryId: string, factId: string, fact: Partial<Fact>) => void;
  removeFact: (entryId: string, factId: string) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,
  dirty: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as Profile;
      set({ profile: data, loading: false, dirty: false });
    } catch (err: unknown) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Error al cargar perfil",
      });
    }
  },

  saveProfile: async () => {
    const { profile } = get();
    if (!profile) return false;

    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const updated = (await res.json()) as Profile;
      set({ profile: updated, saving: false, dirty: false });
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

  updateSummary: (text, lang = "es") => {
    get().setProfile((p) =>
      lang === "en" ? { ...p, summary_en: text } : { ...p, summary: text }
    );
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

  removeFact: (entryId, factId) => {
    get().setProfile((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === entryId ? { ...e, facts: e.facts.filter((f) => f.id !== factId) } : e
      ),
    }));
  },
}));

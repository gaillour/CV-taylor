import { Profile } from "@/types/cv";
import { removeFact, removeSkill, removeTitle } from "./profileMutators";

export function isProfileEmpty(profile: Profile | null): boolean {
  if (!profile) return true;
  const hasContact = Boolean(
    profile.contact?.email?.trim() ||
    profile.contact?.phone?.trim() ||
    profile.contact?.location?.trim()
  );
  return (
    !profile.full_name?.trim() &&
    profile.entries.length === 0 &&
    profile.skills.length === 0 &&
    !hasContact
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

export function approveSkill(
  profile: Profile,
  skillId: string,
  now: string = new Date().toISOString()
): Profile {
  return {
    ...profile,
    skills: profile.skills.map((s) =>
      s.id === skillId ? { ...s, approved: true, approved_at: now } : s
    ),
  };
}

export function rejectSkill(profile: Profile, skillId: string): Profile {
  return removeSkill(profile, skillId);
}

export function approveTitle(
  profile: Profile,
  entryId: string,
  titleId: string,
  now: string = new Date().toISOString()
): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            titles: e.titles.map((t) =>
              t.id === titleId ? { ...t, approved: true, approved_at: now } : t
            ),
          }
        : e
    ),
  };
}

export function rejectTitle(profile: Profile, entryId: string, titleId: string): Profile {
  return removeTitle(profile, entryId, titleId);
}

export function approveFact(
  profile: Profile,
  entryId: string,
  factId: string,
  now: string = new Date().toISOString()
): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
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
  };
}

export function rejectFact(profile: Profile, entryId: string, factId: string): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
      if (e.id !== entryId) return e;
      const target = e.facts.find((f) => f.id === factId);
      if (!target) return e;
      if (target.approved !== false && target.proposed_text) {
        return {
          ...e,
          facts: e.facts.map((f) =>
            f.id === factId ? { ...f, proposed_text: null } : f
          ),
        };
      }
      return {
        ...e,
        facts: e.facts.filter((f) => f.id !== factId),
      };
    }),
  };
}

export function confirmFactRemoval(profile: Profile, entryId: string, factId: string): Profile {
  return removeFact(profile, entryId, factId);
}

export function dismissFactRemoval(profile: Profile, entryId: string, factId: string): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
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
  };
}

export function confirmSkillRemoval(profile: Profile, skillId: string): Profile {
  return removeSkill(profile, skillId);
}

export function dismissSkillRemoval(profile: Profile, skillId: string): Profile {
  return {
    ...profile,
    skills: profile.skills.map((s) =>
      s.id === skillId
        ? { ...s, marked_for_removal: false, removal_reason: null }
        : s
    ),
  };
}

export function approveAllSuggestions(
  profile: Profile,
  now: string = new Date().toISOString()
): Profile {
  return {
    ...profile,
    skills: profile.skills
      .filter((s) => !s.marked_for_removal)
      .map((s) =>
        s.approved === false ? { ...s, approved: true, approved_at: now } : s
      ),
    entries: profile.entries.map((e) => ({
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
  };
}

export function rejectAllSuggestions(profile: Profile): Profile {
  return {
    ...profile,
    skills: profile.skills
      .filter((s) => s.approved !== false)
      .map((s) =>
        s.marked_for_removal
          ? { ...s, marked_for_removal: false, removal_reason: null }
          : s
      ),
    entries: profile.entries.map((e) => ({
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
  };
}

import { ContactInfo, Entry, EntryTitle, Fact, Profile, Skill } from "@/types/cv";

export function updateFullName(profile: Profile, fullName: string): Profile {
  return { ...profile, full_name: fullName };
}

export function updateContact(profile: Profile, contactUpdate: Partial<ContactInfo>): Profile {
  return {
    ...profile,
    contact: { ...profile.contact, ...contactUpdate },
  };
}

export function updateSummary(profile: Profile, text: string): Profile {
  return { ...profile, summary: text };
}

export function addSkill(profile: Profile, skill: Skill): Profile {
  return {
    ...profile,
    skills: [...profile.skills, skill],
  };
}

export function updateSkill(profile: Profile, id: string, skillUpdate: Partial<Skill>): Profile {
  return {
    ...profile,
    skills: profile.skills.map((s) => (s.id === id ? { ...s, ...skillUpdate } : s)),
  };
}

export function removeSkill(profile: Profile, id: string): Profile {
  return {
    ...profile,
    skills: profile.skills.filter((s) => s.id !== id),
  };
}

export function addEntry(profile: Profile, entry: Entry): Profile {
  return {
    ...profile,
    entries: [...profile.entries, entry],
  };
}

export function updateEntry(profile: Profile, id: string, entryUpdate: Partial<Entry>): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => (e.id === id ? { ...e, ...entryUpdate } : e)),
  };
}

export function moveEntry(profile: Profile, id: string, direction: "up" | "down"): Profile {
  const entry = profile.entries.find((e) => e.id === id);
  if (!entry) return profile;
  const sameKind = profile.entries.filter((e) => e.kind === entry.kind && !e.archived);
  sameKind.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const currIdx = sameKind.findIndex((e) => e.id === id);
  if (currIdx === -1) return profile;
  const targetIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
  if (targetIdx < 0 || targetIdx >= sameKind.length) return profile;

  const swapped = [...sameKind];
  const temp = swapped[currIdx];
  swapped[currIdx] = swapped[targetIdx];
  swapped[targetIdx] = temp;

  const posMap = new Map<string, number>();
  swapped.forEach((item, idx) => {
    posMap.set(item.id, idx);
  });

  return {
    ...profile,
    entries: profile.entries.map((e) => (posMap.has(e.id) ? { ...e, position: posMap.get(e.id)! } : e)),
  };
}

export function removeEntry(profile: Profile, id: string): Profile {
  return {
    ...profile,
    entries: profile.entries.filter((e) => e.id !== id),
  };
}

export function addTitle(profile: Profile, entryId: string, title: EntryTitle): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
      e.id === entryId ? { ...e, titles: [...e.titles, title] } : e
    ),
  };
}

export function updateTitle(
  profile: Profile,
  entryId: string,
  titleId: string,
  titleUpdate: Partial<EntryTitle>
): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        titles: e.titles.map((t) => (t.id === titleId ? { ...t, ...titleUpdate } : t)),
      };
    }),
  };
}

export function upsertEntryTitle(profile: Profile, entryId: string, titleText: string): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
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
  };
}

export function removeTitle(profile: Profile, entryId: string, titleId: string): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
      e.id === entryId ? { ...e, titles: e.titles.filter((t) => t.id !== titleId) } : e
    ),
  };
}

export function addFact(profile: Profile, entryId: string, fact: Fact): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
      e.id === entryId ? { ...e, facts: [...e.facts, fact] } : e
    ),
  };
}

export function updateFact(
  profile: Profile,
  entryId: string,
  factId: string,
  factUpdate: Partial<Fact>
): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        facts: e.facts.map((f) => (f.id === factId ? { ...f, ...factUpdate } : f)),
      };
    }),
  };
}

export function updateFactText(
  profile: Profile,
  entryId: string,
  factId: string,
  text: string
): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        facts: e.facts.map((f) => (f.id === factId ? { ...f, text } : f)),
      };
    }),
  };
}

export function removeFact(profile: Profile, entryId: string, factId: string): Profile {
  return {
    ...profile,
    entries: profile.entries.map((e) =>
      e.id === entryId ? { ...e, facts: e.facts.filter((f) => f.id !== factId) } : e
    ),
  };
}

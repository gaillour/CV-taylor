import { Profile, RenderModel, EntryKind, RenderEntry, Entry, Fact, Skill } from "@/types/cv";

export interface NewEntryCandidate {
  id: string;
  kind: EntryKind;
  renderEntry: RenderEntry;
  label: string;
  sublabel: string;
}

export interface NewBulletCandidate {
  id: string;
  entryId: string;
  entryLabel: string;
  text: string;
  skillIds: string[];
}

export interface NewSkillCandidate {
  id: string;
  name: string;
  category: string;
}

export interface ProfileDiffResult {
  newEntries: NewEntryCandidate[];
  newBullets: NewBulletCandidate[];
  newSkills: NewSkillCandidate[];
  hasNewItems: boolean;
}

export function detectNewProfileItems(
  renderModel: RenderModel,
  profile: Profile | null
): ProfileDiffResult {
  if (!profile) {
    return { newEntries: [], newBullets: [], newSkills: [], hasNewItems: false };
  }

  const newEntries: NewEntryCandidate[] = [];
  const newBullets: NewBulletCandidate[] = [];
  const newSkills: NewSkillCandidate[] = [];

  const sections: { kind: EntryKind; entries: RenderEntry[] }[] = [
    { kind: "experience", entries: renderModel.experience || [] },
    { kind: "project", entries: renderModel.projects || [] },
    { kind: "education", entries: renderModel.education || [] },
  ];

  for (const section of sections) {
    for (let idx = 0; idx < section.entries.length; idx++) {
      const renderEntry = section.entries[idx];
      const title = (renderEntry.title || "").trim();
      const org = (renderEntry.org || "").trim();

      if (!title && !org) continue;

      // Find match in profile.entries
      let matchedEntry = profile.entries.find(
        (e) => renderEntry.entry_id && e.id === renderEntry.entry_id
      );

      if (!matchedEntry) {
        const normTitle = title.toLowerCase();
        const normOrg = org.toLowerCase();
        matchedEntry = profile.entries.find((e) => {
          if (e.kind !== section.kind) return false;
          const eOrg = (e.org || "").toLowerCase();
          const matchesOrg = normOrg ? eOrg === normOrg : true;
          const matchesTitle = e.titles.some(
            (t) => t.title.trim().toLowerCase() === normTitle
          );
          return matchesOrg && (matchesTitle || (!normTitle && eOrg === normOrg));
        });
      }

      if (!matchedEntry) {
        const candidateId = `entry:${section.kind}:${idx}:${renderEntry.entry_id || title}`;
        newEntries.push({
          id: candidateId,
          kind: section.kind,
          renderEntry,
          label: title || org || "Sin título",
          sublabel: org && title !== org ? org : section.kind,
        });
      } else {
        // Check bullets
        for (const bullet of renderEntry.bullets || []) {
          const bulletText = (bullet.text || "").trim();
          if (!bulletText) continue;

          const factIds = bullet.fact_ids || [];
          const matchesFactId = factIds.some((fid) =>
            matchedEntry.facts.some((f) => f.id === fid)
          );
          const normBulletText = bulletText.toLowerCase();
          const matchesText = matchedEntry.facts.some(
            (f) => f.text.trim().toLowerCase() === normBulletText
          );

          if (!matchesFactId && !matchesText) {
            const bulletCandidateId = `bullet:${matchedEntry.id}:${Math.random().toString(36).substring(2, 8)}`;
            newBullets.push({
              id: bulletCandidateId,
              entryId: matchedEntry.id,
              entryLabel: title || matchedEntry.titles[0]?.title || matchedEntry.org || "Entrada",
              text: bulletText,
              skillIds: bullet.skill_ids || [],
            });
          }
        }
      }
    }
  }

  // Check skills
  const existingSkillNames = new Set<string>();
  for (const s of profile.skills || []) {
    if (s.name) existingSkillNames.add(s.name.trim().toLowerCase());
    for (const alias of s.aliases || []) {
      if (alias) existingSkillNames.add(alias.trim().toLowerCase());
    }
  }

  const seenNewSkills = new Set<string>();
  for (const group of renderModel.skills || []) {
    const rawItems = group.items ? group.items.split(",") : [];
    for (const item of rawItems) {
      const skillName = item.trim();
      if (!skillName) continue;
      const lowerName = skillName.toLowerCase();
      if (!existingSkillNames.has(lowerName) && !seenNewSkills.has(lowerName)) {
        seenNewSkills.add(lowerName);
        const skillCandidateId = `skill:${Math.random().toString(36).substring(2, 8)}`;
        newSkills.push({
          id: skillCandidateId,
          name: skillName,
          category: group.category || "General",
        });
      }
    }
  }

  const hasNewItems = newEntries.length > 0 || newBullets.length > 0 || newSkills.length > 0;

  return {
    newEntries,
    newBullets,
    newSkills,
    hasNewItems,
  };
}

export function applySelectedItemsToProfile(
  profile: Profile,
  diff: ProfileDiffResult,
  selectedIds: Set<string>
): Profile {
  const updated: Profile = structuredClone(profile);

  // 1. Add new entries
  for (const ne of diff.newEntries) {
    if (!selectedIds.has(ne.id)) continue;
    const re = ne.renderEntry;
    const newEntryId = re.entry_id || crypto.randomUUID();
    const entryTitleText = re.title || re.org || "Sin título";
    const newEntry: Entry = {
      id: newEntryId,
      kind: ne.kind,
      org: re.org || "",
      role: re.role || null,
      location: re.location || null,
      start_date: re.date_label || "",
      end_date: null,
      link: re.link || null,
      titles: [
        {
          id: crypto.randomUUID(),
          entry_id: newEntryId,
          title: entryTitleText,
          is_default: true,
          source: "user",
          approved: true,
        },
      ],
      facts: (re.bullets || [])
        .filter((b) => b.text && b.text.trim())
        .map((b, idx) => ({
          id: crypto.randomUUID(),
          entry_id: newEntryId,
          text: b.text.trim(),
          position: idx,
          default_selected: true,
          source: "user" as const,
          approved: true,
          skill_ids: b.skill_ids || [],
        })),
    };
    updated.entries.push(newEntry);
  }

  // 2. Add new bullets to existing entries
  for (const nb of diff.newBullets) {
    if (!selectedIds.has(nb.id)) continue;
    const targetEntry = updated.entries.find((e) => e.id === nb.entryId);
    if (targetEntry) {
      const newFact: Fact = {
        id: crypto.randomUUID(),
        entry_id: targetEntry.id,
        text: nb.text.trim(),
        position: targetEntry.facts.length,
        default_selected: true,
        source: "user",
        approved: true,
        skill_ids: nb.skillIds || [],
      };
      targetEntry.facts.push(newFact);
    }
  }

  // 3. Add new skills
  for (const ns of diff.newSkills) {
    if (!selectedIds.has(ns.id)) continue;
    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: ns.name,
      category: ns.category || "General",
      source: "user",
      approved: true,
    };
    updated.skills.push(newSkill);
  }

  return updated;
}

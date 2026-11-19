import test from "node:test";
import assert from "node:assert";
import { detectNewProfileItems, applySelectedItemsToProfile } from "../profileDiff";
import { Profile, RenderModel } from "@/types/cv";

const baseProfile: Profile = {
  id: "prof-1",
  schema_version: "1.0",
  full_name: "Test User",
  contact: { email: "test@example.com", phone: "123456", location: "Remote" },
  base_lang: "es",
  summary: "Software Engineer",
  skills: [
    { id: "s-1", name: "Python", category: "Languages", source: "user", approved: true },
  ],
  entries: [
    {
      id: "e-1",
      kind: "experience",
      org: "Acme Corp",
      role: "Developer",
      start_date: "2023",
      end_date: "2024",
      titles: [{ id: "t-1", title: "Software Engineer", is_default: true, source: "user", approved: true }],
      facts: [{ id: "f-1", entry_id: "e-1", text: "Built scalable APIs in Python", position: 0, default_selected: true, source: "user", approved: true }],
    },
  ],
};

test("detectNewProfileItems: no new items when everything matches", () => {
  const renderModel: RenderModel = {
    schema_version: "1.0",
    theme: "classic",
    lang: "es",
    full_name: "Test User",
    contact: { email: "test@example.com", phone: "123456", location: "Remote" },
    summary: "Software Engineer",
    summary_fact_ids: [],
    skills: [{ category: "Languages", items: "Python", skill_ids: ["s-1"] }],
    experience: [
      {
        entry_id: "e-1",
        title: "Software Engineer",
        org: "Acme Corp",
        date_label: "2023 - 2024",
        bullets: [{ text: "Built scalable APIs in Python", fact_ids: ["f-1"] }],
      },
    ],
    projects: [],
    education: [],
    design: {
      density: 1,
      font_size_pt: 10,
      leading_em: 1.2,
      section_spacing_pt: 10,
      entry_spacing_pt: 10,
      bullet_spacing_pt: 5,
      margin_x_cm: 2,
      margin_y_cm: 2,
      font_family: "Inter",
    },
  };

  const diff = detectNewProfileItems(renderModel, baseProfile);
  assert.strictEqual(diff.hasNewItems, false);
  assert.strictEqual(diff.newEntries.length, 0);
  assert.strictEqual(diff.newBullets.length, 0);
  assert.strictEqual(diff.newSkills.length, 0);
});

test("detectNewProfileItems: detects new entry, new bullet, and new skill", () => {
  const renderModel: RenderModel = {
    schema_version: "1.0",
    theme: "classic",
    lang: "es",
    full_name: "Test User",
    contact: { email: "test@example.com", phone: "123456", location: "Remote" },
    summary: "Software Engineer",
    summary_fact_ids: [],
    skills: [{ category: "Languages", items: "Python, TypeScript", skill_ids: [] }],
    experience: [
      {
        entry_id: "e-1",
        title: "Software Engineer",
        org: "Acme Corp",
        date_label: "2023 - 2024",
        bullets: [
          { text: "Built scalable APIs in Python", fact_ids: ["f-1"] },
          { text: "Mentored junior engineers", fact_ids: [] },
        ],
      },
    ],
    projects: [
      {
        entry_id: "p-new",
        title: "Open Source Tool",
        org: "GitHub",
        date_label: "2024",
        bullets: [{ text: "Created CLI tool", fact_ids: [] }],
      },
    ],
    education: [],
    design: {
      density: 1,
      font_size_pt: 10,
      leading_em: 1.2,
      section_spacing_pt: 10,
      entry_spacing_pt: 10,
      bullet_spacing_pt: 5,
      margin_x_cm: 2,
      margin_y_cm: 2,
      font_family: "Inter",
    },
  };

  const diff = detectNewProfileItems(renderModel, baseProfile);
  assert.strictEqual(diff.hasNewItems, true);
  assert.strictEqual(diff.newEntries.length, 1);
  assert.strictEqual(diff.newEntries[0].renderEntry.title, "Open Source Tool");
  assert.strictEqual(diff.newBullets.length, 1);
  assert.strictEqual(diff.newBullets[0].text, "Mentored junior engineers");
  assert.strictEqual(diff.newSkills.length, 1);
  assert.strictEqual(diff.newSkills[0].name, "TypeScript");
});

test("applySelectedItemsToProfile: correctly adds selected items", () => {
  const renderModel: RenderModel = {
    schema_version: "1.0",
    theme: "classic",
    lang: "es",
    full_name: "Test User",
    contact: { email: "test@example.com", phone: "123456", location: "Remote" },
    summary: "Software Engineer",
    summary_fact_ids: [],
    skills: [{ category: "Languages", items: "Python, TypeScript", skill_ids: [] }],
    experience: [
      {
        entry_id: "e-1",
        title: "Software Engineer",
        org: "Acme Corp",
        date_label: "2023 - 2024",
        bullets: [{ text: "Mentored junior engineers", fact_ids: [] }],
      },
    ],
    projects: [
      {
        entry_id: "p-new",
        title: "Open Source Tool",
        org: "GitHub",
        date_label: "2024",
        bullets: [{ text: "Created CLI tool", fact_ids: [] }],
      },
    ],
    education: [],
    design: {
      density: 1,
      font_size_pt: 10,
      leading_em: 1.2,
      section_spacing_pt: 10,
      entry_spacing_pt: 10,
      bullet_spacing_pt: 5,
      margin_x_cm: 2,
      margin_y_cm: 2,
      font_family: "Inter",
    },
  };

  const diff = detectNewProfileItems(renderModel, baseProfile);
  const selectedIds = new Set<string>();
  diff.newEntries.forEach((e) => selectedIds.add(e.id));
  diff.newBullets.forEach((b) => selectedIds.add(b.id));
  diff.newSkills.forEach((s) => selectedIds.add(s.id));

  const updated = applySelectedItemsToProfile(baseProfile, diff, selectedIds);

  assert.strictEqual(updated.entries.length, 2);
  const newProj = updated.entries.find((e) => e.kind === "project");
  assert.ok(newProj);
  assert.strictEqual(newProj.titles[0].title, "Open Source Tool");

  const origEntry = updated.entries.find((e) => e.id === "e-1");
  assert.ok(origEntry);
  assert.strictEqual(origEntry.facts.length, 2);
  assert.strictEqual(origEntry.facts[1].text, "Mentored junior engineers");

  assert.strictEqual(updated.skills.length, 2);
  const tsSkill = updated.skills.find((s) => s.name === "TypeScript");
  assert.ok(tsSkill);
});

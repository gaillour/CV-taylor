import {
  ContactInfo,
  DEFAULT_SECTION_ORDER,
  DesignKnobs,
  Entry,
  Profile,
  RenderEntry,
  RenderModel,
  RenderSkillGroup,
  Skill,
  ThemeName,
} from "@/types/cv";

export const DEFAULT_DESIGN_KNOBS: DesignKnobs = {
  density: 0,
  font_size_pt: 9.8,
  leading_em: 0.52,
  section_spacing_pt: 11.0,
  entry_spacing_pt: 7.0,
  bullet_spacing_pt: 3.0,
  margin_x_cm: 1.4,
  margin_y_cm: 1.3,
  font_family: "Liberation Sans",
};

export const DEFAULT_ANONYMOUS_PROFILE: Profile = {
  id: "anonymous_profile",
  schema_version: "1.0.0",
  full_name: "Alex Rivera",
  base_lang: "es",
  contact: {
    email: "alex.rivera@ejemplo.com",
    phone: "+54 9 11 4567-8901",
    location: "Buenos Aires, Argentina",
    linkedin: "linkedin.com/in/alex-rivera",
    github: "github.com/alexrivera",
    website: null,
    photo_url: null,
  },
  summary:
    "Desarrollador Full Stack con más de 4 años de experiencia construyendo aplicaciones web de alto rendimiento y APIs RESTful. Especializado en TypeScript, Python, React y arquitecturas escalables.",
  skills: [
    { id: "sk_ts", name: "TypeScript", category: "Lenguajes", approved: true, source: "user" },
    { id: "sk_py", name: "Python", category: "Lenguajes", approved: true, source: "user" },
    { id: "sk_sql", name: "SQL", category: "Lenguajes", approved: true, source: "user" },
    { id: "sk_react", name: "React", category: "Frontend", approved: true, source: "user" },
    { id: "sk_next", name: "Next.js", category: "Frontend", approved: true, source: "user" },
    { id: "sk_tail", name: "Tailwind CSS", category: "Frontend", approved: true, source: "user" },
    { id: "sk_fastapi", name: "FastAPI", category: "Backend", approved: true, source: "user" },
    { id: "sk_node", name: "Node.js", category: "Backend", approved: true, source: "user" },
    { id: "sk_pg", name: "PostgreSQL", category: "Backend", approved: true, source: "user" },
    { id: "sk_docker", name: "Docker", category: "Cloud & DevOps", approved: true, source: "user" },
    { id: "sk_git", name: "Git", category: "Cloud & DevOps", approved: true, source: "user" },
    { id: "sk_ci", name: "CI/CD", category: "Cloud & DevOps", approved: true, source: "user" },
  ],
  entries: [
    {
      id: "exp_1",
      kind: "experience",
      org: "Astra Technologies",
      location: "Buenos Aires, AR",
      start_date: "2022",
      end_date: "Presente",
      default_selected: true,
      titles: [
        { id: "t_exp_1", title: "Senior Full Stack Developer", is_default: true, approved: true },
      ],
      facts: [
        {
          id: "f_1_1",
          text: "Diseñé y desplegué microservicios en FastAPI y Next.js que redujeron la latencia de respuesta en un 38%.",
          approved: true,
          default_selected: true,
        },
        {
          id: "f_1_2",
          text: "Lideré la migración del pipeline de datos a PostgreSQL y Docker, recortando tiempos de build un 45%.",
          approved: true,
          default_selected: true,
        },
        {
          id: "f_1_3",
          text: "Mentoreé a 4 desarrolladores junior implementando revisiones de código y tests automatizados.",
          approved: true,
          default_selected: true,
        },
      ],
    },
    {
      id: "exp_2",
      kind: "experience",
      org: "Innovatech Studio",
      location: "Remoto",
      start_date: "2020",
      end_date: "2022",
      default_selected: true,
      titles: [
        { id: "t_exp_2", title: "Software Engineer", is_default: true, approved: true },
      ],
      facts: [
        {
          id: "f_2_1",
          text: "Construí componentes de interfaz accesibles y reactivos en React y TypeScript utilizados por 50k usuarios.",
          approved: true,
          default_selected: true,
        },
        {
          id: "f_2_2",
          text: "Optimicé consultas relacionales complejas y reduje el consumo de memoria en servidores de backend un 25%.",
          approved: true,
          default_selected: true,
        },
      ],
    },
    {
      id: "proj_1",
      kind: "project",
      org: "",
      role: "Creador & Desarrollador Principal",
      start_date: "2023",
      default_selected: true,
      titles: [
        { id: "t_proj_1", title: "CloudMetrics Platform", is_default: true, approved: true },
      ],
      facts: [
        {
          id: "f_p1_1",
          text: "Herramienta open-source para observabilidad de microservicios con dashboards interactivos en tiempo real.",
          approved: true,
          default_selected: true,
        },
        {
          id: "f_p1_2",
          text: "Integración con Docker y Prometheus alcanzando más de 500 estrellas en GitHub.",
          approved: true,
          default_selected: true,
        },
      ],
    },
    {
      id: "edu_1",
      kind: "education",
      org: "Universidad de Buenos Aires",
      location: "Buenos Aires, AR",
      start_date: "2017",
      end_date: "2022",
      default_selected: true,
      titles: [
        { id: "t_edu_1", title: "Licenciatura en Ciencias de la Computación", is_default: true, approved: true },
      ],
      facts: [
        {
          id: "f_e1_1",
          text: "Promedio destacado. Enfoque en sistemas distribuidos, algoritmos y estructuras de datos.",
          approved: true,
          default_selected: true,
        },
      ],
    },
  ],
};

function formatIsoDate(raw?: string | null, precision: string = "month"): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("-");
  if (precision === "year" || parts.length === 1) {
    return parts[0];
  }
  if (parts.length >= 2) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    return `${month}/${year}`;
  }
  return trimmed;
}

export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  datePrecision: string = "month",
  lang: string = "es"
): string {
  const startStr = formatIsoDate(startDate, datePrecision);
  if (!startStr) return "";
  const cleanEnd = endDate?.trim() || "";
  if (!cleanEnd) {
    return startStr;
  }
  if (["present", "presente", "current"].includes(cleanEnd.toLowerCase())) {
    const presentStr = lang === "en" ? "Present" : "Presente";
    return `${startStr} - ${presentStr}`;
  }
  const endStr = formatIsoDate(cleanEnd, datePrecision);
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
}

export function profileToRenderModel(profile: Profile, theme: ThemeName = "classic"): RenderModel {
  const targetLang = profile.base_lang || "es";
  const fontFamily = theme === "engineering" ? "Liberation Serif" : "Liberation Sans";

  // Group skills by category
  const skillsByCategory = new Map<string, Skill[]>();
  for (const sk of profile.skills) {
    if (sk.marked_for_removal || sk.approved === false) continue;
    const cat = sk.category?.trim() || "General";
    const existing = skillsByCategory.get(cat) || [];
    existing.push(sk);
    skillsByCategory.set(cat, existing);
  }

  const skillGroups: RenderSkillGroup[] = Array.from(skillsByCategory.entries()).map(
    ([category, skList]) => ({
      category,
      items: skList.map((s) => (s.level ? `${s.name} (${s.level})` : s.name)).join(", "),
      skill_ids: skList.map((s) => s.id),
    })
  );

  const activeEntries = profile.entries.filter((e) => !e.archived);
  const hasDefaultSelectedProj = activeEntries.some(
    (e) => e.kind === "project" && e.default_selected !== false
  );
  const hasDefaultSelectedExp = activeEntries.some(
    (e) => e.kind === "experience" && e.default_selected !== false
  );

  const sortedEntries = [...activeEntries].sort((a, b) => {
    const selA = a.default_selected !== false ? 0 : 1;
    const selB = b.default_selected !== false ? 0 : 1;
    if (selA !== selB) return selA - selB;
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    if (posA !== posB) return posA - posB;
    const factsA = (a.facts || []).filter((f) => f.approved !== false && !f.marked_for_removal).length;
    const factsB = (b.facts || []).filter((f) => f.approved !== false && !f.marked_for_removal).length;
    if (factsA !== factsB) return factsB - factsA;
    return (a.start_date || "").localeCompare(b.start_date || "");
  });

  const experienceEntries: RenderEntry[] = [];
  const projectEntries: RenderEntry[] = [];
  const educationEntries: RenderEntry[] = [];

  for (const e of sortedEntries) {
    if (e.kind === "project" && hasDefaultSelectedProj && e.default_selected === false) continue;
    if (e.kind === "experience" && hasDefaultSelectedExp && e.default_selected === false) continue;
    if (e.kind === "experience" && experienceEntries.length >= 3) continue;
    if (e.kind === "project" && projectEntries.length >= 3) continue;
    if (e.kind === "education" && educationEntries.length >= 2) continue;

    const approvedTitles = (e.titles || []).filter((t) => t.approved !== false);
    const chosenTitleObj =
      approvedTitles.find((t) => t.is_default) ||
      approvedTitles[0] ||
      e.titles?.[0];
    const defaultTitle = chosenTitleObj?.title || "";
    const defaultTitleId = chosenTitleObj?.id || null;

    const minBullets = e.min_bullets ?? 1;
    const maxBullets = e.max_bullets ?? 4;

    const approvedFacts = (e.facts || []).filter(
      (f) => !f.marked_for_removal && f.approved !== false
    );
    const sortedFacts = [...approvedFacts].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );

    let chosenFacts = sortedFacts.filter(
      (f) => Boolean(f.default_selected) || Boolean(f.pinned)
    );
    if (chosenFacts.length === 0 && sortedFacts.length > 0) {
      chosenFacts = sortedFacts.slice(0, Math.max(minBullets, 2));
    } else if (chosenFacts.length < minBullets && sortedFacts.length > 0) {
      for (const f of sortedFacts) {
        if (!chosenFacts.includes(f)) {
          chosenFacts.push(f);
          if (chosenFacts.length >= minBullets) break;
        }
      }
    }
    if (maxBullets > 0) {
      chosenFacts = chosenFacts.slice(0, maxBullets);
    }

    if (chosenFacts.length === 0 && (e.kind === "experience" || e.kind === "project")) {
      continue;
    }

    const dateLabel = formatDateRange(
      e.start_date,
      e.end_date,
      e.date_precision || "month",
      targetLang
    );

    const renderEntry: RenderEntry = {
      entry_id: e.id,
      title: defaultTitle,
      title_id: defaultTitleId,
      org: e.org || "",
      role: e.role || null,
      location: e.location || null,
      date_label: dateLabel,
      link: e.link || null,
      min_bullets: minBullets,
      max_bullets: maxBullets,
      selected: e.default_selected !== false,
      bullets: chosenFacts.map((f) => ({
        text: f.text,
        fact_ids: [f.id],
        skill_ids: f.skill_ids || [],
        priority: f.weight ?? 100,
        pinned: f.pinned ?? false,
        position: f.position ?? 0,
        selected: true,
      })),
    };

    if (e.kind === "experience") experienceEntries.push(renderEntry);
    else if (e.kind === "project") projectEntries.push(renderEntry);
    else if (e.kind === "education") educationEntries.push(renderEntry);
  }

  const posMap = new Map(profile.entries.map((e) => [e.id, e.position ?? 0]));
  experienceEntries.sort((a, b) => (posMap.get(a.entry_id) ?? 0) - (posMap.get(b.entry_id) ?? 0));
  projectEntries.sort((a, b) => (posMap.get(a.entry_id) ?? 0) - (posMap.get(b.entry_id) ?? 0));
  educationEntries.sort((a, b) => (posMap.get(a.entry_id) ?? 0) - (posMap.get(b.entry_id) ?? 0));

  return {
    schema_version: "1.0.0",
    theme,
    lang: targetLang,
    full_name: profile.full_name || "Tu Nombre",
    contact: {
      email: profile.contact?.email || "",
      phone: profile.contact?.phone || "",
      location: profile.contact?.location || "",
      github: profile.contact?.github || null,
      linkedin: profile.contact?.linkedin || null,
      website: profile.contact?.website || null,
      photo_url: profile.contact?.photo_url || null,
    },
    summary: profile.summary || null,
    summary_fact_ids: [],
    skills: skillGroups,
    experience: experienceEntries,
    projects: projectEntries,
    education: educationEntries,
    section_order: DEFAULT_SECTION_ORDER,
    design: { ...DEFAULT_DESIGN_KNOBS, font_family: fontFamily },
    photo_path: profile.contact?.photo_url || null,
  };
}

export function renderModelToProfile(model: RenderModel, baseProfile?: Profile): Profile {
  const result: Profile = {
    id: baseProfile?.id || "anonymous_profile",
    schema_version: model.schema_version || "1.0.0",
    full_name: model.full_name,
    contact: {
      email: model.contact.email,
      phone: model.contact.phone,
      location: model.contact.location,
      github: model.contact.github || null,
      linkedin: model.contact.linkedin || null,
      website: model.contact.website || null,
      photo_url: model.contact.photo_url || model.photo_path || null,
    },
    base_lang: model.lang || "es",
    summary: model.summary || null,
    skills: [],
    entries: [],
  };

  // Reconstruir skills
  let skillCounter = 1;
  for (const group of model.skills) {
    const rawNames = group.items.split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < rawNames.length; i++) {
      const name = rawNames[i];
      const existingId = group.skill_ids?.[i] || `sk_anon_${skillCounter++}`;
      result.skills.push({
        id: existingId,
        name,
        category: group.category,
        approved: true,
        source: "user",
      });
    }
  }

  // Reconstruir entries
  const processRenderEntries = (
    entries: RenderEntry[],
    kind: "experience" | "project" | "education"
  ) => {
    for (let i = 0; i < entries.length; i++) {
      const re = entries[i];
      const dates = re.date_label ? re.date_label.split(/–|-/).map((s) => s.trim()) : [];
      const entryId = re.entry_id || `entry_anon_${kind}_${i + 1}`;
      const entry: Entry = {
        id: entryId,
        kind,
        org: re.org || "",
        role: re.role || null,
        location: re.location || null,
        start_date: dates[0] || "",
        end_date: dates[1] || null,
        default_selected: re.selected !== false,
        titles: [
          {
            id: re.title_id || `t_${entryId}`,
            entry_id: entryId,
            title: re.title,
            is_default: true,
            approved: true,
            source: "user",
          },
        ],
        facts: re.bullets.map((b, bIdx) => ({
          id: b.fact_ids?.[0] || `f_${entryId}_${bIdx + 1}`,
          entry_id: entryId,
          text: b.text,
          default_selected: b.selected !== false,
          approved: true,
          skill_ids: b.skill_ids || [],
          source: "user",
        })),
      };
      result.entries.push(entry);
    }
  };

  processRenderEntries(model.experience, "experience");
  processRenderEntries(model.projects, "project");
  processRenderEntries(model.education, "education");

  return result;
}

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
      org: "CloudMetrics Platform",
      start_date: "2023",
      default_selected: true,
      titles: [
        { id: "t_proj_1", title: "Creador & Desarrollador Principal", is_default: true, approved: true },
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

export function profileToRenderModel(profile: Profile, theme: ThemeName = "classic"): RenderModel {
  // Group skills by category
  const skillsByCategory = new Map<string, Skill[]>();
  for (const sk of profile.skills) {
    if (sk.marked_for_removal) continue;
    const cat = sk.category?.trim() || "General";
    const existing = skillsByCategory.get(cat) || [];
    existing.push(sk);
    skillsByCategory.set(cat, existing);
  }

  const skillGroups: RenderSkillGroup[] = Array.from(skillsByCategory.entries()).map(
    ([category, skList]) => ({
      category,
      items: skList.map((s) => s.name).join(", "),
      skill_ids: skList.map((s) => s.id),
    })
  );

  const buildEntries = (kind: "experience" | "project" | "education"): RenderEntry[] => {
    return profile.entries
      .filter((e) => e.kind === kind && !e.archived)
      .map((e) => {
        const defaultTitle =
          e.titles.find((t) => t.is_default)?.title || e.titles[0]?.title || "";
        const defaultTitleId =
          e.titles.find((t) => t.is_default)?.id || e.titles[0]?.id || null;

        const dateLabel = e.start_date
          ? e.end_date
            ? `${e.start_date} – ${e.end_date}`
            : `${e.start_date} – Presente`
          : "";

        return {
          entry_id: e.id,
          title: defaultTitle,
          title_id: defaultTitleId,
          org: e.org,
          location: e.location || null,
          date_label: dateLabel,
          link: e.link || null,
          selected: e.default_selected !== false,
          bullets: e.facts
            .filter((f) => !f.marked_for_removal)
            .map((f) => ({
              text: f.text,
              fact_ids: [f.id],
              skill_ids: f.skill_ids || [],
              selected: f.default_selected !== false,
            })),
        };
      });
  };

  return {
    schema_version: profile.schema_version || "1.0.0",
    theme,
    lang: profile.base_lang || "es",
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
    experience: buildEntries("experience"),
    projects: buildEntries("project"),
    education: buildEntries("education"),
    section_order: DEFAULT_SECTION_ORDER,
    design: DEFAULT_DESIGN_KNOBS,
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
        org: re.org,
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

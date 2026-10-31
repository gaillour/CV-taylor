export type ThemeName = "classic" | "modern" | "engineering";
export type LangCode = "es" | "en";
export type EntryKind = "experience" | "project" | "education";
export type DatePrecision = "year" | "month" | "day";
export type TitleSource = "user" | "ai" | "imported";

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  github?: string | null;
  linkedin?: string | null;
  website?: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  aliases?: string[];
  level?: string | null;
  tags?: string[];
  source?: TitleSource;
  approved?: boolean;
  approved_at?: string | null;
  marked_for_removal?: boolean;
  removal_reason?: string | null;
}

export interface EntryTitle {
  id: string;
  entry_id?: string | null;
  title: string;
  archetype?: string | null;
  is_default?: boolean;
  source?: TitleSource;
  approved?: boolean;
  approved_at?: string | null;
}

export interface Fact {
  id: string;
  entry_id?: string | null;
  text: string;
  tags?: string[];
  skill_ids?: string[];
  position?: number;
  pinned?: boolean;
  weight?: number;
  default_selected?: boolean;
  source?: TitleSource;
  approved?: boolean;
  approved_at?: string | null;
  proposed_text?: string | null;
  marked_for_removal?: boolean;
  removal_reason?: string | null;
}

export interface EnhanceStats {
  distilled_facts: number;
  improved_facts: number;
  suggested_titles: number;
  detected_skills: number;
  redundant_facts_marked?: number;
  redundant_skills_marked?: number;
}

export interface EnhanceProfileResponse {
  profile: Profile;
  stats: EnhanceStats;
  used_llm: boolean;
}

export interface Entry {
  id: string;
  kind: EntryKind;
  org: string;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  date_precision?: DatePrecision;
  link?: string | null;
  context?: string;
  position?: number;
  archived?: boolean;
  default_selected?: boolean;
  archetypes?: string[];
  min_bullets?: number;
  max_bullets?: number;
  titles: EntryTitle[];
  facts: Fact[];
  skill_ids?: string[];
}

export type MirrorStatus = "ok" | "partial";

export interface Profile {
  id: string;
  schema_version: string;
  full_name: string;
  contact: ContactInfo;
  base_lang: LangCode;
  summary?: string | null;
  skills: Skill[];
  entries: Entry[];
}

export interface MirrorResponse {
  profile: Profile;
  mirror_status: MirrorStatus;
}

export interface SwapBaseResponse {
  profile: Profile;
  mirror: Profile;
  mirror_status: MirrorStatus;
}

export type SourceLangOption = "auto" | LangCode;

export interface ImportProfileResponse {
  profile: Profile;
  mirror: Profile;
  mirror_status: MirrorStatus;
  detected_lang: LangCode;
  translated_to_base: boolean;
}

export interface RenderSkillGroup {
  category: string;
  items: string;
  skill_ids: string[];
}

export interface RenderBullet {
  text: string;
  fact_ids?: string[];
  skill_ids?: string[];
  priority?: number;
  pinned?: boolean;
  position?: number;
  suggested_alternatives?: string[];
  selected?: boolean;
}

export interface RenderEntry {
  entry_id: string;
  title: string;
  title_id?: string | null;
  org: string;
  location?: string | null;
  date_label: string;
  link?: string | null;
  bullets: RenderBullet[];
  min_bullets?: number;
  max_bullets?: number;
  selected?: boolean;
}

export interface DesignKnobs {
  density: number;
  font_size_pt: number;
  leading_em: number;
  section_spacing_pt: number;
  entry_spacing_pt: number;
  bullet_spacing_pt: number;
  margin_x_cm: number;
  margin_y_cm: number;
  font_family: string;
}

export interface RenderModel {
  schema_version: string;
  theme: ThemeName;
  lang: LangCode;
  full_name: string;
  contact: ContactInfo;
  summary?: string | null;
  summary_fact_ids: string[];
  skills: RenderSkillGroup[];
  experience: RenderEntry[];
  projects: RenderEntry[];
  education: RenderEntry[];
  design: DesignKnobs;
}

export interface FitReport {
  pages: number;
  end_page: number;
  end_y_pt: number;
  usable_height_pt: number;
  fill_ratio: number;
  fill_pct: number;
  fits_one_page: boolean;
  underfilled: boolean;
  density: number;
}

export interface PreviewResponse {
  svg: string;
  fit_report: FitReport;
  render_model: RenderModel;
}

export interface JobSpec {
  company?: string | null;
  role?: string | null;
  lang: LangCode;
  archetype?: string | null;
  keywords: string[];
  must_have: string[];
  nice_to_have: string[];
  responsibilities: string[];
}

export interface TailorRequest {
  offer_text: string;
  theme?: ThemeName;
  lang?: LangCode | null;
  no_llm?: boolean;
  profile?: unknown;
}

export interface TailorResponse {
  render_model: RenderModel;
  svg: string;
  fit_report: FitReport;
  job_spec: JobSpec;
  ats_score: number;
  ats_passed: boolean;
  keyword_matches: string[];
  keyword_gaps: string[];
  ats_issues: string[];
  validation_valid: boolean;
  checked_bullets: number;
  iterations_performed: number;
}

export interface ExportSnapshotResponse {
  id: string;
  created_at: string;
  pdf_sha256: string;
  path: string;
  snapshot: Snapshot;
}

export interface Snapshot {
  id: string;
  created_at: string;
  parent_id: string | null;
  company: string | null;
  role: string | null;
  lang: LangCode;
  theme: ThemeName;
  pdf_sha256: string;
  ats_score: number | null;
  job_spec: JobSpec | null;
  render_model: RenderModel;
  metadata: Record<string, unknown>;
  deleted_at?: string | null;
}

export interface SnapshotSummary {
  id: string;
  created_at: string;
  parent_id: string | null;
  company: string | null;
  role: string | null;
  lang: LangCode;
  theme: ThemeName;
  ats_score: number | null;
  pdf_sha256: string;
  full_name: string;
  deleted_at?: string | null;
}

export interface UpsertBulletFactResponse {
  fact: Fact;
  created: boolean;
  profile: Profile;
}

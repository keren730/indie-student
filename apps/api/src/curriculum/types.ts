// Shape of the curriculum data. The compiler checks every curriculum file against it.

export interface SubjectDef {
  /** Stable English key, for example "math". */
  slug: string;
  /** Hebrew name shown to kids. */
  nameHe: string;
}

export interface TopicDef {
  /** Stable English key. Seed data and material mapping refer to topics by slug. */
  slug: string;
  /** Hebrew name shown to kids. */
  nameHe: string;
  grade: number;
  /** Slug of the parent topic. Must appear EARLIER in the list. Omit for top-level topics. */
  parent?: string;
  /** Slugs of topics to learn first. */
  prerequisites?: string[];
}

export interface CurriculumDef {
  subject: SubjectDef;
  /** Order matters: it becomes the display order, and parents must come before children. */
  topics: TopicDef[];
}

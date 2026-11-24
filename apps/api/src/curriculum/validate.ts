import type { CurriculumDef } from './types.js';

/** Returns a list of problems. An empty list means the curriculum is valid. */
export function validateCurriculum(curriculum: CurriculumDef): string[] {
  const errors: string[] = [];
  const allSlugs = new Set(curriculum.topics.map((t) => t.slug));
  const seen = new Set<string>();

  for (const topic of curriculum.topics) {
    if (seen.has(topic.slug)) {
      errors.push(`Duplicate slug: "${topic.slug}"`);
    }
    // The parent must already be in `seen`, so parents come before children (the seed relies on it).
    if (topic.parent !== undefined && !seen.has(topic.parent)) {
      errors.push(`Topic "${topic.slug}" has parent "${topic.parent}" that is missing or listed after it`);
    }
    seen.add(topic.slug);

    for (const prerequisite of topic.prerequisites ?? []) {
      if (prerequisite === topic.slug) {
        errors.push(`Topic "${topic.slug}" lists itself as a prerequisite`);
      } else if (!allSlugs.has(prerequisite)) {
        errors.push(`Topic "${topic.slug}" has unknown prerequisite "${prerequisite}"`);
      }
    }
  }

  // Cycle detection only makes sense when every prerequisite points at a real topic.
  if (errors.length === 0) {
    const cycle = findPrerequisiteCycle(curriculum);
    if (cycle) {
      errors.push(`Prerequisite cycle: ${cycle.join(' -> ')}`);
    }
  }

  return errors;
}

export function assertValidCurriculum(curriculum: CurriculumDef): void {
  const errors = validateCurriculum(curriculum);
  if (errors.length > 0) {
    throw new Error(`Invalid curriculum:\n- ${errors.join('\n- ')}`);
  }
}

// Depth-first search. A topic is "in progress" while we explore its prerequisites;
// reaching an in-progress topic again means we walked in a circle.
function findPrerequisiteCycle(curriculum: CurriculumDef): string[] | null {
  const prerequisitesOf = new Map(curriculum.topics.map((t) => [t.slug, t.prerequisites ?? []]));
  const done = new Set<string>();
  const path: string[] = [];

  function visit(slug: string): string[] | null {
    const inPath = path.indexOf(slug);
    if (inPath !== -1) {
      return [...path.slice(inPath), slug];
    }
    if (done.has(slug)) {
      return null;
    }
    path.push(slug);
    for (const prerequisite of prerequisitesOf.get(slug) ?? []) {
      const cycle = visit(prerequisite);
      if (cycle) return cycle;
    }
    path.pop();
    done.add(slug);
    return null;
  }

  for (const slug of prerequisitesOf.keys()) {
    const cycle = visit(slug);
    if (cycle) return cycle;
  }
  return null;
}

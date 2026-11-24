import { and, eq, inArray, notInArray } from 'drizzle-orm';
import type { db } from './client.js';
import { subjects, topics, topicPrerequisites } from './schema.js';
import type { CurriculumDef } from '../curriculum/types.js';
import { assertValidCurriculum } from '../curriculum/validate.js';

type Database = typeof db;

/**
 * Loads a curriculum into the database. Safe to run repeatedly: rows are matched by slug
 * and updated, and the whole thing runs in one transaction, so a failure changes nothing.
 */
export async function seedCurriculum(database: Database, curriculum: CurriculumDef): Promise<void> {
  assertValidCurriculum(curriculum);

  await database.transaction(async (tx) => {
    const [subject] = await tx
      .insert(subjects)
      .values(curriculum.subject)
      .onConflictDoUpdate({ target: subjects.slug, set: { nameHe: curriculum.subject.nameHe } })
      .returning({ id: subjects.id });
    if (!subject) throw new Error('Subject upsert returned no row');

    // Parents come before children (validated above), so a parent's id is known when needed.
    const idBySlug = new Map<string, string>();
    for (const [index, topic] of curriculum.topics.entries()) {
      const values = {
        subjectId: subject.id,
        grade: topic.grade,
        parentId: topic.parent ? idOf(idBySlug, topic.parent) : null,
        nameHe: topic.nameHe,
        sortOrder: index,
      };
      const [row] = await tx
        .insert(topics)
        .values({ slug: topic.slug, ...values })
        .onConflictDoUpdate({ target: topics.slug, set: values })
        .returning({ id: topics.id });
      if (!row) throw new Error(`Topic upsert returned no row for "${topic.slug}"`);
      idBySlug.set(topic.slug, row.id);
    }

    // Topics removed from the file are removed from the database too (their links cascade).
    // Once attempts reference topics, this will need a softer approach (archive, not delete).
    await tx
      .delete(topics)
      .where(and(eq(topics.subjectId, subject.id), notInArray(topics.slug, [...idBySlug.keys()])));

    // Prerequisites are replaced wholesale, so links removed from the file disappear too.
    await tx.delete(topicPrerequisites).where(inArray(topicPrerequisites.topicId, [...idBySlug.values()]));
    const links = curriculum.topics.flatMap((topic) =>
      (topic.prerequisites ?? []).map((prerequisite) => ({
        topicId: idOf(idBySlug, topic.slug),
        prerequisiteId: idOf(idBySlug, prerequisite),
      })),
    );
    if (links.length > 0) {
      await tx.insert(topicPrerequisites).values(links);
    }
  });
}

function idOf(idBySlug: Map<string, string>, slug: string): string {
  const id = idBySlug.get(slug);
  if (!id) throw new Error(`Unknown topic slug: "${slug}"`);
  return id;
}

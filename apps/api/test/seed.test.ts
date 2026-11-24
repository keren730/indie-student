import { describe, it, expect, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { subjects, topics, topicPrerequisites } from '../src/db/schema.js';
import { seedCurriculum } from '../src/db/seed.js';
import { grade4Math } from '../src/curriculum/grade4-math.js';

const slugs = grade4Math.topics.map((t) => t.slug);
const expectedLinks = grade4Math.topics.reduce((sum, t) => sum + (t.prerequisites?.length ?? 0), 0);

async function counts() {
  const topicRows = await db.select({ id: topics.id }).from(topics).where(inArray(topics.slug, slugs));
  const linkRows = await db
    .select()
    .from(topicPrerequisites)
    .where(
      inArray(
        topicPrerequisites.topicId,
        topicRows.map((r) => r.id),
      ),
    );
  return { topics: topicRows.length, links: linkRows.length };
}

describe('seedCurriculum', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('loads every topic and prerequisite link, and is safe to run twice', async () => {
    await seedCurriculum(db, grade4Math);
    const first = await counts();
    expect(first).toEqual({ topics: slugs.length, links: expectedLinks });

    await seedCurriculum(db, grade4Math);
    expect(await counts()).toEqual(first);
  });

  it('removes topics that are no longer in the curriculum file', async () => {
    await seedCurriculum(db, grade4Math);
    const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.slug, grade4Math.subject.slug));
    if (!subject) throw new Error('math subject missing after seed');

    await db.insert(topics).values({ subjectId: subject.id, grade: 4, slug: 'stale-test-topic', nameHe: 'ישן' });
    await seedCurriculum(db, grade4Math);

    const stale = await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, 'stale-test-topic'));
    expect(stale).toEqual([]);
  });
});

import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { topics, topicPrerequisites } from '../db/schema.js';

export interface TopicDto {
  id: string;
  slug: string;
  nameHe: string;
  grade: number;
  parentId: string | null;
  sortOrder: number;
  /** Slugs of the topics to learn first. */
  prerequisites: string[];
}

/** Returns every topic as a flat list. The client builds the tree from `parentId`. */
export async function listTopics(database: Database, grade?: number): Promise<TopicDto[]> {
  const topicRows = await database
    .select({
      id: topics.id,
      slug: topics.slug,
      nameHe: topics.nameHe,
      grade: topics.grade,
      parentId: topics.parentId,
      sortOrder: topics.sortOrder,
    })
    .from(topics)
    .where(grade === undefined ? undefined : eq(topics.grade, grade))
    .orderBy(topics.sortOrder, topics.slug);

  // One query for all links, instead of one query per topic (the "N+1" problem).
  const linkRows = await database
    .select({ topicId: topicPrerequisites.topicId, prerequisiteSlug: topics.slug })
    .from(topicPrerequisites)
    .innerJoin(topics, eq(topics.id, topicPrerequisites.prerequisiteId));

  const prerequisitesByTopic = new Map<string, string[]>();
  for (const link of linkRows) {
    const list = prerequisitesByTopic.get(link.topicId) ?? [];
    list.push(link.prerequisiteSlug);
    prerequisitesByTopic.set(link.topicId, list);
  }

  return topicRows.map((row) => ({
    ...row,
    prerequisites: (prerequisitesByTopic.get(row.id) ?? []).sort(),
  }));
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';
import { seedCurriculum } from '../src/db/seed.js';
import { grade4Math } from '../src/curriculum/grade4-math.js';
import type { TopicDto } from '../src/services/topics.js';

describe('GET /topics', () => {
  const app = buildApp({ db });
  let topics: TopicDto[];

  beforeAll(async () => {
    await seedCurriculum(db, grade4Math);
    const res = await app.inject({ method: 'GET', url: '/topics' });
    expect(res.statusCode).toBe(200);
    topics = res.json().topics;
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('returns every topic in the curriculum', () => {
    expect(topics).toHaveLength(grade4Math.topics.length);
  });

  it('lists topics in curriculum order', () => {
    expect(topics.map((t) => t.slug)).toEqual(grade4Math.topics.map((t) => t.slug));
  });

  it('links a child to its parent by id, and leaves top-level parentId null', () => {
    const fractions = topics.find((t) => t.slug === 'fractions');
    const concept = topics.find((t) => t.slug === 'fractions-concept');
    expect(fractions?.parentId).toBeNull();
    expect(concept?.parentId).toBe(fractions?.id);
  });

  it('includes prerequisite slugs, sorted', () => {
    const longDivision = topics.find((t) => t.slug === 'long-division');
    expect(longDivision?.prerequisites).toEqual(['multiplication', 'multiplication-tables']);
  });

  it('gives an empty prerequisite list to topics with none', () => {
    const concept = topics.find((t) => t.slug === 'fractions-concept');
    expect(concept?.prerequisites).toEqual([]);
  });

  it('returns an empty list with ?grade=5', async () => {
    const res = await app.inject({ method: 'GET', url: '/topics?grade=5' });
    expect(res.statusCode).toBe(200);
    expect(res.json().topics).toHaveLength(0);
  });

  it('returns all grade 4 topics with ?grade=4', async () => {
    const res = await app.inject({ method: 'GET', url: '/topics?grade=4' });
    expect(res.statusCode).toBe(200);
    expect(res.json().topics).toHaveLength(27);
  });

  it.each(['abc', '4.5', '0', '13', ''])('returns 400 for invalid ?grade=%s', async (value) => {
    const res = await app.inject({ method: 'GET', url: `/topics?grade=${value}` });
    expect(res.statusCode).toBe(400);
  });
});

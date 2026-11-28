import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';
import { families, users } from '../src/db/schema.js';
import { createSession } from '../src/services/auth.js';

const TEST_DOMAIN = '@family-test.example';

describe('family isolation', () => {
  const app = buildApp({ db });

  // Registers a family and logs in. Returns the cookie header and the family's ids.
  async function newFamily(name: string) {
    const email = `${randomUUID()}${TEST_DOMAIN}`;
    const password = 'correct-horse-battery';
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { familyName: name, displayName: `${name} parent`, email, password },
    });
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    return {
      cookie: `session=${login.cookies[0]?.value}`,
      familyId: reg.json().user.familyId as string,
      parentId: reg.json().user.id as string,
    };
  }

  const addChild = (cookie: string, displayName: string) =>
    app.inject({ method: 'POST', url: '/family/children', headers: { cookie }, payload: { displayName } });
  const members = (cookie: string) => app.inject({ method: 'GET', url: '/family/members', headers: { cookie } });

  let a: Awaited<ReturnType<typeof newFamily>>;
  let b: Awaited<ReturnType<typeof newFamily>>;

  beforeAll(async () => {
    a = await newFamily('Alpha');
    b = await newFamily('Beta');
    await addChild(a.cookie, 'Alpha child');
    await addChild(b.cookie, 'Beta child');
  });

  afterAll(async () => {
    const rows = await db
      .select({ familyId: users.familyId })
      .from(users)
      .where(like(users.email, `%${TEST_DOMAIN}`));
    for (const row of rows) await db.delete(families).where(eq(families.id, row.familyId));
    await app.close();
    await pool.end();
  });

  it('requires login', async () => {
    expect((await app.inject({ method: 'GET', url: '/family/members' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/family/children', payload: { displayName: 'x' } })).statusCode).toBe(401);
  });

  it('shows a family only its own members', async () => {
    const res = await members(a.cookie);
    expect(res.statusCode).toBe(200);
    expect(
      res
        .json()
        .members.map((m: { displayName: string }) => m.displayName)
        .sort(),
    ).toEqual(['Alpha child', 'Alpha parent']);
  });

  it('never leaks another family, in either direction', async () => {
    const forA = JSON.stringify((await members(a.cookie)).json());
    const forB = JSON.stringify((await members(b.cookie)).json());
    expect(forA).not.toContain('Beta');
    expect(forB).not.toContain('Alpha');
  });

  it('ignores a familyId smuggled in the query or body', async () => {
    const res = await app.inject({ method: 'GET', url: `/family/members?familyId=${b.familyId}`, headers: { cookie: a.cookie } });
    expect(JSON.stringify(res.json())).not.toContain('Beta');

    const post = await app.inject({
      method: 'POST',
      url: '/family/children',
      headers: { cookie: a.cookie },
      payload: { displayName: 'Sneaky', familyId: b.familyId },
    });
    expect(post.statusCode).toBe(201);
    const forB = JSON.stringify((await members(b.cookie)).json());
    expect(forB).not.toContain('Sneaky');
    expect(JSON.stringify((await members(a.cookie)).json())).toContain('Sneaky');
  });

  it('forbids a child from adding children (authorization, not just authentication)', async () => {
    // Children cannot log in yet, so create a session for one directly.
    const child = (await members(a.cookie)).json().members.find((m: { role: string }) => m.role === 'child');
    const token = await createSession(db, child.id);
    const res = await addChild(`session=${token}`, 'Not allowed');
    expect(res.statusCode).toBe(403);
  });

  it('rejects an empty child name with 400', async () => {
    expect((await addChild(a.cookie, '')).statusCode).toBe(400);
  });
});

import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';
import { families, sessions, users } from '../src/db/schema.js';

// Every test email ends with this domain, so cleanup can remove exactly what the tests created.
const TEST_DOMAIN = '@auth-test.example';

describe('auth', () => {
  const app = buildApp({ db });

  const newEmail = () => `${randomUUID()}${TEST_DOMAIN}`;
  const register = (email: string, password = 'correct-horse-battery') =>
    app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { familyName: 'Test family', displayName: 'Test parent', email, password },
    });
  const login = (email: string, password = 'correct-horse-battery') =>
    app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  const cookieOf = (res: Awaited<ReturnType<typeof login>>) => `session=${res.cookies[0]?.value}`;

  afterAll(async () => {
    // Deleting the family cascades to its users and their sessions.
    const rows = await db
      .select({ familyId: users.familyId })
      .from(users)
      .where(like(users.email, `%${TEST_DOMAIN}`));
    for (const row of rows) await db.delete(families).where(eq(families.id, row.familyId));
    await app.close();
    await pool.end();
  });

  it('registers a family with a parent, and never returns the password hash', async () => {
    const res = await register(newEmail());
    expect(res.statusCode).toBe(201);
    expect(res.json().user).toMatchObject({ role: 'parent', displayName: 'Test parent' });
    expect(JSON.stringify(res.json())).not.toContain('argon2');
  });

  it('stores an argon2 hash, not the password', async () => {
    const email = newEmail();
    await register(email, 'my-secret-password');
    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row?.passwordHash).not.toContain('my-secret-password');
  });

  it('rejects a duplicate email with 409, ignoring letter case', async () => {
    const email = newEmail();
    expect((await register(email)).statusCode).toBe(201);
    expect((await register(email.toUpperCase())).statusCode).toBe(409);
  });

  it.each([{ email: 'not-an-email', password: 'long-enough-password' }, { email: 'a@b.co', password: 'short' }, { email: 'a@b.co' }])(
    'rejects invalid registration %j with 400',
    async (body) => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { familyName: 'F', displayName: 'P', ...body },
      });
      expect(res.statusCode).toBe(400);
    },
  );

  it('logs in, sets an httpOnly cookie, and /auth/me returns the user', async () => {
    const email = newEmail();
    await register(email);
    const res = await login(email);
    expect(res.statusCode).toBe(200);
    expect(res.cookies[0]).toMatchObject({ name: 'session', httpOnly: true, sameSite: 'Lax' });

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: cookieOf(res) } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.displayName).toBe('Test parent');
  });

  it('stores only a hash of the session token', async () => {
    const email = newEmail();
    await register(email);
    const res = await login(email);
    const token = res.cookies[0]!.value;
    const rows = await db.select().from(sessions).where(eq(sessions.id, token));
    expect(rows).toHaveLength(0);
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const email = newEmail();
    await register(email);
    const wrongPassword = await login(email, 'wrong-password-123');
    const unknownEmail = await login(newEmail());
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
  });

  it('returns 401 from /auth/me without a cookie or with a made-up one', async () => {
    expect((await app.inject({ method: 'GET', url: '/auth/me' })).statusCode).toBe(401);
    const fake = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: 'session=made-up' } });
    expect(fake.statusCode).toBe(401);
  });

  it('logout invalidates the session on the server, not just in the browser', async () => {
    const email = newEmail();
    await register(email);
    const cookie = cookieOf(await login(email));

    const out = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });

  it('rejects an expired session', async () => {
    const email = newEmail();
    await register(email);
    const res = await login(email);
    const cookie = cookieOf(res);
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, user!.id));
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });
});

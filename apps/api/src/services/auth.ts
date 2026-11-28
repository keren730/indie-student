import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { eq, and, gt } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { families, sessions, users } from '../db/schema.js';

const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  familyId: string;
  role: 'parent' | 'child';
  displayName: string;
}

export class EmailTakenError extends Error {}

// A real hash of a throwaway password. Login verifies against it when the email is unknown,
// so "no such user" and "wrong password" take the same time and look the same to an attacker.
const dummyHash = await argon2.hash('not-a-real-password');

// The cookie holds the random token. The database only stores its hash.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Creates a family and its first parent in one transaction: both rows exist or neither does.
export async function registerFamily(
  database: Database,
  input: { familyName: string; displayName: string; email: string; password: string },
): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const passwordHash = await argon2.hash(input.password);

  return database.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) throw new EmailTakenError();

    const [family] = await tx.insert(families).values({ name: input.familyName }).returning();
    const [user] = await tx
      .insert(users)
      .values({ familyId: family!.id, role: 'parent', displayName: input.displayName, email, passwordHash })
      .returning();
    return { id: user!.id, familyId: user!.familyId, role: user!.role, displayName: user!.displayName };
  });
}

// Returns a new session token, or null if the email or password is wrong.
export async function login(database: Database, emailInput: string, password: string): Promise<string | null> {
  const email = normalizeEmail(emailInput);
  const [user] = await database.select().from(users).where(eq(users.email, email));

  const ok = await argon2.verify(user?.passwordHash ?? dummyHash, password);
  if (!user || !ok) return null;

  return createSession(database, user.id);
}

// Creates a session for a user and returns the token that goes in the cookie.
export async function createSession(database: Database, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await database.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

// Finds the user behind a cookie token, or null if the token is unknown or expired.
export async function getUserByToken(database: Database, token: string): Promise<AuthUser | null> {
  const [row] = await database
    .select({ id: users.id, familyId: users.familyId, role: users.role, displayName: users.displayName })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}

export async function logout(database: Database, token: string): Promise<void> {
  await database.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

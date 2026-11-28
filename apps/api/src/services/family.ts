import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { users } from '../db/schema.js';

export interface FamilyMemberDto {
  id: string;
  role: 'parent' | 'child';
  displayName: string;
}

// Every function here takes familyId as a required argument and puts it in the WHERE clause,
// so it is impossible to call them without saying whose data you want.

export async function listMembers(database: Database, familyId: string): Promise<FamilyMemberDto[]> {
  return database
    .select({ id: users.id, role: users.role, displayName: users.displayName })
    .from(users)
    .where(eq(users.familyId, familyId))
    .orderBy(asc(users.createdAt), asc(users.id));
}

// Children have no email or password. They are profiles that a parent adds.
export async function addChild(database: Database, familyId: string, displayName: string): Promise<FamilyMemberDto> {
  const [child] = await database
    .insert(users)
    .values({ familyId, role: 'child', displayName })
    .returning({ id: users.id, role: users.role, displayName: users.displayName });
  return child!;
}

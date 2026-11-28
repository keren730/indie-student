import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Database } from '../db/client.js';
import { getUserByToken, type AuthUser } from '../services/auth.js';

export const SESSION_COOKIE = 'session';

// Tells TypeScript that a request can carry the logged-in user.
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// A guard that runs before a route handler (Fastify calls it a preHandler).
// With no valid session it answers 401 and the handler never runs.
// With one, it puts the user on `request.user`. This is the ONLY place a user identity comes from:
// handlers must take familyId from here, never from the URL, query or body.
export function requireUser(db: Database) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE];
    const user = token ? await getUserByToken(db, token) : null;
    if (!user) return reply.code(401).send({ error: 'Not logged in' });
    request.user = user;
  };
}

// For routes behind requireUser: returns the user, or fails loudly if the guard was forgotten.
export function currentUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw new Error('currentUser() called on a route without requireUser');
  return request.user;
}

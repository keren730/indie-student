import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Database } from '../db/client.js';
import { EmailTakenError, getUserByToken, login, logout, registerFamily } from '../services/auth.js';

export const SESSION_COOKIE = 'session';

const cookieOptions = {
  httpOnly: true, // browser JavaScript cannot read it, which limits the damage of an XSS bug
  sameSite: 'lax' as const, // not sent on cross-site POSTs, which blocks most CSRF
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

const credentials = {
  email: { type: 'string', format: 'email', maxLength: 254 },
  // Cap the length: hashing a huge password would be a cheap way to burn server CPU.
  password: { type: 'string', minLength: 8, maxLength: 200 },
} as const;

export async function authRoutes(app: FastifyInstance, options: { db: Database }) {
  const { db } = options;

  app.post<{ Body: { familyName: string; displayName: string; email: string; password: string } }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['familyName', 'displayName', 'email', 'password'],
          properties: {
            familyName: { type: 'string', minLength: 1, maxLength: 100 },
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            ...credentials,
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await registerFamily(db, request.body);
        return reply.code(201).send({ user });
      } catch (error) {
        if (error instanceof EmailTakenError) return reply.code(409).send({ error: 'Email already registered' });
        throw error;
      }
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    { schema: { body: { type: 'object', required: ['email', 'password'], properties: credentials } } },
    async (request, reply) => {
      const token = await login(db, request.body.email, request.body.password);
      if (!token) return reply.code(401).send({ error: 'Invalid email or password' });
      const user = await getUserByToken(db, token);
      return reply.setCookie(SESSION_COOKIE, token, cookieOptions).send({ user });
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    const token = readToken(request);
    if (token) await logout(db, token);
    return reply.clearCookie(SESSION_COOKIE, { path: '/' }).code(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    const token = readToken(request);
    const user = token ? await getUserByToken(db, token) : null;
    if (!user) return reply.code(401).send({ error: 'Not logged in' });
    return { user };
  });
}

function readToken(request: FastifyRequest): string | undefined {
  return request.cookies[SESSION_COOKIE];
}

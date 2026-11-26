import Fastify from 'fastify';
import type { Database } from './db/client.js';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth.js';
import { topicRoutes } from './routes/topics.js';

export interface AppDependencies {
  db: Database;
}

// Builds the Fastify instance without starting it, so tests can use it directly.
// The database is passed in, not imported, so a test can hand in a different one.
export function buildApp({ db }: AppDependencies) {
  const app = Fastify({ logger: false });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.register(cookie);
  app.register(authRoutes, { db });
  app.register(topicRoutes, { db });

  return app;
}

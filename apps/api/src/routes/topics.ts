import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client.js';
import { listTopics } from '../services/topics.js';

// The route only handles HTTP. The logic and the SQL live in the service.
export async function topicRoutes(app: FastifyInstance, options: { db: Database }) {
  app.get('/topics', async () => {
    return { topics: await listTopics(options.db) };
  });
}

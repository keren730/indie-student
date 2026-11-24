import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client.js';
import { listTopics } from '../services/topics.js';

// The route only handles HTTP. The logic and the SQL live in the service.
export async function topicRoutes(app: FastifyInstance, options: { db: Database }) {
  // The schema rejects bad input with a 400 and converts `grade` from text to a number,
  // so the handler can trust `request.query.grade` (the generic below tells TypeScript the same).
  app.get<{ Querystring: { grade?: number } }>(
    '/topics',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            grade: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
      },
    },
    async (request) => {
      return { topics: await listTopics(options.db, request.query.grade) };
    },
  );
}

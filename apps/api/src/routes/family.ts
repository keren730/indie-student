import type { FastifyInstance } from 'fastify';
import type { Database } from '../db/client.js';
import { currentUser, requireUser } from '../auth/require-user.js';
import { addChild, listMembers } from '../services/family.js';

export async function familyRoutes(app: FastifyInstance, options: { db: Database }) {
  const { db } = options;

  // No :familyId in any URL below. Whose family it is comes from the session, so a user
  // cannot ask for another family's data even by guessing IDs.
  app.get('/family/members', { preHandler: requireUser(db) }, async (request) => {
    const user = currentUser(request);
    return { members: await listMembers(db, user.familyId) };
  });

  app.post<{ Body: { displayName: string } }>(
    '/family/children',
    {
      preHandler: requireUser(db),
      schema: {
        body: {
          type: 'object',
          required: ['displayName'],
          properties: { displayName: { type: 'string', minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (request, reply) => {
      const user = currentUser(request);
      // Authentication says who you are. Authorization says what you may do: only parents add children.
      if (user.role !== 'parent') return reply.code(403).send({ error: 'Only a parent can add a child' });
      const child = await addChild(db, user.familyId, request.body.displayName);
      return reply.code(201).send({ child });
    },
  );
}

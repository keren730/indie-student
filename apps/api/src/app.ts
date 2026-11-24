import Fastify from 'fastify';

// Builds the Fastify instance without starting it, so tests can use it directly.
export function buildApp() {
  const app = Fastify({ logger: false });

  app.get('/health', async () => { return { 
    status: "ok"
   } });
  return app;
}

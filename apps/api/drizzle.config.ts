import { defineConfig } from 'drizzle-kit';

// Load the repo-root .env so the CLI sees DATABASE_URL.
process.loadEnvFile('../../.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle', // generated SQL migrations land here and ARE committed
  dbCredentials: { url: process.env.DATABASE_URL! },
});

import { defineConfig } from 'vitest/config';

// Load the repo-root .env so tests see DATABASE_URL (built into Node, no extra dependency).
process.loadEnvFile('../../.env');

export default defineConfig({
  test: {
    // Test files share one local database, so run them one at a time to avoid interference.
    fileParallelism: false,
  },
});

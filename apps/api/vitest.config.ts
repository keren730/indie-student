import { defineConfig } from 'vitest/config';

// Load the repo-root .env so tests see DATABASE_URL (built into Node, no extra dependency).
process.loadEnvFile('../../.env');

export default defineConfig({});

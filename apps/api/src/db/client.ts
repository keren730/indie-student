import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');
}

// One pool for the whole process: connections are reused, not opened per request.
export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool);

export type Database = typeof db;

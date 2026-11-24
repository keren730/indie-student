import { describe, it, expect, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';

describe('database connection', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('can run a query', async () => {
    const result = await db.execute(sql`select 1 as ok`);
    expect(result.rows[0]).toEqual({ ok: 1 });
  });
});

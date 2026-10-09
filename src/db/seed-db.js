import { readFile } from 'node:fs/promises';

export async function seedDatabase(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(74201910)');
    const result = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM demo_seed_status WHERE seed_name = 'demo-data-v1'
       ) AS already_seeded`
    );

    if (result.rows[0].already_seeded) {
      await client.query('COMMIT');
      return false;
    }

    const demoData = await readFile(new URL('../../db/demo-data.sql', import.meta.url), 'utf8');
    await client.query(demoData);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

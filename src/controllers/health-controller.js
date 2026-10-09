import { pool } from '../db/pool.js';
import { databaseError } from '../middlewares/validation.js';

export async function getHealth(_req, res) {
  try {
    const result = await pool.query('SELECT 1 AS connected');
    res.json({ connected: result.rows[0].connected === 1 });
  } catch (error) {
    databaseError(error, res);
  }
}

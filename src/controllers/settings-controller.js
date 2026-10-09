import { pool } from '../db/pool.js';
import { settingsFields } from '../config/resources.js';
import { validateFields, databaseError } from '../middlewares/validation.js';

export async function getSettings(_req, res) {
  try {
    const result = await pool.query(
      `SELECT cs.*,
              COALESCE((SELECT SUM(total_employer_cost) FROM payroll_calculated WHERE company_id = cs.company_id), 0)
                / NULLIF(cs.monthly_billable_hours_per_professional * cs.professional_count, 0) AS cost_per_hour
       FROM company_settings cs
       WHERE cs.company_id = $1`,
      [req.auth.companyId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    databaseError(error, res);
  }
}

export async function updateSettings(req, res) {
  const client = await pool.connect();
  try {
    const values = validateFields(req.body, settingsFields);
    const fields = Object.keys(settingsFields);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE rda_tenant_runtime');
    await client.query("SELECT set_config('app.company_id', $1, true)", [req.auth.companyId]);
    await client.query(
      `INSERT INTO company_settings (company_id, id, ${fields.join(', ')})
       VALUES ($${fields.length + 1}, true, ${fields.map((_, index) => `$${index + 1}`).join(', ')})
       ON CONFLICT (company_id) DO UPDATE SET ${assignments}, updated_at = now()
       RETURNING company_id`,
      [...fields.map((field) => values[field]), req.auth.companyId]
    );
    await client.query(
      'UPDATE companies SET name = $2, tax_id = $3, municipality = $4 WHERE id = $1',
      [req.auth.companyId, values.company_name, values.tax_id, values.municipality]
    );
    await client.query('COMMIT');
    const result = await pool.query(
      `SELECT cs.*,
              COALESCE((SELECT SUM(total_employer_cost) FROM payroll_calculated WHERE company_id = cs.company_id), 0)
                / NULLIF(cs.monthly_billable_hours_per_professional * cs.professional_count, 0) AS cost_per_hour
       FROM company_settings cs
       WHERE cs.company_id = $1`,
      [req.auth.companyId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'El NIT ya está asignado a otra empresa.' });
    databaseError(error, res);
  } finally {
    client.release();
  }
}

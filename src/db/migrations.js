import { readFile } from 'node:fs/promises';

export async function prepareSchema(pool) {
  await pool.query(`DROP VIEW IF EXISTS sales_calculated CASCADE;
    DROP VIEW IF EXISTS service_costs_calculated CASCADE;
    DROP VIEW IF EXISTS expenses_calculated CASCADE;
    DROP VIEW IF EXISTS payroll_calculated CASCADE;
    DROP VIEW IF EXISTS investments_financing_calculated CASCADE;
    DROP VIEW IF EXISTS budget_control_calculated CASCADE;
    DROP VIEW IF EXISTS tax_obligations_calculated CASCADE`);
}

export async function applyMigrations(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  let changed = false;
  for (const name of [
    '001_multi_tenant_identity',
    '002_restricted_runtime_role',
    '003_company_profile_permissions',
    '004_financial_report_permission',
    '005_single_operator'
  ]) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (applied.rowCount) continue;
    const migration = await readFile(new URL(`../../db/migrations/${name}.sql`, import.meta.url), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration);
      await client.query('COMMIT');
      changed = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  return changed;
}

export async function applyTenantViews(pool) {
  const views = await readFile(new URL('../../db/tenant-views.sql', import.meta.url), 'utf8');
  await pool.query(views);
}

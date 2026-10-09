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

export async function ensureOperatorCompany(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(74201910)');

    const configuredCompany = await client.query(
      'SELECT company_id FROM company_settings ORDER BY company_id LIMIT 1'
    );
    if (configuredCompany.rowCount) {
      await client.query('COMMIT');
      return { companyId: configuredCompany.rows[0].company_id, created: false };
    }

    let company = await client.query(
      'SELECT id, name, tax_id, municipality FROM companies ORDER BY created_at, id LIMIT 1'
    );
    if (!company.rowCount) {
      company = await client.query(
        `INSERT INTO companies (id, name, tax_id, municipality)
         VALUES ('00000000-0000-4000-8000-000000000001', 'Empresa Demo Renta al Día', 'DEMO-OPERADOR-001', 'Bogotá D.C.')
         ON CONFLICT DO NOTHING
         RETURNING id, name, tax_id, municipality`
      );
      if (!company.rowCount) {
        company = await client.query(
          'SELECT id, name, tax_id, municipality FROM companies ORDER BY created_at, id LIMIT 1'
        );
      }
    }
    if (!company.rowCount) throw new Error('No fue posible crear la empresa demo para el operador.');

    const defaults = company.rows[0];
    const settings = await client.query(
      `INSERT INTO company_settings (
         company_id, id, company_name, tax_id, activity, municipality, fiscal_year, currency, scenario,
         opening_cash, monthly_sales_growth, annual_price_increase, annual_direct_cost_growth,
         annual_expense_growth, average_receivable_days, average_payable_days, inventory_days,
         annual_credit_interest_rate, income_tax_rate, vat_rate, default_arl_rate,
         employee_health_rate, employee_pension_rate, employer_health_rate, employer_pension_rate,
         family_compensation_rate, sena_rate, icbf_rate, severance_provision_rate,
         severance_interest_rate, service_bonus_rate, vacation_provision_rate, target_net_margin,
         minimum_cash_reserve, monthly_billable_hours_per_professional, professional_count
       ) VALUES (
         $1, true, $2, $3, 'Configuración inicial de demostración', $4, $5, 'COP', 'Base',
         0, 0.025, 0.06, 0.04, 0.05, 30, 30, 0,
         0.14, 0.35, 0.19, 0.00522,
         0.04, 0.04, 0.085, 0.12, 0.04, 0.02, 0.03, 0.0833,
         0.01, 0.0833, 0.0417, 0.18, 0, 120, 1
       )
       ON CONFLICT (company_id) DO NOTHING
       RETURNING company_id`,
      [
        defaults.id,
        defaults.name,
        defaults.tax_id,
        defaults.municipality,
        new Date().getFullYear()
      ]
    );
    await client.query('COMMIT');
    return { companyId: defaults.id, created: settings.rowCount > 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

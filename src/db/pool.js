import { Pool } from 'pg';
import { tenantContext } from './tenant-context.js';

const postgres = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});

export const pool = {
  connect: () => postgres.connect(),
  end: () => postgres.end(),
  privilegedQuery: (statement, values) => postgres.query(statement, values),
  async query(statement, values) {
    const { companyId } = tenantContext.getStore() || {};
    if (!companyId) return postgres.query(statement, values);

    const client = await postgres.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE rda_tenant_runtime');
      await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
      const result = await client.query(statement, values);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

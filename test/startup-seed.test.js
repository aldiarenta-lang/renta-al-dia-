import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureOperatorCompany } from '../src/db/seed-db.js';

function mockPool({ companySettings = [], companies = [] } = {}) {
  const statements = [];
  const client = {
    async query(statement, values) {
      statements.push({ statement, values });
      if (statement.includes('SELECT company_id FROM company_settings')) {
        return { rows: companySettings, rowCount: companySettings.length };
      }
      if (statement.includes('SELECT id, name, tax_id, municipality FROM companies')) {
        return { rows: companies, rowCount: companies.length };
      }
      if (statement.includes('INSERT INTO companies')) {
        const inserted = companies.length ? companies : [{
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Empresa Demo Renta al Día',
          tax_id: 'DEMO-OPERADOR-001',
          municipality: 'Bogotá D.C.'
        }];
        return { rows: inserted, rowCount: inserted.length };
      }
      if (statement.includes('INSERT INTO company_settings')) {
        return { rows: [{ company_id: values[0] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {}
  };
  return { connect: async () => client, statements };
}

test('creates a demo company and its settings if no operator data exists', async () => {
  const pool = mockPool();

  const result = await ensureOperatorCompany(pool);

  assert.equal(result.created, true);
  assert.equal(result.companyId, '00000000-0000-4000-8000-000000000001');
  assert.ok(pool.statements.some(({ statement }) => statement.includes('INSERT INTO companies')));
  assert.ok(pool.statements.some(({ statement }) => statement.includes('INSERT INTO company_settings')));
  assert.ok(pool.statements.some(({ statement }) => statement === 'COMMIT'));
});

test('uses an existing operator company without inserting demo records', async () => {
  const pool = mockPool({ companySettings: [{ company_id: 'existing-company' }] });

  const result = await ensureOperatorCompany(pool);

  assert.deepEqual(result, { companyId: 'existing-company', created: false });
  assert.ok(!pool.statements.some(({ statement }) => statement.includes('INSERT INTO companies')));
  assert.ok(!pool.statements.some(({ statement }) => statement.includes('INSERT INTO company_settings')));
});

test('adds default settings to an existing company without replacing it', async () => {
  const pool = mockPool({
    companies: [{ id: 'existing-company', name: 'Operador', tax_id: '123', municipality: 'Cali' }]
  });

  const result = await ensureOperatorCompany(pool);

  assert.deepEqual(result, { companyId: 'existing-company', created: true });
  assert.ok(!pool.statements.some(({ statement }) => statement.includes('INSERT INTO companies')));
  assert.ok(pool.statements.some(({ statement }) => statement.includes('INSERT INTO company_settings')));
});

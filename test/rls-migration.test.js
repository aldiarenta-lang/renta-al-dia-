import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { applyMigrations } from '../src/db/migrations.js';

test('single-operator migration disables RLS and removes policies from application tables', async () => {
  const migration = await readFile(new URL('../db/migrations/006_single_operator_no_rls.sql', import.meta.url), 'utf8');

  assert.match(migration, /ALTER TABLE %I DISABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE %I NO FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /DROP POLICY %I ON %I/);
  for (const table of ['companies', 'company_settings', 'clients', 'sales', 'tax_obligations']) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
});

test('startup migration runner applies the single-operator RLS cleanup', async () => {
  const statements = [];
  const appliedMigrations = new Set();
  const client = {
    async query(statement) {
      statements.push(statement);
      if (statement.includes('INSERT INTO schema_migrations')) {
        const name = statement.match(/VALUES \('([^']+)'\)\s*ON CONFLICT/)?.[1];
        if (name) appliedMigrations.add(name);
      }
      return { rows: [], rowCount: 0 };
    },
    release() {}
  };
  const pool = {
    async query(statement, values) {
      if (statement.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations')) return { rows: [], rowCount: 0 };
      if (statement.startsWith('SELECT 1 FROM schema_migrations')) {
        return { rows: appliedMigrations.has(values[0]) ? [{}] : [], rowCount: Number(appliedMigrations.has(values[0])) };
      }
      return { rows: [], rowCount: 0 };
    },
    async connect() {
      return client;
    }
  };

  await applyMigrations(pool);

  assert.ok(statements.some((statement) => statement.includes('ALTER TABLE %I DISABLE ROW LEVEL SECURITY')));
  assert.ok(appliedMigrations.has('006_single_operator_no_rls'));
});

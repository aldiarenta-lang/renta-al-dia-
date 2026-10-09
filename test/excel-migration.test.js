import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  importExcelMappings,
  readExcelPreview,
  validateExcelMappings
} from '../src/services/excel-migration-service.js';

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const clients = workbook.addWorksheet('Clientes');
  clients.addRow(['client_nit', 'name', 'address', 'municipality', 'client_type']);
  clients.addRow(['TEST-001', 'Cliente de prueba', 'Calle 1', 'Bogotá', 'Persona natural']);
  clients.addRow(['TEST-001', 'Cliente de prueba', 'Calle 1', 'Bogotá', 'Persona natural']);
  clients.addRow(['TEST-002', '', 'Calle 2', 'Cali', 'Persona jurídica']);
  clients.addRow([null, null, null, null, null]);
  workbook.addWorksheet('Notas').addRow(['Hoja sin correspondencia']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('reads all worksheets, detects headers, and previews source rows', async () => {
  const preview = await readExcelPreview(await buildWorkbook());

  assert.equal(preview.sheets.length, 2);
  assert.equal(preview.sheets[0].name, 'Clientes');
  assert.equal(preview.sheets[0].headerRow, 1);
  assert.equal(preview.sheets[0].suggestedTarget, 'clients');
  assert.equal(preview.sheets[0].rowsRead, 3);
  assert.equal(preview.sheets[0].sample[0].values.client_nit, 'TEST-001');
  assert.equal(preview.sheets[1].suggestedTarget, '');
});

test('validates required fields and reports duplicates and malformed records', async () => {
  const preview = await readExcelPreview(await buildWorkbook());
  const validation = validateExcelMappings(preview.token, [{
    sheetName: 'Clientes',
    target: 'clients',
    fields: {
      client_nit: 'client_nit',
      name: 'name',
      address: 'address',
      municipality: 'municipality',
      client_type: 'client_type'
    }
  }, { sheetName: 'Notas', target: 'skip', fields: {} }]);

  assert.deepEqual(validation.totals, { rowsRead: 3, valid: 1, omitted: 2, duplicates: 1, errors: 1 });
  assert.equal(validation.summaries[0].errors.length, 1);
  assert.match(validation.summaries[0].errors[0], /name/);
  assert.equal(validation.summaries[1].omitted, 0);
});

test('rejects mappings that reference columns not present in the workbook', async () => {
  const preview = await readExcelPreview(await buildWorkbook());

  assert.throws(() => validateExcelMappings(preview.token, [{
    sheetName: 'Clientes',
    target: 'clients',
    fields: {
      client_nit: 'client_nit',
      name: 'name',
      address: 'address',
      municipality: 'municipality',
      client_type: 'client_type',
      unknown_column: 'unknown_column'
    }
  }]), /no pertenece/);
});

test('requires every application table to be mapped before replacing existing data', async () => {
  const preview = await readExcelPreview(await buildWorkbook());
  const mappings = [{
    sheetName: 'Clientes',
    target: 'clients',
    fields: {
      client_nit: 'client_nit',
      name: 'name',
      address: 'address',
      municipality: 'municipality',
      client_type: 'client_type'
    }
  }, { sheetName: 'Notas', target: 'skip', fields: {} }];

  assert.throws(
    () => validateExcelMappings(preview.token, mappings, true),
    /Para reemplazar los datos debes asignar también/
  );
});

test('rolls back the entire import after a critical database failure', async () => {
  const preview = await readExcelPreview(await buildWorkbook());
  const mappings = [{
    sheetName: 'Clientes',
    target: 'clients',
    fields: {
      client_nit: 'client_nit',
      name: 'name',
      address: 'address',
      municipality: 'municipality',
      client_type: 'client_type'
    }
  }];
  const statements = [];
  const client = {
    async query(statement) {
      statements.push(statement);
      if (statement.startsWith('SELECT 1 FROM clients')) return { rowCount: 0, rows: [] };
      if (statement.startsWith('INSERT INTO clients')) throw Object.assign(new Error('critical test error'), { code: 'XX000' });
      return { rowCount: 0, rows: [] };
    },
    release() {
      statements.push('RELEASE CLIENT');
    }
  };
  const pool = { async connect() { return client; } };

  await assert.rejects(importExcelMappings(pool, preview.token, mappings), /critical test error/);
  assert.ok(statements.includes('BEGIN'));
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(statements.includes('RELEASE CLIENT'));
  assert.ok(!statements.includes('COMMIT'));
});

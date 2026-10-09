import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { seedDatabase } from './db/seed-db.js';
import { applyMigrations, applyTenantViews, prepareSchema } from './db/migrations.js';

if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
  throw new Error('Configura DATABASE_URL o las variables PG* antes de inicializar PostgreSQL.');
}

const pool = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});

try {
  await prepareSchema(pool);
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Esquema de Renta al Día creado o actualizado en PostgreSQL.');
  const seeded = await seedDatabase(pool);
  console.log(seeded
    ? 'Datos ficticios de demostración cargados en PostgreSQL.'
    : 'Los datos de demostración ya estaban cargados; no se agregaron duplicados.');
  await applyMigrations(pool);
  await applyTenantViews(pool);
  console.log('Esquema PostgreSQL inicializado para operación local.');
} catch (error) {
  console.error('No se pudo inicializar el esquema de PostgreSQL:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

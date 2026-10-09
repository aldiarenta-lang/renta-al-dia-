import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from './db/pool.js';
import { app } from './app.js';
import { seedDatabase } from './db/seed-db.js';
import { applyMigrations, applyTenantViews, prepareSchema } from './db/migrations.js';
import { bootstrapSuperAdmin } from './services/auth-service.js';

const port = process.env.NODE_ENV === 'production' ? Number(process.env.PORT || 3000) : 3000;

async function start() {
  if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
    throw new Error('Configura DATABASE_URL o las variables PG* para conectar con PostgreSQL.');
  }
  await prepareSchema(pool);
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  const seeded = await seedDatabase(pool);
  console.log(seeded
    ? 'Datos ficticios de demostración cargados en PostgreSQL.'
    : 'Los datos de demostración ya estaban cargados; no se agregaron duplicados.');
  await applyMigrations(pool);
  await applyTenantViews(pool);
  const superAdminCreated = await bootstrapSuperAdmin(pool);
  if (superAdminCreated) console.log('Super Administrador inicial creado desde las variables de entorno.');
  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn('SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD no están configurados; no se aprovisionó ningún acceso inicial.');
  }
  await pool.query('SELECT 1');
  app.listen(port, () => console.log(`Renta al Día disponible en http://localhost:${port}`));
}

start().catch(async (error) => {
  console.error('No se pudo iniciar Renta al Día. Verifica la conexión y el esquema de PostgreSQL:', error);
  await pool.end();
  process.exitCode = 1;
});

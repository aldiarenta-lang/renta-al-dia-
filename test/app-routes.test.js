import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { app } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('sirve la aplicación en las rutas públicas, módulos y portales internos', async () => {
  const routes = [
    '/', '/login', '/registro', '/recuperar', '/restablecer',
    '/dashboard', '/admin', '/contador', '/asesor', '/cliente', '/auxiliar',
    '/ventas', '/estado-resultados', '/flujo-caja', '/punto-equilibrio'
  ];

  for (const route of routes) {
    const response = await fetch(new URL(route, baseUrl));
    assert.equal(response.status, 200, `${route} debe servir la aplicación`);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.match(await response.text(), /Renta al Día/);
  }
});

test('mantiene /api separado de las rutas web y protegido por autenticación', async () => {
  const response = await fetch(new URL('/api/ruta-inexistente', baseUrl));

  assert.equal(response.status, 401);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(typeof (await response.json()).error, 'string');
});

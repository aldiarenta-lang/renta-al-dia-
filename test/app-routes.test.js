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

test('sirve el Dashboard en la ruta raíz y conserva las rutas de módulos', async () => {
  const routes = [
    '/', '/dashboard',
    '/ventas', '/estado-resultados', '/flujo-caja', '/punto-equilibrio'
  ];

  for (const route of routes) {
    const response = await fetch(new URL(route, baseUrl));
    assert.equal(response.status, 200, `${route} debe servir la aplicación`);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.match(html, /Renta al Día/);
    assert.match(html, /id="operator-app"/);
    assert.doesNotMatch(html, /landing-page|landing-shell|Ingresar al sistema/);
  }
});

test('la raíz y la ruta anterior del Dashboard cargan el mismo punto de entrada', async () => {
  const [rootResponse, dashboardResponse, scriptResponse] = await Promise.all([
    fetch(new URL('/', baseUrl)),
    fetch(new URL('/dashboard', baseUrl)),
    fetch(new URL('/app.js', baseUrl))
  ]);
  const rootHtml = await rootResponse.text();
  const dashboardHtml = await dashboardResponse.text();
  const script = await scriptResponse.text();

  assert.equal(rootResponse.status, 200);
  assert.equal(dashboardResponse.status, 200);
  assert.equal(rootHtml, dashboardHtml);
  assert.match(script, /dashboard:\s*'\/'/);
  assert.match(script, /pathModules\.set\('\/dashboard',\s*'dashboard'\)/);
});

test('la proyección financiera conserva seis meses reales y cubre hasta el Año 4', async () => {
  const [rootResponse, scriptResponse] = await Promise.all([
    fetch(new URL('/', baseUrl)),
    fetch(new URL('/app.js', baseUrl))
  ]);
  const rootHtml = await rootResponse.text();
  const script = await scriptResponse.text();

  assert.equal(rootResponse.status, 200);
  assert.match(script, /Proyección Financiera/);
  assert.match(script, /Julio del Año 1 a diciembre del Año 4/);
  assert.match(script, /42 meses de proyección desde julio/);
  assert.match(script, /chart-label|chart-value/);
  assert.match(rootHtml, /id="operator-app"/);
});

test('la API no requiere sesión y reporta cuando falta configurar el contexto del operador', async () => {
  const response = await fetch(new URL('/api/unknown', baseUrl));

  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await response.json(), { error: 'La empresa operadora aún no está configurada.' });
});

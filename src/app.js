import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/api.js';
import { errorHandler } from './middlewares/error-handler.js';
import { pool } from './db/pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use('/assets', express.static(path.join(here, '../public/assets')));
app.use(express.static(path.join(here, '../public')));
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const companyId = pool.getOperatorCompanyId();
  if (!companyId) return res.status(503).json({ error: 'La empresa operadora aún no está configurada.' });
  req.operator = { companyId };
  return next();
});
app.use('/api', apiRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'La ruta de API solicitada no existe.' }));
app.get('*', (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(here, '../public/index.html'));
});
app.use(errorHandler);

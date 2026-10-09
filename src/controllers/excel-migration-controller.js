import { pool } from '../db/pool.js';
import {
  importExcelMappings,
  readExcelPreview,
  validateExcelMappings
} from '../services/excel-migration-service.js';

export async function previewExcel(req, res) {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Envía el contenido binario de un archivo .xlsx o .xlsm.' });
    }
    return res.json(await readExcelPreview(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo leer la vista previa del Excel:', error);
    return res.status(400).json({ error: 'No se pudo leer el libro Excel.' });
  }
}

export async function validateExcel(req, res) {
  try {
    return res.json(validateExcelMappings(
      req.params.token,
      req.body?.mappings,
      req.body?.replaceExisting === true
    ));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('No se pudo validar el mapeo del Excel:', error);
    return res.status(500).json({ error: 'No se pudo validar el mapeo del libro.' });
  }
}

export async function importExcel(req, res) {
  try {
    return res.json(await importExcelMappings(
      pool,
      req.params.token,
      req.body?.mappings,
      req.body?.replaceExisting === true,
      req.operator.companyId
    ));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('La migración Excel se revirtió por un error crítico:', error);
    return res.status(500).json({ error: 'La importación se revirtió completamente por un error crítico de PostgreSQL.' });
  }
}

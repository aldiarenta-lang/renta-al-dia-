import express, { Router } from 'express';
import { resourceDefinitions } from '../config/resources.js';
import { createResourceController } from '../controllers/resource-controller.js';
import { getHealth } from '../controllers/health-controller.js';
import { getSettings, updateSettings } from '../controllers/settings-controller.js';
import { getReport } from '../controllers/reports-controller.js';
import { importExcel, previewExcel, validateExcel } from '../controllers/excel-migration-controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/reports/:name', getReport);
router.post(
  '/migration/excel/preview',
  express.raw({
    type: (req) => {
      const mediaType = (req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
      return mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mediaType === 'application/vnd.ms-excel.sheet.macroenabled.12';
    },
    limit: '15mb'
  }),
  previewExcel
);
router.post('/migration/excel/:token/validate', validateExcel);
router.post('/migration/excel/:token/import', importExcel);

for (const [resource, definition] of Object.entries(resourceDefinitions)) {
  const controller = createResourceController(definition);
  router.get(`/${resource}`, controller.list);
  router.post(`/${resource}`, controller.create);
  router.put(`/${resource}/:id`, controller.update);
  router.delete(`/${resource}/:id`, controller.remove);
}

export default router;

import express, { Router } from 'express';
import { resourceDefinitions } from '../config/resources.js';
import { createResourceController } from '../controllers/resource-controller.js';
import { getHealth } from '../controllers/health-controller.js';
import { getSettings, updateSettings } from '../controllers/settings-controller.js';
import { getReport } from '../controllers/reports-controller.js';
import { importExcel, previewExcel, validateExcel } from '../controllers/excel-migration-controller.js';
import authRouter from './auth.js';
import { requireAuth } from '../controllers/auth-controller.js';
import { authorize } from '../middlewares/authorization.js';
import {
  createCompany,
  createCompanyUser,
  listCompanies,
  listPlans,
  listUsers,
  savePlan,
  setCompanyLicense,
  updateCompany,
  updateCompanyUser
} from '../controllers/administration-controller.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRouter);
router.use(requireAuth);
router.get('/settings', authorize('settings:read'), getSettings);
router.put('/settings', authorize('settings:manage'), updateSettings);
router.get('/reports/:name', (req, res, next) => {
  const permission = req.params.name === 'taxes'
    ? 'tax-records:read'
    : ['results', 'cashflow', 'forecast'].includes(req.params.name)
      ? 'financial-reports:read'
      : 'reports:read';
  return authorize(permission)(req, res, next);
}, getReport);
router.get('/companies', authorize('companies:read'), listCompanies);
router.post('/companies', authorize('companies:manage'), createCompany);
router.put('/companies/:id', authorize('companies:manage'), updateCompany);
router.get('/plans', authorize('licenses:manage'), listPlans);
router.post('/plans', authorize('licenses:manage'), savePlan);
router.post('/companies/:id/licenses', authorize('licenses:manage'), setCompanyLicense);
router.get('/users', authorize('users:read'), listUsers);
router.post('/users', authorize('users:manage'), createCompanyUser);
router.put('/users/:id', authorize('users:manage'), updateCompanyUser);
router.use('/migration/excel', authorize('excel:import'));
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
  const permissionResource = resource === 'catalog-options' ? 'catalogs' : resource;
  const readPermission = resource === 'catalog-options' ? 'catalogs:manage' : `${permissionResource}:read`;
  const writePermission = resource === 'catalog-options' ? 'catalogs:manage' : `${permissionResource}:write`;
  router.get(`/${resource}`, authorize(readPermission), controller.list);
  router.post(`/${resource}`, authorize(writePermission), controller.create);
  router.put(`/${resource}/:id`, authorize(writePermission), controller.update);
  const deletePermission = resource === 'catalog-options' ? 'catalogs:manage' : `${permissionResource}:delete`;
  router.delete(`/${resource}/:id`, authorize(deletePermission), controller.remove);
}

export default router;

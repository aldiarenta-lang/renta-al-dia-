import ExcelJS from 'exceljs';
import { createHash, randomUUID } from 'node:crypto';
import { resourceDefinitions, settingsFields } from '../config/resources.js';
import { validateFields } from '../middlewares/validation.js';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ROWS_PER_SHEET = 20000;
const MAX_WORKBOOK_ROWS = 100000;
const PREVIEW_TTL_MS = 20 * 60 * 1000;
const MAX_PREVIEWS = 5;
const previews = new Map();

const targets = {
  clients: { label: 'Clientes', table: 'clients', fields: resourceDefinitions.clients.fields },
  'service-prices': { label: 'Servicios', table: 'service_prices', fields: resourceDefinitions['service-prices'].fields },
  settings: { label: 'Configuración', table: 'company_settings', fields: settingsFields },
  'direct-costs': { label: 'Costos', table: 'service_costs', fields: resourceDefinitions['direct-costs'].fields },
  expenses: { label: 'Gastos', table: 'expenses', fields: resourceDefinitions.expenses.fields },
  payroll: { label: 'Nómina', table: 'payroll', fields: resourceDefinitions.payroll.fields },
  'investments-financing': { label: 'Inversiones', table: 'investments_financing', fields: resourceDefinitions['investments-financing'].fields },
  'budget-control': { label: 'Presupuesto', table: 'budget_control', fields: resourceDefinitions['budget-control'].fields },
  'tax-records': { label: 'Impuestos', table: 'tax_obligations', fields: resourceDefinitions['tax-records'].fields },
  'catalog-options': { label: 'Catálogos', table: 'catalog_options', fields: resourceDefinitions['catalog-options'].fields },
  sales: { label: 'Ventas', table: 'sales', fields: resourceDefinitions.sales.fields }
};

const requiredReplacementTargets = Object.keys(targets);
const parameterFieldLabels = new Map([
  ['nombre de la empresa', 'company_name'],
  ['nit', 'tax_id'],
  ['actividad principal / ciiu', 'activity'],
  ['municipio principal', 'municipality'],
  ['año presupuestado', 'fiscal_year'],
  ['moneda', 'currency'],
  ['escenario', 'scenario'],
  ['crecimiento mensual ventas', 'monthly_sales_growth'],
  ['incremento anual de precios', 'annual_price_increase'],
  ['incremento anual de costos', 'annual_direct_cost_growth'],
  ['incremento anual de gastos', 'annual_expense_growth'],
  ['días promedio de cartera', 'average_receivable_days'],
  ['días promedio proveedores', 'average_payable_days'],
  ['días de inventario', 'inventory_days'],
  ['saldo inicial caja y bancos', 'opening_cash'],
  ['tasa interés créditos anual', 'annual_credit_interest_rate'],
  ['tasa efectiva de impuesto renta', 'income_tax_rate'],
  ['iva general de referencia', 'vat_rate'],
  ['tarifa arl riesgo i', 'default_arl_rate'],
  ['salud trabajador', 'employee_health_rate'],
  ['pensión trabajador', 'employee_pension_rate'],
  ['salud empleador', 'employer_health_rate'],
  ['pensión empleador', 'employer_pension_rate'],
  ['caja compensación', 'family_compensation_rate'],
  ['sena', 'sena_rate'],
  ['icbf', 'icbf_rate'],
  ['provisión cesantías', 'severance_provision_rate'],
  ['provisión intereses cesantías', 'severance_interest_rate'],
  ['provisión prima', 'service_bonus_rate'],
  ['provisión vacaciones', 'vacation_provision_rate'],
  ['meta margen neto', 'target_net_margin'],
  ['reserva mínima de caja', 'minimum_cash_reserve'],
  ['horas facturables mensuales por profesional', 'monthly_billable_hours_per_professional'],
  ['número de profesionales / asesores', 'professional_count']
].map(([label, field]) => [normalizeHeader(label), field]));

const rentaTableProfiles = {
  'Lista_Precios': {
    target: 'service-prices',
    headerRow: 3,
    fields: {
      service_code: 'Código servicio',
      service_name: 'Servicio tributario',
      billing_unit: 'Unidad de cobro',
      reference_low: 'Referencia baja',
      reference_high: 'Referencia alta',
      suggested_price: 'Precio sugerido Renta al Dia',
      price_type: 'Tipo de precio',
      notes: 'Observaciones'
    },
    defaults: { active: true },
    keyField: 'service_code'
  },
  'Control_Presupuestal': {
    target: 'budget-control',
    headerRow: 3,
    fields: {
      month: 'Mes',
      area: 'Área',
      account_concept: 'Cuenta / concepto',
      budget_amount: 'Presupuesto',
      actual_amount: 'Real ejecutado',
      budget_type: 'Tipo',
      responsible: 'Responsable',
      observation: 'Observación'
    },
    keyField: 'account_concept'
  },
  Ventas: {
    target: 'sales',
    headerRow: 3,
    fields: {
      sale_date: 'Fecha',
      client_nit: 'NIT cliente',
      service_code: 'Código servicio',
      quantity: 'Servicios presupuestados',
      unit_fee: 'Honorario unitario',
      discount_rate: 'Descuento %',
      refund_rate: 'Devoluciones %',
      cash_rate: 'Contado %',
      receivable_days: 'Días de cartera',
      status: 'Estado del servicio'
    },
    keyField: 'client_nit'
  },
  Costos_Servicios: {
    target: 'direct-costs',
    headerRow: 3,
    fields: {
      period: 'Mes',
      service_code: 'Código servicio',
      services_served: 'Servicios atendidos',
      materials_per_service: 'Materiales / insumos por servicio',
      external_fees_per_service: 'Honorarios externos por servicio',
      other_direct_per_service: 'Comisiones / otros directos por servicio',
      other_monthly_costs: 'Otros costos directos mensuales',
      notes: 'Observaciones'
    },
    keyField: 'service_code'
  },
  Gastos: {
    target: 'expenses',
    headerRow: 3,
    fields: {
      month: 'Mes',
      expense_code: 'Código gasto',
      concept: 'Concepto',
      category: 'Categoría',
      expense_type: 'Fijo/Variable',
      area: 'Área / centro costo',
      budget_amount: 'Valor presupuestado',
      annual_frequency: 'Frecuencia anual',
      expected_payment_date: 'Fecha estimada pago'
    },
    keyField: 'expense_code'
  },
  Nomina: {
    target: 'payroll',
    headerRow: 3,
    fields: {
      employee_name: 'Empleado',
      job_title: 'Cargo',
      area: 'Área',
      days_worked: 'Días',
      monthly_salary: 'Salario básico mensual',
      monthly_transport_allowance: 'Auxilio transporte mensual',
      arl_rate: 'ARL %'
    },
    keyField: 'employee_name'
  },
  Inversion_Financiacion: {
    target: 'investments-financing',
    headerRow: 3,
    fields: {
      transaction_date: 'Fecha',
      transaction_type: 'Tipo',
      concept: 'Concepto',
      counterparty: 'Proveedor / entidad',
      amount: 'Valor inversión / desembolso',
      useful_life_years: 'Vida útil años',
      residual_value: 'Valor residual',
      annual_interest_rate: 'Tasa interés anual',
      term_months: 'Plazo meses',
      monthly_payment: 'Cuota / pago mensual'
    },
    defaults: { residual_value: 0, annual_interest_rate: 0, monthly_payment: 0 },
    keyField: 'concept'
  },
  Impuestos: {
    target: 'tax-records',
    headerRow: 4,
    fields: {
      tax_name: 'Impuesto / concepto',
      taxable_base: 'Base estimada',
      rate: 'Tarifa',
      period: 'Periodo',
      responsible: 'Responsable / condición',
      due_date: 'Fecha estimada',
      paid_amount: 'Pagado',
      notes: 'Notas'
    },
    keyField: 'tax_name'
  },
  Clientes: {
    target: 'clients',
    headerRow: 3,
    fields: {
      client_nit: 'NIT',
      name: 'Nombre completo / Razón social',
      address: 'Dirección',
      municipality: 'Municipio',
      client_type: 'Tipo de cliente'
    },
    keyField: 'client_nit'
  }
};

const sourceWorkbookSheets = [
  'Parametros', ...Object.keys(rentaTableProfiles), 'Catalogos'
];

const sheetAliases = {
  clients: ['cliente', 'clientes'],
  'service-prices': ['servicio', 'servicios', 'lista de precios', 'listaprecios', 'precios'],
  settings: ['configuracion', 'parametros', 'empresa'],
  'direct-costs': ['costo', 'costos', 'costos de servicios', 'costos servicios'],
  expenses: ['gasto', 'gastos'],
  payroll: ['nomina', 'personal'],
  'investments-financing': ['inversion', 'inversiones', 'financiacion', 'financiamiento', 'inversion financiacion'],
  'budget-control': ['presupuesto', 'presupuestos', 'control presupuestal'],
  'tax-records': ['impuesto', 'impuestos', 'obligaciones tributarias'],
  'catalog-options': ['catalogo', 'catalogos'],
  sales: ['venta', 'ventas']
};

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeSourceLabel(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}

function fieldNames(target) {
  return Object.keys(target.fields).map(normalizeHeader);
}

function toCellValue(cell) {
  const value = cell.value;
  if (cell.type === ExcelJS.ValueType.Error) {
    return { error: `La celda ${cell.address} contiene un error de Excel.` };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (value.error) return { error: `La celda ${cell.address} contiene un error de Excel.` };
    if (value.formula || value.sharedFormula) {
      if (value.result === undefined || value.result === null) {
        return { error: `La fórmula de la celda ${cell.address} no tiene un resultado calculado en el archivo.` };
      }
      return value.result;
    }
    if (value.richText) return value.richText.map((part) => part.text).join('');
    if (value.text !== undefined && value.hyperlink) return value.text;
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function detectHeaderRow(worksheet) {
  const scanLimit = Math.min(worksheet.rowCount, 30);
  let best = { rowNumber: 1, score: -1 };
  for (let rowNumber = 1; rowNumber <= scanLimit; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = row.values.slice(1).filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
    if (!values.length) continue;
    const textCount = values.filter((value) => typeof value === 'string').length;
    const normalized = values.map(normalizeHeader);
    const matches = Object.values(targets).reduce((count, target) =>
      count + normalized.filter((value) => fieldNames(target).includes(value)).length, 0);
    const score = matches * 10 + textCount + (values.length * 0.1);
    if (score > best.score) best = { rowNumber, score };
  }
  return best.rowNumber;
}

function suggestTarget(sheetName) {
  const normalized = normalizeHeader(sheetName);
  return Object.entries(sheetAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeHeader(alias) === normalized)
  )?.[0] || '';
}

function extractSheet(worksheet) {
  const headerRow = detectHeaderRow(worksheet);
  const headerCells = worksheet.getRow(headerRow);
  const headers = [];
  const seen = new Set();
  const errors = [];
  headerCells.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = String(toCellValue(cell) ?? '').trim();
    if (!header) return;
    const normalized = normalizeHeader(header);
    if (seen.has(normalized)) errors.push(`La hoja "${worksheet.name}" repite el encabezado "${header}".`);
    seen.add(normalized);
    headers.push({ header, columnNumber });
  });

  const rows = [];
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = {};
    const rowErrors = [];
    let hasValue = false;
    for (const { header, columnNumber } of headers) {
      const result = toCellValue(row.getCell(columnNumber));
      if (result && typeof result === 'object' && result.error) {
        rowErrors.push(result.error);
        values[header] = null;
        hasValue = true;
        continue;
      }
      values[header] = result;
      if (result !== null && result !== undefined && String(result).trim() !== '') hasValue = true;
    }
    if (hasValue) rows.push({ rowNumber, values, errors: rowErrors });
  }

  return { name: worksheet.name, headerRow, headers: headers.map(({ header }) => header), rows, errors };
}

function cellValueAt(worksheet, rowNumber, columnNumber) {
  return toCellValue(worksheet.getRow(rowNumber).getCell(columnNumber));
}

function findSourceColumns(worksheet, headerRow, fields, errors) {
  const columns = new Map();
  worksheet.getRow(headerRow).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    columns.set(normalizeSourceLabel(cellValueAt(worksheet, headerRow, columnNumber)), columnNumber);
  });
  return Object.fromEntries(Object.entries(fields).map(([field, label]) => {
    const columnNumber = columns.get(normalizeSourceLabel(label));
    if (!columnNumber) errors.push(`La hoja "${worksheet.name}" no contiene la columna de origen "${label}".`);
    return [field, columnNumber];
  }));
}

function sourceRow(worksheet, rowNumber, columns, defaults = {}) {
  const values = { ...defaults };
  const errors = [];
  for (const [field, columnNumber] of Object.entries(columns)) {
    if (!columnNumber) continue;
    const cell = worksheet.getRow(rowNumber).getCell(columnNumber);
    const rawValue = cell.value;
    const hasUncalculatedFormula = rawValue && typeof rawValue === 'object' &&
      (rawValue.formula || rawValue.sharedFormula) && (rawValue.result === undefined || rawValue.result === null);
    if (hasUncalculatedFormula) {
      values[field] = undefined;
      continue;
    }
    const value = toCellValue(cell);
    if (value && typeof value === 'object' && value.error) {
      errors.push(value.error);
      values[field] = null;
    } else if ((value === null || value === undefined || value === '') && Object.hasOwn(defaults, field)) {
      values[field] = defaults[field];
    } else if (value !== undefined) {
      values[field] = value;
    }
  }
  return { rowNumber, values, errors };
}

function extractRentaParameters(worksheet) {
  const rows = [];
  const errors = [];
  const values = {};
  const found = new Set();
  for (let rowNumber = 5; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const label = cellValueAt(worksheet, rowNumber, 1);
    const field = parameterFieldLabels.get(normalizeHeader(label));
    if (!field) continue;
    if (found.has(field)) {
      errors.push(`La hoja "${worksheet.name}" repite el parámetro "${label}".`);
      continue;
    }
    found.add(field);
    const value = cellValueAt(worksheet, rowNumber, 2);
    if (value && typeof value === 'object' && value.error) {
      errors.push(value.error);
      continue;
    }
    values[field] = value;
  }
  for (const field of Object.keys(settingsFields)) {
    if (!found.has(field)) errors.push(`La hoja "${worksheet.name}" no contiene el parámetro requerido "${field}".`);
  }
  rows.push({ rowNumber: 5, values, errors: [] });
  return {
    name: worksheet.name,
    headerRow: 4,
    headers: Object.keys(settingsFields),
    rows,
    errors,
    suggestedTarget: 'settings'
  };
}

function extractRentaTaxRows(worksheet, profile) {
  const errors = [];
  const columns = findSourceColumns(worksheet, profile.headerRow, profile.fields, errors);
  const rows = [];
  for (let rowNumber = profile.headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = sourceRow(worksheet, rowNumber, columns);
    if (!row.values.tax_name) continue;
    const sourceName = String(row.values.tax_name).trim();
    const normalizedName = normalizeHeader(sourceName);
    row.values.tax_name = normalizedName.startsWith('ivasobreservicios')
      ? 'IVA sobre servicios'
      : normalizedName.startsWith('retencionenlafuente')
        ? 'Retención en la fuente'
        : normalizedName.startsWith('impuestoderenta')
          ? 'Impuesto de renta'
          : normalizedName.startsWith('icarionegro')
            ? 'ICA'
            : normalizedName.startsWith('gmf')
              ? 'Otro'
              : sourceName;
    if (row.values.notes) row.values.notes = `${sourceName}. ${row.values.notes}`;
    if (row.values.taxable_base === null || row.values.taxable_base === undefined || row.values.taxable_base === '') {
      const taxAmount = cellValueAt(worksheet, rowNumber, columns.taxable_base + 2);
      const rate = row.values.rate;
      if (typeof taxAmount === 'number' && typeof rate === 'number' && rate > 0) {
        row.values.taxable_base = taxAmount / rate;
      } else if (rate === 0 && (taxAmount === null || taxAmount === undefined || taxAmount === '')) {
        row.values.taxable_base = 0;
      }
    }
    rows.push(row);
  }
  return { rows, errors };
}

function applyRentaFormulaFallbacks(sheets, worksheets) {
  const sourceWorksheets = new Map(worksheets.map((worksheet) => [worksheet.name, worksheet]));
  const priceWorksheet = sourceWorksheets.get('Lista_Precios');
  const prices = new Map();
  for (let rowNumber = 4; rowNumber <= priceWorksheet.rowCount; rowNumber += 1) {
    const code = cellValueAt(priceWorksheet, rowNumber, 1);
    const price = cellValueAt(priceWorksheet, rowNumber, 6);
    if (code && price !== undefined && price !== null && price !== '') prices.set(String(code), price);
  }

  const parameterWorksheet = sourceWorksheets.get('Parametros');
  const averageReceivableDays = (() => {
    for (let rowNumber = 5; rowNumber <= parameterWorksheet.rowCount; rowNumber += 1) {
      if (normalizeHeader(cellValueAt(parameterWorksheet, rowNumber, 1)) === normalizeHeader('Días promedio de cartera')) {
        return cellValueAt(parameterWorksheet, rowNumber, 2);
      }
    }
    return undefined;
  })();

  const salesSheet = sheets.find((sheet) => sheet.name === 'Ventas');
  const quantitiesByService = new Map();
  for (const row of salesSheet.rows) {
    if (row.values.unit_fee === undefined) {
      const sourcePrice = prices.get(String(row.values.service_code));
      if (sourcePrice !== undefined) row.values.unit_fee = sourcePrice;
    }
    if (row.values.receivable_days === undefined && typeof row.values.cash_rate === 'number') {
      row.values.receivable_days = row.values.cash_rate >= 1 ? 0 : averageReceivableDays;
    }
    const code = row.values.service_code;
    const quantity = row.values.quantity;
    if (code && typeof quantity === 'number') {
      quantitiesByService.set(code, (quantitiesByService.get(code) || 0) + quantity);
    }
  }

  const costsSheet = sheets.find((sheet) => sheet.name === 'Costos_Servicios');
  for (const row of costsSheet.rows) {
    if (row.values.services_served === undefined) {
      row.values.services_served = quantitiesByService.get(row.values.service_code) || 0;
    }
  }

  const investmentsSheet = sheets.find((sheet) => sheet.name === 'Inversion_Financiacion');
  for (const row of investmentsSheet.rows) {
    if (row.values.useful_life_years === 0) row.values.useful_life_years = null;
    if (row.values.term_months === 0) row.values.term_months = null;
  }

  const clientsSheet = sheets.find((sheet) => sheet.name === 'Clientes');
  for (const row of clientsSheet.rows) {
    const clientType = normalizeHeader(row.values.client_type);
    if (clientType.startsWith('personanatural')) row.values.client_type = 'Persona natural';
    else if (clientType.includes('juridica') || clientType.includes('empresa')) row.values.client_type = 'Persona jurídica';
  }
}

function extractRentaCatalogs(worksheet) {
  const headers = [];
  worksheet.getRow(3).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    headers.push({ label: String(cellValueAt(worksheet, 3, columnNumber)).trim(), columnNumber });
  });
  const rows = [];
  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    for (const { label, columnNumber } of headers) {
      const value = cellValueAt(worksheet, rowNumber, columnNumber);
      if (value === null || value === undefined || String(value).trim() === '') continue;
      rows.push({
        rowNumber,
        values: { category: label, label: String(value).trim(), active: true },
        errors: []
      });
    }
  }
  return {
    name: worksheet.name,
    headerRow: 3,
    headers: ['category', 'label', 'active'],
    rows,
    errors: [],
    suggestedTarget: 'catalog-options'
  };
}

function extractRentaTable(worksheet, profile) {
  const errors = [];
  const columns = findSourceColumns(worksheet, profile.headerRow, profile.fields, errors);
  const rows = [];
  for (let rowNumber = profile.headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = sourceRow(worksheet, rowNumber, columns, profile.defaults);
    if (!row.values[profile.keyField]) continue;
    if (profile.target === 'service-prices' && !/^SRV-\d+$/i.test(String(row.values[profile.keyField]))) continue;
    rows.push(row);
  }
  if (profile.target === 'tax-records') {
    const taxRows = extractRentaTaxRows(worksheet, profile);
    return {
      name: worksheet.name,
      headerRow: profile.headerRow,
      headers: [...new Set(rows.flatMap((row) => Object.keys(row.values)))],
      rows: taxRows.rows,
      errors: [...errors, ...taxRows.errors],
      suggestedTarget: profile.target
    };
  }
  return {
    name: worksheet.name,
    headerRow: profile.headerRow,
    headers: [...new Set(rows.flatMap((row) => Object.keys(row.values)))],
    rows,
    errors,
    suggestedTarget: profile.target
  };
}

function extractRentaWorkbook(worksheets) {
  const byName = new Map(worksheets.map((worksheet) => [worksheet.name, worksheet]));
  if (!sourceWorkbookSheets.every((name) => byName.has(name))) return null;
  const normalized = new Map();
  for (const worksheet of worksheets) {
    if (worksheet.name === 'Parametros') normalized.set(worksheet.name, extractRentaParameters(worksheet));
    else if (worksheet.name === 'Catalogos') normalized.set(worksheet.name, extractRentaCatalogs(worksheet));
    else if (rentaTableProfiles[worksheet.name]) {
      normalized.set(worksheet.name, extractRentaTable(worksheet, rentaTableProfiles[worksheet.name]));
    } else {
      normalized.set(worksheet.name, extractSheet(worksheet));
    }
  }
  applyRentaFormulaFallbacks([...normalized.values()], worksheets);
  return worksheets.map((worksheet) => normalized.get(worksheet.name));
}

function cleanExpiredPreviews() {
  const now = Date.now();
  for (const [token, preview] of previews) {
    if (preview.expiresAt <= now) previews.delete(token);
  }
  while (previews.size >= MAX_PREVIEWS) previews.delete(previews.keys().next().value);
}

export async function readExcelPreview(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw Object.assign(new Error('Selecciona un archivo Excel válido.'), { status: 400 });
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw Object.assign(new Error('El archivo supera el límite de 15 MB.'), { status: 413 });
  }

  let workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer, { ignoreNodes: ['extLst', 'picture', 'drawing', 'legacyDrawing'] });
  } catch {
    throw Object.assign(new Error('No se pudo leer el archivo. Verifica que sea un libro .xlsx válido y no esté protegido.'), { status: 400 });
  }
  if (!workbook.worksheets.length) {
    throw Object.assign(new Error('El libro no contiene hojas para importar.'), { status: 400 });
  }

  let totalRows = 0;
  const extractedRentaSheets = extractRentaWorkbook(workbook.worksheets);
  for (const worksheet of workbook.worksheets) {
    if (worksheet.rowCount > MAX_ROWS_PER_SHEET) {
      throw Object.assign(new Error(`La hoja "${worksheet.name}" supera el límite de ${MAX_ROWS_PER_SHEET} filas.`), { status: 413 });
    }
    totalRows += worksheet.rowCount;
    if (totalRows > MAX_WORKBOOK_ROWS) {
      throw Object.assign(new Error(`El libro supera el límite de ${MAX_WORKBOOK_ROWS} filas.`), { status: 413 });
    }
  }
  const sheets = extractedRentaSheets || workbook.worksheets.map(extractSheet);

  cleanExpiredPreviews();
  const token = randomUUID();
  previews.set(token, { sheets, expiresAt: Date.now() + PREVIEW_TTL_MS });
  return {
    token,
    sourceProfile: extractedRentaSheets ? 'renta-al-dia' : null,
    targets: Object.entries(targets).map(([id, target]) => ({
      id,
      label: target.label,
      fields: Object.entries(target.fields).map(([key, rule]) => ({
        key,
        type: rule.type,
        required: rule.required,
        nullable: rule.nullable === true
      }))
    })),
    sheets: sheets.map((sheet) => ({
      name: sheet.name,
      headerRow: sheet.headerRow,
      headers: sheet.headers,
      rowsRead: sheet.rows.length,
      suggestedTarget: suggestTarget(sheet.name),
      errors: sheet.errors,
      sample: sheet.rows.slice(0, 5).map((row) => ({ rowNumber: row.rowNumber, values: row.values }))
    }))
  };
}

function getPreview(token) {
  const preview = previews.get(token);
  if (!preview || preview.expiresAt <= Date.now()) {
    previews.delete(token);
    throw Object.assign(new Error('La vista previa venció. Vuelve a seleccionar el archivo Excel.'), { status: 410 });
  }
  return preview;
}

function normalizeValue(value, rule, rowNumber, field) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    if (rule.nullable) return null;
    if (!rule.required) return undefined;
    throw new Error(`Fila ${rowNumber}: falta el campo obligatorio "${field}".`);
  }
  if (rule.type === 'date') {
    if (typeof value === 'number') {
      const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
      value = date.toISOString().slice(0, 10);
    } else if (value instanceof Date) {
      value = value.toISOString().slice(0, 10);
    }
  }
  if (rule.type === 'text' && typeof value === 'number') value = String(value);
  if (rule.type === 'enum' && typeof value === 'string') {
    const normalized = normalizeHeader(value);
    value = rule.values.find((allowed) => normalizeHeader(allowed) === normalized) || value;
  }
  if (rule.type === 'boolean') {
    if (value === 1 || value === '1' || (typeof value === 'string' && ['si', 'true', 'verdadero'].includes(normalizeHeader(value)))) return true;
    if (value === 0 || value === '0' || (typeof value === 'string' && ['no', 'false', 'falso'].includes(normalizeHeader(value)))) return false;
  }
  if (rule.type === 'rate' && typeof value === 'number' && value > 1 && value <= 100) {
    throw new Error(`Fila ${rowNumber}: "${field}" debe expresarse como proporción entre 0 y 1, no como porcentaje entero.`);
  }
  return value;
}

function selectedSheets(preview, mappings, replaceExisting = false) {
  if (!Array.isArray(mappings) || !mappings.length) {
    throw Object.assign(new Error('Asigna al menos una hoja a una tabla antes de continuar.'), { status: 400 });
  }
  const seenSheets = new Set();
  const selected = mappings.map((mapping) => {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      throw Object.assign(new Error('Cada asignación debe incluir una hoja y una tabla válidas.'), { status: 400 });
    }
    const sheet = preview.sheets.find((candidate) => candidate.name === mapping.sheetName);
    if (!sheet) throw Object.assign(new Error(`La hoja "${mapping.sheetName}" no está en la vista previa.`), { status: 400 });
    if (seenSheets.has(sheet.name)) throw Object.assign(new Error(`La hoja "${sheet.name}" fue asignada más de una vez.`), { status: 400 });
    seenSheets.add(sheet.name);
    if (mapping.target === 'skip') return { sheet, targetId: 'skip', fields: {} };
    if (sheet.errors.length) {
      throw Object.assign(new Error(`Corrige los errores de lectura de la hoja "${sheet.name}" antes de importarla.`), { status: 400 });
    }
    const target = targets[mapping.target];
    if (!target) throw Object.assign(new Error(`La tabla "${mapping.target}" no está permitida.`), { status: 400 });
    if (!mapping.fields || typeof mapping.fields !== 'object' || Array.isArray(mapping.fields)) {
      throw Object.assign(new Error(`Define el mapeo de columnas para "${sheet.name}".`), { status: 400 });
    }
    const fields = {};
    const mappedHeaders = new Set();
    for (const [field, header] of Object.entries(mapping.fields)) {
      if (!Object.hasOwn(target.fields, field)) throw Object.assign(new Error(`El campo "${field}" no pertenece a la tabla "${target.label}".`), { status: 400 });
      if (!sheet.headers.includes(header)) throw Object.assign(new Error(`La columna "${header}" no existe en la hoja "${sheet.name}".`), { status: 400 });
      if (mappedHeaders.has(header)) {
        throw Object.assign(new Error(`La columna "${header}" no se puede asignar a más de un campo.`), { status: 400 });
      }
      mappedHeaders.add(header);
      fields[field] = header;
    }
    const missing = Object.entries(target.fields).find(([field, rule]) => rule.required && !Object.hasOwn(fields, field));
    if (missing) throw Object.assign(new Error(`En la hoja "${sheet.name}" falta asignar la columna obligatoria "${missing[0]}".`), { status: 400 });
    return { sheet, targetId: mapping.target, fields };
  });
  const settingsSheets = selected.filter((entry) => entry.targetId === 'settings');
  if (settingsSheets.some((entry) => entry.sheet.rows.length !== 1)) {
    throw Object.assign(new Error('La configuración de empresa requiere exactamente una fila de datos en su hoja.'), { status: 400 });
  }
  if (replaceExisting) {
    const assignedTargets = selected.filter((entry) => entry.targetId !== 'skip').map((entry) => entry.targetId);
    const duplicateTarget = assignedTargets.find((target, index) => assignedTargets.indexOf(target) !== index);
    if (duplicateTarget) {
      throw Object.assign(new Error(`La tabla "${targets[duplicateTarget].label}" debe asignarse a una sola hoja para reemplazar los datos.`), { status: 400 });
    }
    const assigned = new Set(assignedTargets);
    const missingTargets = requiredReplacementTargets.filter((target) => !assigned.has(target));
    if (missingTargets.length) {
      throw Object.assign(new Error(`Para reemplazar los datos debes asignar también: ${missingTargets.map((target) => targets[target].label).join(', ')}.`), { status: 400 });
    }
  }
  return selected;
}

function buildImportPlan(token, mappings, replaceExisting = false) {
  const preview = getPreview(token);
  const selected = selectedSheets(preview, mappings, replaceExisting);
  const summaries = [];
  const batches = [];
  for (const entry of selected) {
    if (entry.targetId === 'skip') {
      summaries.push({ sheet: entry.sheet.name, target: 'Omitir', rowsRead: entry.sheet.rows.length, valid: 0, omitted: entry.sheet.rows.length, duplicates: 0, errors: [], errorCount: 0 });
      continue;
    }
    const target = targets[entry.targetId];
    const errors = [];
    const seen = new Set();
    const validRows = [];
    let valid = 0;
    let duplicates = 0;
    for (const row of entry.sheet.rows) {
      try {
        if (row.errors.length) throw new Error(row.errors.join(' '));
        const values = {};
        for (const [field, header] of Object.entries(entry.fields)) {
          const value = normalizeValue(row.values[header], target.fields[field], row.rowNumber, field);
          if (value !== undefined) values[field] = value;
        }
        validateFields(values, target.fields);
        const signature = createHash('sha256').update(JSON.stringify(values, Object.keys(values).sort())).digest('hex');
        if (seen.has(signature)) {
          duplicates += 1;
          continue;
        }
        seen.add(signature);
        validRows.push({ rowNumber: row.rowNumber, values, signature });
        valid += 1;
      } catch (error) {
        errors.push(`Hoja "${entry.sheet.name}", fila ${row.rowNumber}: ${error.message}`);
      }
    }
    summaries.push({
      sheet: entry.sheet.name,
      target: target.label,
      rowsRead: entry.sheet.rows.length,
      valid,
      omitted: entry.sheet.rows.length - valid,
      duplicates,
      errors: errors.slice(0, 200),
      errorCount: errors.length
    });
    batches.push({ sheet: entry.sheet.name, targetId: entry.targetId, target, fields: entry.fields, validRows, rowsRead: entry.sheet.rows.length });
  }
  const summariesBySheet = new Map(summaries.map((summary) => [summary.sheet, summary]));
  for (const sheet of preview.sheets) {
    if (!summariesBySheet.has(sheet.name)) {
      summaries.push({
        sheet: sheet.name,
        target: 'No asignada',
        rowsRead: sheet.rows.length,
        valid: 0,
        omitted: sheet.rows.length,
        duplicates: 0,
        errors: [],
        errorCount: 0
      });
    }
  }
  return {
    summaries,
    totals: summaries.reduce((total, summary) => ({
      rowsRead: total.rowsRead + summary.rowsRead,
      valid: total.valid + summary.valid,
      omitted: total.omitted + summary.omitted,
      duplicates: total.duplicates + summary.duplicates,
      errors: total.errors + (summary.errorCount ?? summary.errors.length)
    }), { rowsRead: 0, valid: 0, omitted: 0, duplicates: 0, errors: 0 }),
    batches
  };
}

export function validateExcelMappings(token, mappings, replaceExisting = false) {
  const { batches: _batches, ...report } = buildImportPlan(token, mappings, replaceExisting);
  return report;
}

const importOrder = [
  'clients', 'service-prices', 'settings', 'direct-costs', 'expenses', 'payroll',
  'investments-financing', 'budget-control', 'tax-records', 'catalog-options', 'sales'
];

const rowConstraintErrors = new Set(['23503', '23505', '23514', '22P02', '22007', '22003', '22001']);

async function isDuplicate(client, target, values, companyId) {
  const fields = Object.keys(values);
  const where = ['company_id = $1', ...fields.map((field, index) => `${field} IS NOT DISTINCT FROM $${index + 2}`)].join(' AND ');
  const result = await client.query(
    `SELECT 1 FROM ${target.table} WHERE ${where} LIMIT 1`,
    [companyId, ...fields.map((field) => values[field])]
  );
  return result.rowCount > 0;
}

async function insertRecord(client, target, values, companyId) {
  if (target.table === 'company_settings') {
    const fields = Object.keys(values);
    const columns = ['company_id', 'id', ...fields];
    const placeholders = ['$1', 'true', ...fields.map((_, index) => `$${index + 2}`)];
    const updates = fields.map((field) => `${field} = EXCLUDED.${field}`).join(', ');
    await client.query(
      `INSERT INTO company_settings (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (company_id) DO UPDATE SET ${updates}, updated_at = now()`,
      [companyId, ...fields.map((field) => values[field])]
    );
    await client.query(
      'UPDATE companies SET name = $2, tax_id = $3, municipality = $4 WHERE id = $1',
      [companyId, values.company_name, values.tax_id, values.municipality]
    );
    return;
  }
  const fields = Object.keys(values);
  await client.query(
    `INSERT INTO ${target.table} (company_id, ${fields.join(', ')})
     VALUES ($${fields.length + 1}, ${fields.map((_, index) => `$${index + 1}`).join(', ')})`,
    [...fields.map((field) => values[field]), companyId]
  );
}

export async function importExcelMappings(pool, token, mappings, replaceExisting = false, companyId) {
  const plan = buildImportPlan(token, mappings, replaceExisting);
  if (replaceExisting && plan.totals.errors > 0) {
    throw Object.assign(new Error('No se reemplazaron los datos: corrige todos los errores del libro y vuelve a validarlo.'), { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await client.query('SET LOCAL ROLE rda_tenant_runtime');
    await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
    if (replaceExisting) {
      for (const table of [
        'sales', 'service_costs', 'expenses', 'payroll', 'investments_financing',
        'budget_control', 'tax_obligations', 'catalog_options', 'clients',
        'service_prices', 'company_settings'
      ]) {
        await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [companyId]);
      }
    }
    const importedBySheet = new Map();
    for (const batch of plan.batches.sort((left, right) =>
      importOrder.indexOf(left.targetId) - importOrder.indexOf(right.targetId))) {
      let imported = 0;
      for (const row of batch.validRows) {
        const isSettings = batch.target.table === 'company_settings';
        if (!isSettings && await isDuplicate(client, batch.target, row.values, companyId)) {
          batch.duplicateCount = (batch.duplicateCount || 0) + 1;
          continue;
        }
        await client.query('SAVEPOINT excel_import_row');
        try {
          await insertRecord(client, batch.target, row.values, companyId);
          await client.query('RELEASE SAVEPOINT excel_import_row');
          imported += 1;
        } catch (error) {
          if (replaceExisting || !rowConstraintErrors.has(error.code)) throw error;
          await client.query('ROLLBACK TO SAVEPOINT excel_import_row');
          await client.query('RELEASE SAVEPOINT excel_import_row');
          batch.errors = batch.errors || [];
          batch.errors.push(`Hoja "${batch.sheet}", fila ${row.rowNumber}: ${error.detail || error.message}`);
        }
      }
      importedBySheet.set(batch.sheet, imported);
    }
    await client.query('COMMIT');
    const summaries = plan.summaries.map((summary) => {
      const batch = plan.batches.find((entry) => entry.sheet === summary.sheet);
      const imported = importedBySheet.get(summary.sheet) || 0;
      const dbErrors = batch?.errors || [];
      return {
        ...summary,
        imported,
        duplicates: summary.duplicates + (batch?.duplicateCount || 0),
        omitted: summary.rowsRead - imported,
        errors: [...summary.errors, ...dbErrors].slice(0, 200),
        errorCount: (summary.errorCount ?? summary.errors.length) + dbErrors.length
      };
    });
    const totals = summaries.reduce((total, summary) => ({
      rowsRead: total.rowsRead + summary.rowsRead,
      imported: total.imported + summary.imported,
      omitted: total.omitted + summary.omitted,
      duplicates: total.duplicates + summary.duplicates,
      errors: total.errors + summary.errorCount
    }), { rowsRead: 0, imported: 0, omitted: 0, duplicates: 0, errors: 0 });
    previews.delete(token);
    return { summaries, totals, replacedExisting: replaceExisting };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

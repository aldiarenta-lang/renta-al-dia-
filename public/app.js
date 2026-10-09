const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const quantityFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  guide: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z"/><path d="M4 5.5v15M8 7h8m-8 4h7"/>',
  chart: '<path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/>',
  sliders: '<path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3"/><path d="M2 14h4m4-6h4m4 8h4"/>',
  tag: '<path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  budget: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M16 20V5m-9 4h5m-5 4h2"/><path d="M7 5V3h10v2"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
  cost: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.5-1.5-3-1.5-1.7 0-2.5.8-2.5 1.8 0 3 5.5 1.2 5.5 4 0 1-.9 2.2-3 2.2-1.4 0-2.5-.5-3.2-1.5M12 6v12"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18m-6 6h3"/><path d="M6 5V3h12v2"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9m-1-11a4 4 0 0 1 0 7.8"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2"/>',
  scale: '<path d="M12 3v18m-8-1h16M5 7h14"/><path d="m5 7-3 6h6Zm14 0-3 6h6Z"/>',
  coins: '<circle cx="8" cy="8" r="5"/><path d="M13 8h3.5a4.5 4.5 0 1 1 0 9H12m-2-9h.01M3 8h.01"/><path d="M8 3v10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-11 4h6m-6 4h6"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8v4H8Zm0 8h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  cash: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9h.01M17 15h.01"/>',
  tax: '<path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2Z"/><path d="M8 8h2m4 0h2M8 13h8m-8 4h5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3m-13 5h18m-11 0v2h4v-2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14m-7-7h14"/>',
  edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  trash: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>'
};

const modules = [
  { id: 'dashboard', title: 'Tablero', group: 'Principal', icon: 'dashboard', description: 'Indicadores financieros calculados exclusivamente a partir de los registros guardados en PostgreSQL.' },
  { id: 'inicio', title: 'Guía de uso', group: 'Principal', icon: 'guide', description: 'Accesos a las tareas principales del sistema.' },
  { id: 'summary', title: 'Resumen ejecutivo', group: 'Análisis', icon: 'chart', description: 'Lectura ejecutiva con cifras reales del ejercicio configurado.' },
  { id: 'parameters', title: 'Parámetros', group: 'Configuración', icon: 'sliders', description: 'Datos de la empresa, del ejercicio y supuestos editables para los cálculos financieros.' },
  { id: 'service-prices', title: 'Lista de precios', group: 'Operación', icon: 'tag', description: 'Administra servicios, rangos de referencia y precios de venta.' },
  { id: 'budget-control', title: 'Control presupuestal', group: 'Operación', icon: 'budget', description: 'Compara el presupuesto y el valor ejecutado, con variaciones calculadas automáticamente.' },
  { id: 'sales', title: 'Ventas', group: 'Operación', icon: 'receipt', description: 'Registra servicios vendidos. Ingresos netos, cobros y márgenes se calculan al guardar.' },
  { id: 'direct-costs', title: 'Costos de servicios', group: 'Operación', icon: 'cost', description: 'Registra costos unitarios y mensuales por servicio.' },
  { id: 'expenses', title: 'Gastos', group: 'Operación', icon: 'wallet', description: 'Administra gastos y su equivalente mensual según la frecuencia anual.' },
  { id: 'payroll', title: 'Nómina', group: 'Operación', icon: 'people', description: 'Calcula deducciones y costo patronal con las tasas configuradas por la empresa.' },
  { id: 'investments-financing', title: 'Inversiones y financiación', group: 'Operación', icon: 'building', description: 'Registra activos, financiación y aportes; la depreciación mensual se calcula automáticamente.' },
  { id: 'clients', title: 'Clientes', group: 'Operación', icon: 'people', description: 'Administra los clientes y sus datos de contacto. El NIT relaciona las ventas.' },
  { id: 'break-even', title: 'Punto de equilibrio', group: 'Análisis', icon: 'scale', description: 'Estima los servicios necesarios para cubrir los costos mensuales registrados.' },
  { id: 'cashflow', title: 'Flujo de caja', group: 'Análisis', icon: 'coins', description: 'Consulta cobros, salidas de caja y saldo mensual acumulado.' },
  { id: 'results', title: 'Estado de resultados', group: 'Análisis', icon: 'file', description: 'Consulta ingresos, costos, gastos, nómina y utilidad mensual.' },
  { id: 'taxes', title: 'Impuestos', group: 'Análisis', icon: 'calculator', description: 'Registra obligaciones, pagos y saldos, y consulta estimaciones tributarias calculadas con los datos guardados.' },
  { id: 'forecast', title: 'Proyección a 9 meses', group: 'Análisis', icon: 'chart', description: 'Proyecta nueve meses a partir de promedios observados y tasas de crecimiento editables.' },
  { id: 'catalog-options', title: 'Catálogos', group: 'Configuración', icon: 'list', description: 'Mantén listas de opciones propias para facilitar el registro de la operación.' },
  { id: 'import-excel', title: 'Importar Excel', group: 'Administración', icon: 'file', description: 'Revisa, valida y migra las hojas del libro original a PostgreSQL.' }
];

const modulePaths = {
  dashboard: '/',
  inicio: '/guia',
  summary: '/resumen',
  parameters: '/configuracion',
  'service-prices': '/servicios',
  'budget-control': '/presupuesto',
  sales: '/ventas',
  'direct-costs': '/costos',
  expenses: '/gastos',
  payroll: '/nomina',
  'investments-financing': '/inversiones',
  clients: '/clientes',
  'break-even': '/punto-equilibrio',
  cashflow: '/flujo-caja',
  results: '/estado-resultados',
  taxes: '/impuestos',
  forecast: '/proyeccion',
  'catalog-options': '/catalogos',
  'import-excel': '/importar-excel'
};
const pathModules = new Map(Object.entries(modulePaths).map(([module, route]) => [route, module]));
pathModules.set('/dashboard', 'dashboard');

const displayNames = {
  client_nit: 'NIT', name: 'Nombre / razón social', address: 'Dirección', municipality: 'Municipio', client_type: 'Tipo de cliente',
  service_code: 'Código', service_name: 'Servicio tributario', billing_unit: 'Unidad de cobro', reference_low: 'Referencia baja',
  reference_high: 'Referencia alta', suggested_price: 'Precio sugerido', price_type: 'Tipo de precio', notes: 'Observaciones', active: 'Activo',
  id: 'N.º', sale_date: 'Fecha', client_name: 'Cliente', quantity: 'Servicios', unit_fee: 'Honorario unitario',
  discount_rate: 'Descuento %', refund_rate: 'Devoluciones %', gross_fees: 'Honorarios brutos', discounts: 'Descuentos',
  refunds: 'Devoluciones', net_revenue: 'Ingresos netos', unit_direct_cost: 'Costo unitario', total_direct_cost: 'Costo directo total',
  contribution_margin: 'Margen de contribución', cash_rate: 'Contado %', cash_receipts: 'Cobro de contado',
  credit_receipts: 'Cobro a crédito', receivable_days: 'Días de cartera', status: 'Estado',
  period: 'Periodo', services_served: 'Servicios atendidos', materials_per_service: 'Materiales por servicio',
  external_fees_per_service: 'Honorarios externos por servicio', other_direct_per_service: 'Otros costos por servicio',
  other_monthly_costs: 'Otros costos mensuales', total_direct_cost: 'Costo directo total', budgeted_direct_cost: 'Costo presupuestado',
  month: 'Mes', expense_code: 'Código de gasto', concept: 'Concepto', category: 'Categoría', expense_type: 'Fijo / variable',
  area: 'Área', budget_amount: 'Valor presupuestado', annual_frequency: 'Frecuencia anual', monthly_equivalent: 'Equivalente mensual',
  expected_payment_date: 'Fecha estimada de pago', employee_name: 'Empleado', job_title: 'Cargo', days_worked: 'Días',
  monthly_salary: 'Salario mensual', monthly_transport_allowance: 'Auxilio mensual', arl_rate: 'ARL %',
  period_salary: 'Salario del periodo', period_transport: 'Auxilio del periodo', contribution_base: 'IBC',
  employee_health: 'Salud empleado', employee_pension: 'Pensión empleado', estimated_net: 'Neto estimado',
  employer_health: 'Salud empleador', employer_pension: 'Pensión empleador', employer_arl: 'ARL empleador',
  family_compensation: 'Caja de compensación', sena: 'SENA', icbf: 'ICBF', benefits_provision: 'Provisiones',
  total_employer_cost: 'Costo total empleador', transaction_date: 'Fecha', transaction_type: 'Tipo',
  counterparty: 'Proveedor / entidad', amount: 'Valor', useful_life_years: 'Vida útil (años)',
  residual_value: 'Valor residual', annual_interest_rate: 'Tasa de interés anual %', term_months: 'Plazo (meses)',
  monthly_payment: 'Pago mensual', monthly_depreciation: 'Depreciación mensual', account_concept: 'Cuenta / concepto',
  actual_amount: 'Valor ejecutado', variance_amount: 'Variación', variance_rate: 'Variación %', budget_type: 'Tipo',
  responsible: 'Responsable', observation: 'Observación', label: 'Opción', category_name: 'Categoría',
  tax_name: 'Impuesto', taxable_base: 'Base gravable', rate: 'Tarifa %', tax_amount: 'Impuesto calculado',
  due_date: 'Fecha límite', paid_amount: 'Valor pagado', balance: 'Saldo pendiente',
  company_name: 'Nombre de la empresa', tax_id: 'NIT de la empresa', activity: 'Actividad principal / CIIU',
  fiscal_year: 'Año fiscal', currency: 'Moneda', scenario: 'Escenario', opening_cash: 'Caja inicial',
  monthly_sales_growth: 'Crecimiento mensual de ventas %', annual_price_increase: 'Incremento anual de precios %',
  annual_direct_cost_growth: 'Crecimiento anual de costos directos %', annual_expense_growth: 'Crecimiento anual de gastos %',
  average_receivable_days: 'Días promedio de cartera', average_payable_days: 'Días promedio de proveedores',
  inventory_days: 'Días de inventario', annual_credit_interest_rate: 'Interés anual de créditos %',
  income_tax_rate: 'Tarifa de impuesto de renta %', vat_rate: 'Tarifa de IVA %',
  default_arl_rate: 'ARL riesgo I %',
  employee_health_rate: 'Salud del empleado %', employee_pension_rate: 'Pensión del empleado %',
  employer_health_rate: 'Salud del empleador %', employer_pension_rate: 'Pensión del empleador %',
  family_compensation_rate: 'Caja de compensación %', sena_rate: 'SENA %', icbf_rate: 'ICBF %',
  severance_provision_rate: 'Provisión de cesantías %', severance_interest_rate: 'Provisión de intereses a cesantías %',
  service_bonus_rate: 'Provisión de prima %', vacation_provision_rate: 'Provisión de vacaciones %',
  target_net_margin: 'Meta de margen neto %', minimum_cash_reserve: 'Reserva mínima de caja (COP)',
  monthly_billable_hours_per_professional: 'Horas facturables mensuales por profesional',
  professional_count: 'Número de profesionales', cost_per_hour: 'Costo hora profesional calculado'
};

const fieldSets = {
  clients: [
    { key: 'client_nit', label: 'NIT', type: 'text', required: true, max: 32 },
    { key: 'name', label: 'Nombre completo / razón social', type: 'text', required: true, max: 180 },
    { key: 'address', label: 'Dirección', type: 'text', required: true, max: 240 },
    { key: 'municipality', label: 'Municipio', type: 'text', required: true, max: 100 },
    { key: 'client_type', label: 'Tipo de cliente', type: 'select', required: true, options: ['Persona natural', 'Persona jurídica'] }
  ],
  'service-prices': [
    { key: 'service_code', label: 'Código del servicio', type: 'text', required: true, max: 32 },
    { key: 'service_name', label: 'Servicio tributario', type: 'text', required: true, max: 180 },
    { key: 'billing_unit', label: 'Unidad de cobro', type: 'text', required: true, max: 80 },
    { key: 'reference_low', label: 'Referencia baja (COP)', type: 'number', required: true, min: 0 },
    { key: 'reference_high', label: 'Referencia alta (COP)', type: 'number', required: true, min: 0 },
    { key: 'suggested_price', label: 'Precio sugerido (COP)', type: 'number', required: true, min: 0 },
    { key: 'price_type', label: 'Tipo de precio', type: 'text', required: true, max: 60 },
    { key: 'notes', label: 'Observaciones', type: 'textarea', required: false, max: 1000, full: true },
    { key: 'active', label: 'Servicio activo', type: 'checkbox', required: true }
  ],
  sales: [
    { key: 'sale_date', label: 'Fecha', type: 'date', required: true },
    { key: 'client_nit', label: 'Cliente (NIT)', type: 'relation', required: true, resource: 'clients', value: 'client_nit', title: 'name', subtitle: 'client_nit' },
    { key: 'service_code', label: 'Servicio', type: 'relation', required: true, resource: 'service-prices', value: 'service_code', title: 'service_name', subtitle: 'service_code' },
    { key: 'quantity', label: 'Servicios presupuestados', type: 'number', required: true, min: 0.01, step: 0.01 },
    { key: 'unit_fee', label: 'Honorario unitario (COP)', type: 'number', required: true, min: 0 },
    { key: 'discount_rate', label: 'Descuento (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.01 },
    { key: 'refund_rate', label: 'Devoluciones (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.01 },
    { key: 'cash_rate', label: 'Contado (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.01 },
    { key: 'receivable_days', label: 'Días de cartera', type: 'number', required: true, min: 0, max: 3650, step: 1 },
    { key: 'status', label: 'Estado del servicio', type: 'select', required: true, options: ['Presupuestado', 'En proceso', 'Completado', 'Cancelado'] }
  ],
  'direct-costs': [
    { key: 'period', label: 'Mes', type: 'select', required: true, options: [...MONTHS, 'Anual'] },
    { key: 'service_code', label: 'Servicio', type: 'relation', required: true, resource: 'service-prices', value: 'service_code', title: 'service_name', subtitle: 'service_code' },
    { key: 'services_served', label: 'Servicios atendidos', type: 'number', required: true, min: 0, step: 1 },
    { key: 'materials_per_service', label: 'Materiales / insumos por servicio (COP)', type: 'number', required: true, min: 0 },
    { key: 'external_fees_per_service', label: 'Honorarios externos por servicio (COP)', type: 'number', required: true, min: 0 },
    { key: 'other_direct_per_service', label: 'Comisiones / otros por servicio (COP)', type: 'number', required: true, min: 0 },
    { key: 'other_monthly_costs', label: 'Otros costos mensuales (COP)', type: 'number', required: true, min: 0 },
    { key: 'notes', label: 'Observaciones', type: 'textarea', required: false, max: 1000, full: true }
  ],
  expenses: [
    { key: 'month', label: 'Mes', type: 'select', required: true, options: MONTHS },
    { key: 'expense_code', label: 'Código de gasto', type: 'text', required: true, max: 40 },
    { key: 'concept', label: 'Concepto', type: 'text', required: true, max: 180 },
    { key: 'category', label: 'Categoría', type: 'text', required: true, max: 100 },
    { key: 'expense_type', label: 'Fijo / variable', type: 'select', required: true, options: ['Fijo', 'Variable'] },
    { key: 'area', label: 'Área / centro de costo', type: 'text', required: true, max: 100 },
    { key: 'budget_amount', label: 'Valor presupuestado (COP)', type: 'number', required: true, min: 0 },
    { key: 'annual_frequency', label: 'Frecuencia anual (veces)', type: 'number', required: false, nullable: true, min: 1, max: 12, step: 1, hint: 'Déjalo vacío si el valor ya es mensual.' },
    { key: 'expected_payment_date', label: 'Fecha estimada de pago', type: 'date', required: false, nullable: true }
  ],
  payroll: [
    { key: 'employee_name', label: 'Empleado', type: 'text', required: true, max: 180 },
    { key: 'job_title', label: 'Cargo', type: 'text', required: true, max: 120 },
    { key: 'area', label: 'Área', type: 'text', required: true, max: 100 },
    { key: 'days_worked', label: 'Días trabajados', type: 'number', required: true, min: 1, max: 30, step: 1 },
    { key: 'monthly_salary', label: 'Salario básico mensual (COP)', type: 'number', required: true, min: 0 },
    { key: 'monthly_transport_allowance', label: 'Auxilio de transporte mensual (COP)', type: 'number', required: true, min: 0 },
    { key: 'arl_rate', label: 'Tasa ARL (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.001 }
  ],
  'investments-financing': [
    { key: 'transaction_date', label: 'Fecha', type: 'date', required: true },
    { key: 'transaction_type', label: 'Tipo de inversión / financiación', type: 'select', required: true, options: ['Activo fijo', 'Activo intangible', 'Capital de trabajo', 'Financiación', 'Aporte socio'] },
    { key: 'concept', label: 'Concepto', type: 'text', required: true, max: 180 },
    { key: 'counterparty', label: 'Proveedor / entidad', type: 'text', required: false, max: 180 },
    { key: 'amount', label: 'Valor (COP)', type: 'number', required: true, min: 0 },
    { key: 'useful_life_years', label: 'Vida útil (años)', type: 'number', required: false, nullable: true, min: 0.01, step: 0.01 },
    { key: 'residual_value', label: 'Valor residual (COP)', type: 'number', required: true, min: 0 },
    { key: 'annual_interest_rate', label: 'Tasa de interés anual (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.01 },
    { key: 'term_months', label: 'Plazo (meses)', type: 'number', required: false, nullable: true, min: 1, max: 600, step: 1 },
    { key: 'monthly_payment', label: 'Cuota / pago mensual (COP)', type: 'number', required: true, min: 0 }
  ],
  'budget-control': [
    { key: 'month', label: 'Mes', type: 'select', required: true, options: MONTHS },
    { key: 'area', label: 'Área', type: 'text', required: true, max: 100 },
    { key: 'account_concept', label: 'Cuenta / concepto', type: 'text', required: true, max: 180 },
    { key: 'budget_amount', label: 'Presupuesto (COP)', type: 'number', required: true, min: 0 },
    { key: 'actual_amount', label: 'Real ejecutado (COP)', type: 'number', required: true, min: 0 },
    { key: 'budget_type', label: 'Tipo de gasto', type: 'select', required: true, options: ['Fijo', 'Variable'] },
    { key: 'responsible', label: 'Responsable', type: 'text', required: false, max: 120 },
    { key: 'observation', label: 'Observación', type: 'textarea', required: false, max: 1000, full: true }
  ],
  'tax-records': [
    { key: 'tax_name', label: 'Impuesto / concepto tributario', type: 'select', required: true, options: ['IVA sobre servicios', 'IVA descontable', 'Retención en la fuente', 'Autorretención', 'Impuesto de renta', 'ICA', 'Otro'] },
    { key: 'taxable_base', label: 'Base gravable (COP)', type: 'number', required: true, min: 0 },
    { key: 'rate', label: 'Tarifa (%)', type: 'number', required: true, min: 0, max: 100, percent: true, step: 0.001 },
    { key: 'period', label: 'Periodo (p. ej., 2025-01 o bimestre 1)', type: 'text', required: true, max: 80 },
    { key: 'responsible', label: 'Responsable', type: 'text', required: false, max: 180 },
    { key: 'due_date', label: 'Fecha límite de pago', type: 'date', required: false, nullable: true },
    { key: 'paid_amount', label: 'Valor pagado (COP)', type: 'number', required: true, min: 0 },
    { key: 'notes', label: 'Observaciones', type: 'textarea', required: false, max: 1000, full: true }
  ],
  'catalog-options': [
    { key: 'category', label: 'Categoría del catálogo', type: 'text', required: true, max: 100 },
    { key: 'label', label: 'Opción', type: 'text', required: true, max: 180 },
    { key: 'active', label: 'Opción activa', type: 'checkbox', required: true }
  ]
};

const tableColumns = {
  clients: ['client_nit', 'name', 'address', 'municipality', 'client_type'],
  'service-prices': ['service_code', 'service_name', 'billing_unit', 'reference_low', 'reference_high', 'suggested_price', 'price_type', 'active'],
  sales: ['sale_date', 'client_nit', 'client_name', 'service_name', 'quantity', 'unit_fee', 'net_revenue', 'total_direct_cost', 'contribution_margin', 'status'],
  'direct-costs': ['period', 'service_code', 'services_served', 'unit_direct_cost', 'total_direct_cost', 'other_monthly_costs', 'budgeted_direct_cost', 'notes'],
  expenses: ['month', 'expense_code', 'concept', 'category', 'expense_type', 'area', 'budget_amount', 'annual_frequency', 'monthly_equivalent', 'expected_payment_date'],
  payroll: ['employee_name', 'job_title', 'area', 'days_worked', 'period_salary', 'estimated_net', 'employer_health', 'employer_pension', 'employer_arl', 'benefits_provision', 'total_employer_cost'],
  'investments-financing': ['transaction_date', 'transaction_type', 'concept', 'counterparty', 'amount', 'useful_life_years', 'monthly_depreciation', 'annual_interest_rate', 'term_months', 'monthly_payment'],
  'budget-control': ['month', 'area', 'account_concept', 'budget_amount', 'actual_amount', 'variance_amount', 'variance_rate', 'budget_type', 'responsible'],
  'tax-records': ['tax_name', 'period', 'taxable_base', 'rate', 'tax_amount', 'due_date', 'paid_amount', 'balance', 'responsible'],
  'catalog-options': ['category', 'label', 'active']
};

const moneyFields = new Set([
  'reference_low', 'reference_high', 'suggested_price', 'unit_fee', 'gross_fees', 'discounts', 'refunds',
  'net_revenue', 'unit_direct_cost', 'total_direct_cost', 'contribution_margin', 'cash_receipts', 'credit_receipts',
  'materials_per_service', 'external_fees_per_service', 'other_direct_per_service', 'other_monthly_costs',
  'budgeted_direct_cost', 'budget_amount', 'monthly_equivalent', 'monthly_salary', 'monthly_transport_allowance',
  'period_salary', 'period_transport', 'contribution_base', 'employee_health', 'employee_pension', 'estimated_net',
  'employer_health', 'employer_pension', 'employer_arl', 'family_compensation', 'sena', 'icbf', 'benefits_provision',
  'total_employer_cost', 'amount', 'residual_value', 'monthly_payment', 'monthly_depreciation', 'actual_amount', 'variance_amount',
  'taxable_base', 'tax_amount', 'paid_amount', 'balance'
]);
const percentFields = new Set(['discount_rate', 'refund_rate', 'cash_rate', 'arl_rate', 'annual_interest_rate', 'variance_rate', 'rate']);
const dateFields = new Set(['sale_date', 'expected_payment_date', 'transaction_date', 'due_date']);

let currentModule = 'dashboard';
let currentResource = null;
let currentRows = [];
let settingsCache = null;
let modalContext = null;
let searchTimer = null;
let excelImportState = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function svg(name, className = '') {
  return `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.file}</svg>`;
}

async function api(path, options = {}) {
  let response;
  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    response = await fetch(`/api/${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error('No se pudo contactar con el servidor. Verifica que la aplicación esté iniciada.');
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.error || `La solicitud falló (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  setConnection(true, 'PostgreSQL conectado');
  return payload;
}

function titleFor(id) {
  return modules.find((module) => module.id === id)?.title || 'Tablero';
}

function pathForModule(id) {
  return modulePaths[id] || modulePaths.dashboard;
}

function renderNavigation() {
  const navigation = document.getElementById('main-navigation');
  const visibleModules = modules;
  const groups = [...new Set(visibleModules.map((module) => module.group))];
  navigation.innerHTML = groups.map((group) => {
    const links = visibleModules.filter((module) => module.group === group).map((module) =>
      `<a class="nav-link" href="${pathForModule(module.id)}" data-route="${escapeHtml(module.id)}">${svg(module.icon, 'nav-icon')}<span>${escapeHtml(module.title)}</span></a>`
    ).join('');
    return `<div class="nav-group-label">${escapeHtml(group)}</div><div class="nav-list">${links}</div>`;
  }).join('');
}

function setConnection(connected, message) {
  const dot = document.getElementById('connection-dot');
  dot.className = `connection-dot ${connected ? 'connected' : 'disconnected'}`;
  document.getElementById('connection-label').textContent = message;
}

function formatMoney(value) {
  return value === null || value === undefined || value === '' ? '—' : money.format(Number(value));
}

function formatNumber(value) {
  return value === null || value === undefined || value === '' ? '—' : quantityFormat.format(Number(value));
}

function formatPercent(value) {
  return value === null || value === undefined || value === '' ? '—' : `${quantityFormat.format(Number(value) * 100)}%`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-CO').format(date);
}

function formatCell(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (moneyFields.has(key)) return formatMoney(value);
  if (percentFields.has(key)) return formatPercent(value);
  if (dateFields.has(key)) return formatDate(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return escapeHtml(value);
}

function toast(message, error = false) {
  const region = document.getElementById('toast-region');
  const element = document.createElement('div');
  element.className = `toast${error ? ' error' : ''}`;
  element.textContent = message;
  region.append(element);
  window.setTimeout(() => element.remove(), 4800);
}

function pageHeading(module, action = '') {
  return `<div class="page-heading">
    <div><p class="eyebrow">${escapeHtml(module.group)}</p><h1>${escapeHtml(module.title)}</h1>
    <p class="page-description">${escapeHtml(module.description)}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ''}
  </div>`;
}

function configurationBanner(text = 'Configura primero los datos de la empresa y las tasas financieras para habilitar los informes.') {
  return `<div class="configuration-banner">${svg('alert')}<div><strong>Configuración pendiente</strong><p>${escapeHtml(text)} <a class="page-link" href="${pathForModule('parameters')}">Completar parámetros</a></p></div></div>`;
}

function setupBlock() {
  return `<div class="card"><div class="card-body"><div class="setup-steps">
    <div class="setup-step"><span class="step-number">1</span><div><strong>Registra tus servicios y precios</strong><p>Crea el catálogo de servicios para poder asociarlos a costos y ventas.</p></div></div>
    <div class="setup-step"><span class="step-number">2</span><div><strong>Configura empresa y tasas</strong><p>Los cálculos de nómina, impuestos y proyecciones utilizan las tasas que ingreses.</p></div></div>
    <div class="setup-step"><span class="step-number">3</span><div><strong>Agrega tus datos reales</strong><p>Los tableros e informes se actualizan a partir de los registros persistidos.</p></div></div>
  </div></div></div>`;
}

function renderInicio(module) {
  const actions = `<a class="button button-primary" href="${pathForModule('sales')}">${svg('receipt')} Registrar una venta</a><a class="button button-secondary" href="${pathForModule('clients')}">${svg('people')} Añadir cliente</a>`;
  return `${pageHeading(module, actions)}
    <div class="dashboard-grid">
      <section class="card"><div class="card-heading"><div><h2>Empieza con los datos de tu empresa</h2><p class="card-subtitle">Sin ejemplos precargados. Cada cifra aparecerá cuando guardes datos reales.</p></div></div>
      <div class="card-body">${setupBlock()}</div></section>
      <section class="card"><div class="card-heading"><div><h2>Flujo de trabajo</h2><p class="card-subtitle">Orden sugerido para configurar y operar</p></div></div>
      <div class="card-body"><div class="activity-list">
        <div class="activity-item"><div class="activity-icon">${svg('sliders')}</div><div><p class="activity-title">Configura los parámetros</p><p class="activity-text">Completa identificación, año fiscal, caja inicial y tarifas.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('tag')}</div><div><p class="activity-title">Crea tu lista de servicios</p><p class="activity-text">Los costos y ventas se relacionan con los servicios registrados.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('people')}</div><div><p class="activity-title">Registra tus clientes</p><p class="activity-text">Las ventas se vinculan a un NIT existente.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('chart')}</div><div><p class="activity-title">Consulta los informes</p><p class="activity-text">Tablero, resultados y proyecciones reflejan datos guardados.</p></div></div>
      </div></div></section>
    </div>
    <div class="dashboard-lower">
      <section class="card"><div class="card-heading"><div><h2>Operación</h2><p class="card-subtitle">Módulos que actualizan la base de datos</p></div></div>
      <div class="card-body"><div class="quick-links">
        <a class="quick-link" href="${pathForModule('clients')}">${svg('people')} Clientes</a><a class="quick-link" href="${pathForModule('service-prices')}">${svg('tag')} Lista de precios</a>
        <a class="quick-link" href="${pathForModule('sales')}">${svg('receipt')} Ventas</a><a class="quick-link" href="${pathForModule('expenses')}">${svg('wallet')} Gastos</a>
      </div></div></section>
      <section class="card"><div class="card-heading"><div><h2>Análisis</h2><p class="card-subtitle">Cálculos actualizados desde PostgreSQL</p></div></div>
      <div class="card-body"><div class="quick-links">
        <a class="quick-link" href="${pathForModule('results')}">${svg('file')} Estado de resultados</a><a class="quick-link" href="${pathForModule('cashflow')}">${svg('coins')} Flujo de caja</a>
        <a class="quick-link" href="${pathForModule('break-even')}">${svg('scale')} Punto de equilibrio</a><a class="quick-link" href="${pathForModule('forecast')}">${svg('chart')} Proyección a 9 meses</a>
      </div></div></section>
    </div>`;
}

function metricCard(label, value, note, iconName) {
  return `<article class="card metric-card"><div class="metric-top"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-mark">${svg(iconName)}</div></div><div class="metric-value">${value}</div><div class="metric-note">${escapeHtml(note)}</div></article>`;
}

function chartSvg(labels, values, { accent = false, valuePrefix = '$' } = {}) {
  const width = 680;
  const height = 220;
  const plotLeft = 42;
  const plotTop = 14;
  const plotBottom = 180;
  const plotHeight = plotBottom - plotTop;
  const maxValue = Math.max(0, ...values.map((value) => Number(value) || 0));
  const scaleMax = maxValue || 1;
  const slot = (width - plotLeft - 12) / Math.max(labels.length, 1);
  const barWidth = Math.min(28, slot * 0.48);
  const guides = [0, .5, 1].map((ratio) => {
    const y = plotBottom - ratio * plotHeight;
    return `<line class="chart-guide" x1="${plotLeft}" y1="${y}" x2="${width - 8}" y2="${y}"/>`;
  }).join('');
  const bars = labels.map((label, index) => {
    const value = Number(values[index]) || 0;
    const heightValue = value === 0 ? 1 : Math.max(2, (value / scaleMax) * plotHeight);
    const x = plotLeft + slot * index + (slot - barWidth) / 2;
    const y = plotBottom - heightValue;
    const shortLabel = String(label).slice(0, 3);
    const aria = `${label}: ${formatMoney(value)}`;
    return `<g><title>${escapeHtml(aria)}</title><rect class="chart-bar${accent ? ' chart-bar-accent' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${heightValue.toFixed(1)}" rx="3"/><text class="chart-label" x="${(x + barWidth / 2).toFixed(1)}" y="202" text-anchor="middle">${escapeHtml(shortLabel)}</text></g>`;
  }).join('');
  const label = maxValue ? `${valuePrefix}${quantityFormat.format(maxValue)}` : 'Sin operaciones registradas';
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de ingresos mensuales. Escala máxima ${escapeHtml(label)}">${guides}${bars}<text class="chart-value" x="${plotLeft}" y="11">${escapeHtml(label)}</text></svg>`;
}

function chartCard(title, subtitle, labels, values, accent = false) {
  return `<section class="card chart-card"><div class="card-heading"><div><h2>${escapeHtml(title)}</h2><p class="card-subtitle">${escapeHtml(subtitle)}</p></div></div>
    <div class="card-body">${chartSvg(labels, values, { accent })}
    <div class="chart-legend"><span><i class="legend-dot${accent ? ' gold' : ''}"></i>${escapeHtml(title)}</span></div></div></section>`;
}

function renderDashboard(module, report) {
  const actions = `<a class="button button-primary" href="${pathForModule('sales')}">${svg('plus')} Nueva venta</a>`;
  if (!report.configured) {
    return `${pageHeading(module, actions)}${configurationBanner()}${setupBlock()}`;
  }
  const metrics = [
    metricCard('Ingresos netos reales', formatMoney(report.actualRevenue), 'Ventas completadas · primer trimestre', 'receipt'),
    metricCard('Utilidad operacional real', formatMoney(report.actualProfit), `Primer trimestre · ${report.year}`, 'chart'),
    metricCard('Servicios completados', formatNumber(report.completedServices), 'Cantidad ingresada · primer trimestre', 'people'),
    metricCard('Caja proyectada a diciembre', formatMoney(report.endingCash), `Reserva mínima: ${formatMoney(report.minimumCashReserve)}`, 'cash')
  ].join('');
  const cashWarning = Number(report.endingCash) < Number(report.minimumCashReserve)
    ? configurationBanner(`El saldo final de caja estimado (${formatMoney(report.endingCash)}) está por debajo de la reserva mínima configurada (${formatMoney(report.minimumCashReserve)}).`)
    : '';
  const emptyNotice = Number(report.actualRevenue) === 0
    ? configurationBanner('No hay ventas completadas para el ejercicio. Registra ventas y costos reales para poblar los indicadores.')
    : '';
  return `${pageHeading(module, actions)}${emptyNotice}${cashWarning}
    <div class="metric-grid">${metrics}</div>
    <div class="dashboard-grid">${chartCard('Ingresos netos por mes', `Ventas completadas · ${report.year}`, report.months, report.quarterlyRevenue)}
      <section class="card"><div class="card-heading"><div><h2>Plan de trabajo</h2><p class="card-subtitle">Accesos directos a la operación</p></div></div>
      <div class="card-body"><div class="activity-list">
        <div class="activity-item"><div class="activity-icon">${svg('tag')}</div><div><p class="activity-title">Servicios e ingresos</p><p class="activity-text">Actualiza precios, ventas y costos asociados a cada servicio.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('wallet')}</div><div><p class="activity-title">Gastos y nómina</p><p class="activity-text">Registra egresos y revisa los cálculos patronales.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('budget')}</div><div><p class="activity-title">Control del presupuesto</p><p class="activity-text">Compara los valores presupuestados con la ejecución.</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('file')}</div><div><p class="activity-title">Informes financieros</p><p class="activity-text">Explora resultados, impuestos y flujo de caja.</p></div></div>
      </div></div></section>
    </div>
    <div class="dashboard-lower">${chartCard('Utilidad operacional', `Estimación mensual · ${report.year}`, report.months, report.quarterlyProfit, true)}
      <section class="card"><div class="card-heading"><div><h2>Resumen del ejercicio</h2><p class="card-subtitle">Proyección basada en los datos observados del primer trimestre</p></div></div>
      <div class="card-body"><div class="activity-list">
        <div class="activity-item"><div class="activity-icon">${svg('chart')}</div><div><p class="activity-title">Ingresos proyectados a 12 meses</p><p class="activity-text">${formatMoney(report.projectedRevenue)} · incluye nueve meses estimados</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('coins')}</div><div><p class="activity-title">Inversión inicial registrada</p><p class="activity-text">${formatMoney(report.totalInvestments)}</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('briefcase')}</div><div><p class="activity-title">Financiación y aportes registrados</p><p class="activity-text">${formatMoney(report.totalFinancing)}</p></div></div>
        <div class="activity-item"><div class="activity-icon">${svg('cost')}</div><div><p class="activity-title">Costo hora profesional calculado</p><p class="activity-text">${formatMoney(report.costPerHour)} · escenario ${escapeHtml(report.scenario)}</p></div></div>
      </div></div></section>
    </div>`;
}

function fieldControl(field, value, relationRows = []) {
  const required = field.required ? ' required' : '';
  const min = field.min !== undefined ? ` min="${field.min}"` : '';
  const max = field.max !== undefined ? ` max="${field.max}"` : '';
  const step = field.step !== undefined ? ` step="${field.step}"` : field.type === 'number' ? ' step="0.01"' : '';
  const maxLength = field.maxLength || field.max && field.type === 'text' ? field.maxLength || field.max : undefined;
  if (field.type === 'checkbox') {
    return `<label class="field field-checkbox${field.full ? ' full-width' : ''}"><input type="checkbox" name="${field.key}"${value ? ' checked' : ''}${required}><span>${escapeHtml(field.label)}</span></label>`;
  }
  let control;
  if (field.type === 'select' || field.type === 'relation') {
    let options = field.options || [];
    if (field.type === 'relation') {
      options = relationRows.map((row) => ({
        value: row[field.value],
        label: `${row[field.title]}${field.subtitle ? ` · ${row[field.subtitle]}` : ''}`
      }));
      if (!relationRows.length) {
        return `<div class="field${field.full ? ' full-width' : ''}"><label for="field-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label><select class="select" id="field-${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" required><option value="">No hay registros disponibles</option></select><small class="field-hint">Primero registra datos en <a class="page-link" href="${pathForModule(field.resource)}">${escapeHtml(titleFor(field.resource).toLowerCase())}</a>.</small></div>`;
      }
    }
    const optionMarkup = options.map((option) => {
      const optionValue = typeof option === 'string' ? option : option.value;
      const optionLabel = typeof option === 'string' ? option : option.label;
      return `<option value="${escapeHtml(optionValue)}"${String(value ?? '') === String(optionValue) ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`;
    }).join('');
    control = `<select class="select" id="field-${escapeHtml(field.key)}" name="${escapeHtml(field.key)}"${required}><option value="">Selecciona una opción</option>${optionMarkup}</select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea class="textarea" id="field-${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" rows="3"${required}${maxLength ? ` maxlength="${maxLength}"` : ''}>${escapeHtml(value ?? '')}</textarea>`;
  } else {
    let inputValue = value ?? '';
    if (field.percent && inputValue !== '') inputValue = Number(inputValue) * 100;
    control = `<input class="input" id="field-${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" type="${field.type}" value="${escapeHtml(inputValue)}"${required}${min}${max}${step}${maxLength ? ` maxlength="${maxLength}"` : ''}>`;
  }
  return `<div class="field${field.full ? ' full-width' : ''}"><label for="field-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>${control}${field.hint ? `<small class="field-hint">${escapeHtml(field.hint)}</small>` : ''}</div>`;
}

async function loadRelations(fields) {
  const resources = [...new Set(fields.filter((field) => field.type === 'relation').map((field) => field.resource))];
  const results = await Promise.all(resources.map(async (resource) => [resource, await api(resource)]));
  return Object.fromEntries(results);
}

function displayValue(key, value) {
  if (key === 'active') {
    const label = value ? 'Activo' : 'Inactivo';
    return `<span class="status-badge${value ? ' positive' : ''}">${label}</span>`;
  }
  if (key === 'status') {
    const positive = value === 'Completado';
    const cancelled = value === 'Cancelado';
    return `<span class="status-badge${positive ? ' positive' : cancelled ? ' negative' : ''}">${escapeHtml(value)}</span>`;
  }
  return formatCell(key, value);
}

function statusStyles() {
  if (document.getElementById('status-badge-styles')) return;
  const style = document.createElement('style');
  style.id = 'status-badge-styles';
  style.textContent = '.status-badge{display:inline-flex;padding:4px 8px;border-radius:999px;color:#647185;background:#f1f3f6;font-size:9px;font-weight:600}.status-badge.positive{color:#247254;background:#e8f6ef}.status-badge.negative{color:#9b4d4d;background:#fff0f0}';
  document.head.append(style);
}

function distinctFilters(rows, columns) {
  const keys = columns.filter((key) => ['month', 'period', 'area', 'category', 'expense_type', 'budget_type', 'status', 'transaction_type', 'active', 'client_type', 'price_type', 'client_name', 'tax_name'].includes(key));
  return keys.map((key) => {
    const values = [...new Set(rows.map((row) => row[key]).filter((value) => value !== null && value !== undefined && value !== ''))];
    if (values.length < 2 || values.length > 60) return '';
    return `<select class="select select-filter" data-filter="${escapeHtml(key)}" aria-label="Filtrar por ${escapeHtml(displayNames[key] || key)}">
      <option value="">Todos: ${escapeHtml(displayNames[key] || key)}</option>
      ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value === true ? 'Sí' : value === false ? 'No' : value)}</option>`).join('')}
    </select>`;
  }).filter(Boolean).join('');
}

function renderEntityTable(rows, columns, resource) {
  const head = columns.map((key) => `<th scope="col">${escapeHtml(displayNames[key] || key)}</th>`).join('');
  if (!rows.length) {
    return `<div class="empty-state"><strong>No hay registros para mostrar</strong><p>Los datos aparecerán aquí cuando guardes el primer registro. La lista se lee directamente desde PostgreSQL.</p><button class="button button-primary" data-action="create">${svg('plus')} Crear registro</button></div>`;
  }
  const body = rows.map((row) => `<tr>${columns.map((key) => `<td title="${escapeHtml(row[key] ?? '')}">${displayValue(key, row[key])}</td>`).join('')}
    <td class="actions-cell"><span class="row-actions">
      <button class="row-action" type="button" data-action="edit" data-id="${escapeHtml(row.id ?? row[resource === 'clients' ? 'client_nit' : 'service_code'])}" aria-label="Editar registro">${svg('edit')}</button>
      <button class="row-action delete" type="button" data-action="delete" data-id="${escapeHtml(row.id ?? row[resource === 'clients' ? 'client_nit' : 'service_code'])}" aria-label="Eliminar registro">${svg('trash')}</button>
    </span></td></tr>`).join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}<th class="actions-cell" scope="col">Acciones</th></tr></thead><tbody>${body}</tbody></table></div>
    <div class="table-footer"><span>Mostrando ${rows.length} registro${rows.length === 1 ? '' : 's'}${rows.length === 5000 ? ' · límite de consulta alcanzado' : ''}</span><span>Persistencia: PostgreSQL</span></div>`;
}

function buildEntityPage(module, resource, rows, search = '') {
  const columns = tableColumns[resource];
  const action = `<button class="button button-primary" type="button" data-action="create">${svg('plus')} Nuevo registro</button>`;
  return `${pageHeading(module, action)}
    <section class="card" id="entity-card">
      <div class="toolbar"><div class="toolbar-left"><div class="search-wrap">${svg('search')}<input class="input search-input" id="record-search" type="search" placeholder="Buscar registros…" value="${escapeHtml(search)}" aria-label="Buscar registros"></div>
        ${distinctFilters(rows, columns)}</div>
        <div class="toolbar-right"><span class="table-meta">${rows.length} registro${rows.length === 1 ? '' : 's'}</span></div>
      </div><div id="entity-table">${renderEntityTable(rows, columns, resource)}</div>
    </section>`;
}

function renderReportTable(headers, rows, { totalRows = [] } = {}) {
  const head = `<tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr>`;
  const body = rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('');
  const totals = totalRows.length ? totalRows.map((row) => `<tr class="report-total">${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('') : '';
  return `<div class="table-wrap"><table class="data-table report-table"><thead>${head}</thead><tbody>${body}${totals}</tbody></table></div>`;
}

function reportCard(label, value, detail) {
  return `<article class="card report-card"><div class="report-card-label">${escapeHtml(label)}</div><div class="report-card-value">${value}</div><div class="report-card-detail">${escapeHtml(detail)}</div></article>`;
}

function reportEmpty(module) {
  return `${pageHeading(module)}${configurationBanner()}<div class="card"><div class="empty-state"><strong>No hay datos de informe</strong><p>Guarda los parámetros de la empresa para habilitar los cálculos y proyecciones.</p><a class="button button-primary" href="${pathForModule('parameters')}">${svg('sliders')} Configurar parámetros</a></div></div>`;
}

function normalizeExcelHeader(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function autoMapExcelFields(sheet, target) {
  return Object.fromEntries(target.fields
    .filter((field) => sheet.headers.some((header) =>
      [field.key, displayNames[field.key]].filter(Boolean).some((label) =>
        normalizeExcelHeader(header) === normalizeExcelHeader(label))))
    .map((field) => [field.key, sheet.headers.find((header) =>
      [field.key, displayNames[field.key]].filter(Boolean).some((label) =>
        normalizeExcelHeader(header) === normalizeExcelHeader(label)))]));
}

function excelFieldLabel(field) {
  return `${displayNames[field.key] || field.key.replaceAll('_', ' ')}${field.required ? ' · obligatorio' : ''} (${field.type})`;
}

function renderExcelMapping(sheet) {
  const target = excelImportState?.targets.find((item) => item.id === sheet.target);
  const targetSelect = `<label class="field"><span>Importar hoja en</span><select class="select" data-excel-target="${escapeHtml(sheet.name)}">
    <option value="skip"${sheet.target === 'skip' ? ' selected' : ''}>No importar esta hoja</option>
    ${excelImportState.targets.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === sheet.target ? ' selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
  </select></label>`;
  const fields = target ? `<div class="excel-field-map">${target.fields.map((field) => `<label class="field">
    <span>${escapeHtml(excelFieldLabel(field))}</span>
    <select class="select" data-excel-field="${escapeHtml(field.key)}" data-excel-sheet="${escapeHtml(sheet.name)}">
      <option value="">Sin asignar</option>
      ${sheet.headers.map((header) => `<option value="${escapeHtml(header)}"${sheet.fields[field.key] === header ? ' selected' : ''}>${escapeHtml(header)}</option>`).join('')}
    </select>
  </label>`).join('')}</div>` : '';
  const previewRows = sheet.sample.map((row) => [
    escapeHtml(row.rowNumber),
    ...sheet.headers.map((header) => escapeHtml(row.values[header] instanceof Object ? '[valor complejo]' : row.values[header] ?? ''))
  ]);
  const sample = sheet.headers.length
    ? renderReportTable(['Fila', ...sheet.headers], previewRows)
    : '<p class="field-hint">No se detectaron encabezados; esta hoja no se puede asignar hasta corregir el archivo.</p>';
  const validation = excelImportState.validation?.summaries.find((item) => item.sheet === sheet.name);
  const sheetErrors = sheet.errors?.length ? `<div class="form-error">${sheet.errors.map(escapeHtml).join('<br>')}</div>` : '';
  const report = validation ? `<p class="excel-sheet-result">Leídos: ${formatNumber(validation.rowsRead)} · Válidos: ${formatNumber(validation.valid)} · Duplicados: ${formatNumber(validation.duplicates)} · Omitidos: ${formatNumber(validation.omitted)} · Errores: ${formatNumber(validation.errorCount)}</p>
    ${validation.errors.length ? `<details class="excel-errors"><summary>Ver errores de esta hoja</summary><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></details>` : ''}` : '';
  return `<article class="card excel-sheet"><div class="card-heading"><div><h2>${escapeHtml(sheet.name)}</h2><p class="card-subtitle">Encabezado detectado en fila ${formatNumber(sheet.headerRow)} · ${formatNumber(sheet.rowsRead)} registros</p></div></div>
    <div class="card-body">${sheetErrors}${targetSelect}${fields}${report}<details class="excel-sample"><summary>Vista previa de hasta cinco filas</summary>${sample}</details></div></article>`;
}

function renderExcelImport(module) {
  const state = excelImportState;
  const progress = state?.progress ? `<div class="configuration-banner" role="status"><div>${svg('chart')}</div><div><strong>Progreso</strong><p>${escapeHtml(state.progress)}</p></div></div>` : '';
  const results = state?.result ? `<section class="card excel-results"><div class="card-heading"><div><h2>Resultado de la importación</h2><p class="card-subtitle">${state.result.replacedExisting ? 'Los datos anteriores fueron reemplazados por los del Excel dentro de una única transacción de PostgreSQL.' : 'Los registros se agregaron dentro de una única transacción de PostgreSQL.'}</p></div></div><div class="card-body">
    <p>Leídos: <strong>${formatNumber(state.result.totals.rowsRead)}</strong> · Importados: <strong>${formatNumber(state.result.totals.imported)}</strong> · Omitidos: <strong>${formatNumber(state.result.totals.omitted)}</strong> · Duplicados: <strong>${formatNumber(state.result.totals.duplicates)}</strong> · Errores: <strong>${formatNumber(state.result.totals.errors)}</strong></p>
    ${state.result.summaries.map((summary) => `<details class="excel-errors"><summary>${escapeHtml(summary.sheet)} · ${escapeHtml(summary.target)} · ${formatNumber(summary.imported)} importados</summary>${summary.errors.length ? `<ul>${summary.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : '<p>Sin errores reportados.</p>'}</details>`).join('')}
  </div></section>` : '';
  const validation = state?.validation ? `<section class="card excel-results"><div class="card-heading"><div><h2>Validación previa</h2><p class="card-subtitle">Leídos: ${formatNumber(state.validation.totals.rowsRead)} · Válidos: ${formatNumber(state.validation.totals.valid)} · Duplicados: ${formatNumber(state.validation.totals.duplicates)} · Omitidos: ${formatNumber(state.validation.totals.omitted)} · Errores: ${formatNumber(state.validation.totals.errors)}</p></div></div></section>` : '';
  const sheets = state?.sheets?.length ? `<div class="excel-sheet-list">${state.sheets.map(renderExcelMapping).join('')}</div>
    <div class="form-actions">
      <button class="button button-secondary" type="button" data-action="validate-excel"${state.busy ? ' disabled' : ''}>Validar asignaciones</button>
      <button class="button button-primary" type="button" data-action="import-excel"${!state.validation || state.busy || state.result ? ' disabled' : ''}>${state.busy ? 'Procesando…' : 'Ejecutar importación'}</button>
    </div>` : '';
  const replacing = state?.replaceExisting !== false;
  const profileNotice = state?.sourceProfile === 'renta-al-dia' ? '<p class="field-hint">Se detectó el formato del libro Presupuesto Renta al Día y se prepararon las asignaciones de sus tablas.</p>' : '';
  return `${pageHeading(module)}<section class="card"><div class="card-heading"><div><h2>Archivo de origen</h2><p class="card-subtitle">Selecciona el libro Excel original. Todas las hojas se muestran antes de importar; las columnas se asignan a campos existentes.</p></div></div>
    <div class="card-body"><label class="field excel-file-field"><span>Archivo Excel (.xlsx o .xlsm)</span><input class="input" id="excel-file" type="file" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"${state?.busy ? ' disabled' : ''}></label>
    <p class="field-hint">Límite de 15 MB. Las columnas del libro no modifican el esquema de la aplicación.</p>${profileNotice}
    ${state?.sheets?.length ? `<label class="field excel-replace-option"><input type="checkbox" id="excel-replace-existing"${replacing ? ' checked' : ''}${state.busy ? ' disabled' : ''}><span>Reemplazar los datos actuales con los del Excel; elimina también los datos de demostración.</span></label>` : ''}
    ${state?.result ? '<div class="form-actions"><button class="button button-secondary" type="button" data-action="reset-excel">Seleccionar otro libro</button></div>' : ''}</div></section>
    ${progress}${state?.error ? `<div class="form-error" role="alert">${escapeHtml(state.error)}</div>` : ''}
    ${state?.fileName ? `<p class="excel-file-name">Libro seleccionado: <strong>${escapeHtml(state.fileName)}</strong></p>` : ''}
    ${validation}${sheets}${results}`;
}

function renderSummary(module, data) {
  if (!data.configured) return reportEmpty(module);
  const cards = [
    reportCard('Ingresos reales · 3M', formatMoney(data.actualRevenue), 'Ventas completadas registradas'),
    reportCard('Ingresos proyectados · 12M', formatMoney(data.projectedRevenue), 'Tres meses reales más nueve estimados'),
    reportCard('Margen neto proyectado', formatPercent(data.projectedNetMargin), `Meta configurada: ${formatPercent(data.targetNetMargin)}`),
    reportCard('Caja proyectada a diciembre', formatMoney(data.endingCash), `Ejercicio ${data.year}`),
    reportCard('Servicios completados', formatNumber(data.completedServices), 'Ventas con estado completado'),
    reportCard('Financiación y aportes', formatMoney(data.totalFinancing), 'Registros de inversiones / financiación')
  ].join('');
  return `${pageHeading(module)}<div class="report-cards">${cards}</div>
    <div class="dashboard-grid">${chartCard('Ingresos netos del primer trimestre', `Ventas completadas · ${data.year}`, data.months, data.quarterlyRevenue)}
      ${chartCard('Utilidad operacional del primer trimestre', `Ingresos menos costos, gastos y nómina · ${data.year}`, data.months, data.quarterlyProfit, true)}</div>
    <p class="report-note">La proyección utiliza los parámetros y operaciones guardados. No representa asesoría tributaria ni reemplaza la revisión contable.</p>`;
}

function renderResults(module, data) {
  if (!data.configured) return reportEmpty(module);
  const rows = data.rows.map((row) => {
    const values = row.values.map(Number);
    const annual = values.reduce((sum, value) => sum + value, 0);
    return [escapeHtml(row.label), ...values.map((value) => formatMoney(value)), formatMoney(annual)];
  });
  const headers = ['Concepto', ...data.months, 'Total del ejercicio'];
  return `${pageHeading(module)}<section class="card">${renderReportTable(headers, rows)}
    <p class="report-note">Ejercicio ${data.year}. Los costos directos de ventas se calculan a partir del costo unitario registrado por servicio. Depreciación, financiación, nómina, aportes e impuestos provienen de sus módulos y parámetros.</p></section>`;
}

function renderCashflow(module, data) {
  if (!data.configured) return reportEmpty(module);
  const rows = [
    ['Cobros de clientes', ...data.customerReceipts.map(formatMoney)],
    ['Financiación y aportes', ...data.financingInflows.map(formatMoney)],
    ['Costos directos de ventas', ...data.directCostPayments.map(formatMoney)],
    ['Nómina neta', ...data.payrollNet.map(formatMoney)],
    ['Aportes del empleador', ...data.employerContributions.map(formatMoney)],
    ['Gastos operativos', ...data.operatingExpenses.map(formatMoney)],
    ['Impuesto de renta estimado', ...data.taxes.map(formatMoney)],
    ['Inversiones', ...data.investmentPayments.map(formatMoney)],
    ['Cuotas de créditos', ...data.financingPayments.map(formatMoney)],
    ['Flujo neto mensual', ...data.netCashFlow.map(formatMoney)],
    ['Saldo de caja acumulado', ...data.endingCash.map(formatMoney)]
  ];
  const projectedRows = data.forecast.map((row) => [
    escapeHtml(row.month), formatMoney(row.customerReceipts), formatMoney(row.financingInflows),
    formatMoney(row.directCostPayments), formatMoney(row.payrollNet), formatMoney(row.employerContributions),
    formatMoney(row.commercialExpenses + row.administrativeExpenses), formatMoney(row.taxPayment),
    formatMoney(row.investmentPayments), formatMoney(row.financingPayments), formatMoney(row.netCashFlow), formatMoney(row.endingCash)
  ]);
  return `${pageHeading(module)}<div class="report-cards">${reportCard('Caja inicial del año', formatMoney(data.openingCash), 'Saldo guardado en parámetros')}${reportCard('Caja tras el primer trimestre', formatMoney(data.forecastStartingCash), 'Base de inicio para los nueve meses proyectados')}${reportCard('Caja proyectada a diciembre', formatMoney(data.forecast.at(-1)?.endingCash), 'Flujo de caja proyectado')}</div>
    <section class="card"><div class="card-heading"><div><h2>Flujo real registrado</h2><p class="card-subtitle">Enero a diciembre · movimientos asociados a su fecha de registro</p></div></div>
      ${renderReportTable(['Flujo de caja', ...data.months], rows)}</section>
    <section class="card" style="margin-top:16px"><div class="card-heading"><div><h2>Flujo de caja proyectado</h2><p class="card-subtitle">Abril a diciembre · supuestos del ejercicio</p></div></div>
      ${renderReportTable(['Mes', 'Cobros clientes', 'Financiación', 'Costos directos', 'Nómina neta', 'Aportes empleador', 'Gastos operativos', 'Impuestos', 'Inversiones', 'Cuotas créditos', 'Flujo neto', 'Saldo final'], projectedRows)}
      <p class="report-note">La estimación usa el porcentaje de cobro del primer trimestre. El impuesto proyectado se paga en diciembre; los demás ingresos y egresos se asignan al mes proyectado.</p></section>`;
}

function renderForecast(module, data) {
  if (!data.configured) return reportEmpty(module);
  const rows = data.rows.map((row) => [
    escapeHtml(row.month), formatMoney(row.revenue), formatMoney(row.directCost),
    formatMoney(row.commercialExpenses), formatMoney(row.administrativeExpenses),
    formatMoney(row.payroll), formatMoney(row.ebitda), formatMoney(row.depreciation),
    formatMoney(row.operatingProfit), formatMoney(row.financeExpense),
    formatMoney(row.profitBeforeTax), formatMoney(row.incomeTax), formatMoney(row.netProfit),
    formatPercent(row.netMargin)
  ]);
  const totals = ['Total proyectado', ...['revenue', 'directCost', 'commercialExpenses', 'administrativeExpenses', 'payroll', 'ebitda', 'depreciation', 'operatingProfit', 'financeExpense', 'profitBeforeTax', 'incomeTax', 'netProfit'].map((key) =>
    formatMoney(data.rows.reduce((sum, row) => sum + Number(row[key]), 0))
  ), formatPercent(data.rows.at(-1)?.netMargin)];
  const projectedCashRows = data.rows.map((row) => [
    escapeHtml(row.month), formatMoney(row.revenue), formatMoney(row.customerReceipts),
    formatMoney(row.directCostPayments), formatMoney(row.payrollNet), formatMoney(row.employerContributions),
    formatMoney(row.expenses), formatMoney(row.taxPayment), formatMoney(row.financingPayments),
    formatMoney(row.netCashFlow), formatMoney(row.endingCash)
  ]);
  return `${pageHeading(module)}<div class="report-cards">${reportCard('Caja proyectada inicial', formatMoney(data.startingCash), 'Saldo estimado al cierre de marzo')}${reportCard('Caja proyectada final', formatMoney(data.endingCash), 'Saldo estimado al cierre del ejercicio')}</div>
    <section class="card"><div class="card-heading"><div><h2>Estado de resultados proyectado</h2><p class="card-subtitle">Los supuestos de crecimiento mensual y anual se aplican según el parámetro asociado.</p></div></div>
    ${renderReportTable(
    ['Mes', 'Ventas netas', 'Costos directos', 'Gastos comerciales', 'Gastos administrativos', 'Nómina', 'Resultado antes de depreciación', 'Depreciación', 'Resultado operativo', 'Gastos financieros', 'Utilidad antes de impuestos', 'Impuesto estimado', 'Utilidad neta', 'Margen neto'],
    rows, { totalRows: [totals] }
  )}</section>
    <section class="card" style="margin-top:16px"><div class="card-heading"><div><h2>Flujo de caja proyectado</h2><p class="card-subtitle">Cobros, pagos, impuestos y saldo mensual</p></div></div>
    ${renderReportTable(
    ['Mes', 'Ventas netas', 'Cobros de clientes', 'Costos directos', 'Nómina neta', 'Aportes empleador', 'Gastos operativos', 'Impuestos pagados', 'Cuotas créditos', 'Flujo neto', 'Saldo final'],
    projectedCashRows
  )}<p class="report-note">La proyección utiliza el promedio de ventas y costos directos del primer trimestre, los porcentajes mensuales/anuales guardados, la nómina registrada, depreciaciones y pagos financieros. No precarga ventas ni valores de ejemplo.</p></section>`;
}

function renderTaxes(module, data, records, search = '') {
  const estimates = data.configured
    ? `<section class="card"><div class="card-heading"><div><h2>Estimaciones automáticas</h2><p class="card-subtitle">Cálculo mensual usando ventas completadas y los parámetros tributarios guardados.</p></div></div>
      ${renderReportTable(['Concepto', ...data.months], [
    ['Base gravable de ventas', ...data.revenue.map(formatMoney)],
    [`IVA estimado (${formatPercent(data.vatRate)})`, ...data.vatEstimate.map(formatMoney)],
    ['Base estimada de renta', ...data.incomeTaxBase.map(formatMoney)],
    [`Renta estimada (${formatPercent(data.incomeTaxRate)})`, ...data.incomeTaxEstimate.map(formatMoney)]
  ])}<p class="report-note">Estas estimaciones no incluyen retenciones, saldos a favor ni reglas particulares de cada contribuyente; valida con tu profesional contable.</p></section>`
    : `<section class="card"><div class="configuration-banner">${svg('sliders')}<div><strong>Estimaciones automáticas deshabilitadas</strong><p>Configura y guarda las tasas tributarias para calcular IVA e impuesto de renta sobre las operaciones registradas.</p><a class="button button-secondary" href="${pathForModule('parameters')}">Configurar parámetros</a></div></div></section>`;
  const action = `<button class="button button-primary" type="button" data-action="create">${svg('plus')} Nueva obligación</button>`;
  return `${pageHeading(module, action)}${estimates}
    <section class="card" id="entity-card"><div class="card-heading"><div><h2>Obligaciones tributarias registradas</h2><p class="card-subtitle">El impuesto calculado y el saldo pendiente se actualizan automáticamente.</p></div></div>
      <div class="toolbar"><div class="toolbar-left"><div class="search-wrap">${svg('search')}<input class="input search-input" id="record-search" type="search" placeholder="Buscar obligaciones…" value="${escapeHtml(search)}" aria-label="Buscar obligaciones"></div>
        ${distinctFilters(records, tableColumns['tax-records'])}</div><div class="toolbar-right"><span class="table-meta">${records.length} registro${records.length === 1 ? '' : 's'}</span></div></div>
      <div id="entity-table">${renderEntityTable(records, tableColumns['tax-records'], 'tax-records')}</div>
    </section>`;
}

function renderBreakEven(module, data) {
  if (!data.configured) return reportEmpty(module);
  const units = data.breakEvenServices === null ? '—' : formatNumber(data.breakEvenServices);
  const revenue = data.monthlyBreakEvenRevenue === null ? '—' : formatMoney(data.monthlyBreakEvenRevenue);
  const cards = [
    reportCard('Costos fijos mensuales', formatMoney(data.fixedCosts), 'Gastos fijos mensuales equivalentes más nómina'),
    reportCard('Servicios para equilibrio', units, 'Estimación mensual con el margen observado'),
    reportCard('Ingresos estimados de equilibrio', revenue, 'Estimación basada en ingresos reales por servicio')
  ].join('');
  const details = [
    ['Ingreso medio por servicio', formatMoney(data.averageRevenuePerService)],
    ['Costo directo medio por servicio', formatMoney(data.averageDirectCostPerService)],
    ['Margen de contribución por servicio', formatMoney(data.contributionPerService)]
  ];
  const rows = details.map(([label, value]) => [escapeHtml(label), value]);
  const explanation = data.breakEvenServices === null
    ? configurationBanner('Aún no hay ventas completadas con margen de contribución positivo. Registra ventas y costos reales para calcular el equilibrio.')
    : '';
  return `${pageHeading(module)}${explanation}<div class="report-cards">${cards}</div><section class="card">${renderReportTable(['Indicador', 'Valor', 'Periodo'], rows.map(([label, value]) => [label, value, escapeHtml(String(data.year))]))}
    <p class="report-note">Cálculo basado en ventas completadas del ejercicio. El resultado es una estimación y no sustituye un análisis contable del negocio.</p></section>`;
}

function renderCatalogs(module, rows) {
  return buildEntityPage(module, 'catalog-options', rows);
}

async function loadSettings() {
  const settings = await api('settings');
  settingsCache = settings;
  const year = document.getElementById('year-chip');
  year.textContent = settings?.fiscal_year ? `Ejercicio ${settings.fiscal_year}` : 'Año sin configurar';
  return settings;
}

const settingsGroups = [
  {
    title: 'Datos de la empresa',
    description: 'Identificación y lugar principal de operación.',
    fields: [
      { key: 'company_name', type: 'text', label: 'Nombre de la empresa', required: true, max: 180 },
      { key: 'tax_id', type: 'text', label: 'NIT', required: true, max: 32 },
      { key: 'activity', type: 'text', label: 'Actividad principal / CIIU', required: true, max: 240, full: true },
      { key: 'municipality', type: 'text', label: 'Municipio principal', required: true, max: 100 }
    ]
  },
  {
    title: 'Ejercicio y proyecciones',
    description: 'Supuestos del presupuesto. Ingresa porcentajes como 2 para 2%.',
    fields: [
      { key: 'fiscal_year', type: 'number', label: 'Año fiscal', required: true, min: 2000, max: 2100, step: 1 },
      { key: 'currency', type: 'select', label: 'Moneda funcional', required: true, options: ['COP'] },
      { key: 'scenario', type: 'select', label: 'Escenario', required: true, options: ['Conservador', 'Base', 'Optimista'] },
      { key: 'opening_cash', type: 'number', label: 'Caja inicial (COP)', required: true, min: 0 },
      { key: 'monthly_sales_growth', type: 'number', label: 'Crecimiento mensual de ventas (%)', required: true, min: -99.99, max: 1000, percent: true },
      { key: 'annual_price_increase', type: 'number', label: 'Incremento anual de precios (%)', required: true, min: -99.99, max: 1000, percent: true },
      { key: 'annual_direct_cost_growth', type: 'number', label: 'Crecimiento anual de costos directos (%)', required: true, min: -99.99, max: 1000, percent: true },
      { key: 'annual_expense_growth', type: 'number', label: 'Crecimiento anual de gastos (%)', required: true, min: -99.99, max: 1000, percent: true },
      { key: 'average_receivable_days', type: 'number', label: 'Días promedio de cartera', required: true, min: 0, max: 3650, step: 1 },
      { key: 'average_payable_days', type: 'number', label: 'Días promedio de proveedores', required: true, min: 0, max: 3650, step: 1 },
      { key: 'inventory_days', type: 'number', label: 'Días de inventario', required: true, min: 0, max: 3650, step: 1 }
    ]
  },
  {
    title: 'Financiación y capital de trabajo',
    description: 'Supuestos de financiación y reserva de efectivo del archivo de presupuesto.',
    fields: [
      { key: 'annual_credit_interest_rate', type: 'number', label: 'Interés anual de créditos (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'minimum_cash_reserve', type: 'number', label: 'Reserva mínima de caja (COP)', required: true, min: 0 },
      { key: 'target_net_margin', type: 'number', label: 'Meta de margen neto (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'monthly_billable_hours_per_professional', type: 'number', label: 'Horas facturables mensuales por profesional', required: true, min: 0.01 },
      { key: 'professional_count', type: 'number', label: 'Número de profesionales / asesores', required: true, min: 1, max: 10000, step: 1 }
    ]
  },
  {
    title: 'Tarifas tributarias',
    description: 'Configura las tasas aplicables a tu empresa. Se usan solo para estimaciones.',
    fields: [
      { key: 'income_tax_rate', type: 'number', label: 'Impuesto de renta (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'vat_rate', type: 'number', label: 'IVA (%)', required: true, min: 0, max: 100, percent: true }
    ]
  },
  {
    title: 'Aportes y provisiones de nómina',
    description: 'Ingresa las tasas correspondientes a tu situación laboral y tributaria.',
    fields: [
      { key: 'employee_health_rate', type: 'number', label: 'Salud del empleado (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'employee_pension_rate', type: 'number', label: 'Pensión del empleado (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'employer_health_rate', type: 'number', label: 'Salud del empleador (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'employer_pension_rate', type: 'number', label: 'Pensión del empleador (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'family_compensation_rate', type: 'number', label: 'Caja de compensación (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'default_arl_rate', type: 'number', label: 'Tasa ARL riesgo I (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'sena_rate', type: 'number', label: 'SENA (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'icbf_rate', type: 'number', label: 'ICBF (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'severance_provision_rate', type: 'number', label: 'Provisión de cesantías (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'severance_interest_rate', type: 'number', label: 'Provisión de intereses a cesantías (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'service_bonus_rate', type: 'number', label: 'Provisión de prima (%)', required: true, min: 0, max: 100, percent: true },
      { key: 'vacation_provision_rate', type: 'number', label: 'Provisión de vacaciones (%)', required: true, min: 0, max: 100, percent: true }
    ]
  }
];

function renderSettingsPage(module, settings) {
  const groups = settingsGroups.map((group) => `<section class="card settings-section"><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.description)}</p>
    <div class="settings-fields">${group.fields.map((field) => fieldControl(field, settings?.[field.key] ?? '')).join('')}</div></section>`).join('');
  const configuredMessage = settings
    ? `<div class="configuration-banner"><div>${svg('chart')}</div><div><strong>Parámetros guardados en PostgreSQL</strong><p>Última actualización: ${escapeHtml(formatDate(settings.updated_at))}. Costo hora profesional calculado: ${formatMoney(settings.cost_per_hour)} con base en nómina y horas facturables.</p></div></div>`
    : configurationBanner('Completa y guarda los datos de empresa y las tasas para habilitar informes y cálculos de nómina.');
  return `${pageHeading(module)}${configuredMessage}<form id="settings-form"><div class="settings-grid">${groups}</div>
    <div class="form-actions"><button class="button button-primary" type="submit">${svg('plus')} Guardar parámetros</button></div></form>`;
}

async function showModule(route, { search = '' } = {}) {
  window.clearTimeout(searchTimer);
  let module = modules.find((item) => item.id === route) || modules[0];
  currentModule = module.id;
  currentResource = module.id === 'taxes'
    ? 'tax-records'
    : ['inicio', 'parameters', 'dashboard', 'summary', 'results', 'cashflow', 'forecast', 'break-even', 'import-excel'].includes(module.id)
      ? null
      : module.id;
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.route === module.id));
  document.getElementById('breadcrumb-title').textContent = module.title;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
  const content = document.getElementById('main-content');
  content.innerHTML = '<div class="loading-state"><div><div class="spinner"></div>Consultando PostgreSQL…</div></div>';
  if (moduleForPath(location.pathname) !== module.id) {
    history.replaceState(null, '', pathForModule(module.id));
  }

  try {
    if (module.id === 'inicio') {
      content.innerHTML = renderInicio(module);
    } else if (module.id === 'parameters') {
      const settings = await api('settings');
      settingsCache = settings;
      content.innerHTML = renderSettingsPage(module, settings);
    } else if (module.id === 'dashboard') {
      const report = await api('reports/dashboard');
      if (report.configured) settingsCache = { ...(settingsCache || {}), fiscal_year: report.year };
      content.innerHTML = renderDashboard(module, report);
    } else if (module.id === 'summary') {
      const report = await api('reports/summary');
      content.innerHTML = renderSummary(module, report);
    } else if (module.id === 'results') {
      const report = await api('reports/results');
      content.innerHTML = renderResults(module, report);
    } else if (module.id === 'cashflow') {
      const report = await api('reports/cashflow');
      content.innerHTML = renderCashflow(module, report);
    } else if (module.id === 'forecast') {
      const report = await api('reports/forecast');
      content.innerHTML = renderForecast(module, report);
    } else if (module.id === 'taxes') {
      const [report, records] = await Promise.all([
        api('reports/taxes'),
        api(`${currentResource}${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      ]);
      currentRows = records;
      content.innerHTML = renderTaxes(module, report, records, search);
    } else if (module.id === 'break-even') {
      const report = await api('reports/break-even');
      content.innerHTML = renderBreakEven(module, report);
    } else if (module.id === 'import-excel') {
      content.innerHTML = renderExcelImport(module);
    } else {
      const query = search ? `?q=${encodeURIComponent(search)}` : '';
      currentRows = await api(`${currentResource}${query}`);
      content.innerHTML = currentResource === 'catalog-options'
        ? renderCatalogs(module, currentRows)
        : buildEntityPage(module, currentResource, currentRows, search);
      statusStyles();
    }

    if (module.id === 'parameters') {
      const form = document.getElementById('settings-form');
      form.addEventListener('submit', saveSettings);
    }
  } catch (error) {
    setConnection(false, 'Error de conexión con PostgreSQL');
    content.innerHTML = `${pageHeading(module)}<div class="configuration-banner">${svg('alert')}<div><strong>No se pudieron cargar los datos</strong><p>${escapeHtml(error.message)} La aplicación no usa información ficticia como alternativa.</p></div></div>
      <button class="button button-secondary" type="button" data-action="retry">${svg('chart')} Reintentar</button>`;
  }
}

function normalizePath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function moduleForPath(pathname) {
  const path = normalizePath(pathname);
  return pathModules.get(path) || null;
}

function renderRoute() {
  const path = normalizePath(location.pathname);
  const module = moduleForPath(path) || 'dashboard';
  if (!moduleForPath(path)) history.replaceState(null, '', pathForModule(module));
  void showModule(module);
}

function navigateTo(destination, { replace = false } = {}) {
  const target = new URL(destination, location.origin);
  if (target.origin !== location.origin) return;
  const nextUrl = `${target.pathname}${target.search}`;
  if (nextUrl !== `${location.pathname}${location.search}`) {
    history[replace ? 'replaceState' : 'pushState'](null, '', nextUrl);
  }
  renderRoute();
}

function readExcelMappingsFromPage() {
  if (!excelImportState) return [];
  return excelImportState.sheets.map((sheet) => {
    const target = document.querySelector(`[data-excel-target="${CSS.escape(sheet.name)}"]`)?.value || sheet.target;
    const fields = {};
    document.querySelectorAll(`[data-excel-sheet="${CSS.escape(sheet.name)}"]`).forEach((select) => {
      if (select.value) fields[select.dataset.excelField] = select.value;
    });
    return { sheetName: sheet.name, target, fields };
  });
}

function persistExcelMappings(mappings) {
  for (const mapping of mappings) {
    const sheet = excelImportState.sheets.find((item) => item.name === mapping.sheetName);
    if (sheet) {
      sheet.target = mapping.target;
      sheet.fields = mapping.fields;
    }
  }
}

async function uploadExcel(file) {
  if (!file) return;
  excelImportState = { busy: true, progress: 'Subiendo el archivo para analizar sus hojas…', fileName: file.name };
  await showModule('import-excel');
  try {
    const preview = await api('migration/excel/preview', {
      method: 'POST',
      body: file,
      headers: {
        'Content-Type': file.name.toLowerCase().endsWith('.xlsm')
          ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
    excelImportState = {
      ...preview,
      fileName: file.name,
      replaceExisting: true,
      busy: false,
      progress: `Lectura terminada: ${preview.sheets.length} hojas detectadas. Revisa la asignación de cada hoja y sus columnas.`
    };
    for (const sheet of excelImportState.sheets) {
      sheet.target = sheet.suggestedTarget || 'skip';
      const target = excelImportState.targets.find((item) => item.id === sheet.target);
      sheet.fields = target ? autoMapExcelFields(sheet, target) : {};
    }
    await showModule('import-excel');
  } catch (error) {
    excelImportState = { fileName: file.name, error: error.message, busy: false };
    await showModule('import-excel');
  }
}

async function validateExcelImport() {
  if (!excelImportState?.token) return;
  excelImportState.mappings = readExcelMappingsFromPage();
  persistExcelMappings(excelImportState.mappings);
  excelImportState.replaceExisting = document.getElementById('excel-replace-existing')?.checked ?? true;
  excelImportState.busy = true;
  excelImportState.progress = 'Validando encabezados, tipos de datos y registros duplicados…';
  await showModule('import-excel');
  try {
    excelImportState.validation = await api(`migration/excel/${encodeURIComponent(excelImportState.token)}/validate`, {
      method: 'POST',
      body: JSON.stringify({
        mappings: excelImportState.mappings,
        replaceExisting: excelImportState.replaceExisting
      })
    });
    excelImportState.progress = 'Validación terminada. Revisa los errores y confirma la importación.';
    excelImportState.error = '';
  } catch (error) {
    excelImportState.error = error.message;
  } finally {
    excelImportState.busy = false;
    await showModule('import-excel');
  }
}

async function runExcelImport() {
  if (!excelImportState?.token || !excelImportState.validation) return;
  excelImportState.mappings = readExcelMappingsFromPage();
  persistExcelMappings(excelImportState.mappings);
  excelImportState.replaceExisting = document.getElementById('excel-replace-existing')?.checked ?? true;
  excelImportState.busy = true;
  excelImportState.progress = excelImportState.replaceExisting
    ? 'Reemplazando las tablas con los datos validados del Excel en una transacción PostgreSQL…'
    : 'Agregando los registros válidos a los datos existentes en una transacción PostgreSQL…';
  await showModule('import-excel');
  try {
    excelImportState.result = await api(`migration/excel/${encodeURIComponent(excelImportState.token)}/import`, {
      method: 'POST',
      body: JSON.stringify({
        mappings: excelImportState.mappings,
        replaceExisting: excelImportState.replaceExisting
      })
    });
    excelImportState.progress = excelImportState.result.replacedExisting
      ? 'Datos anteriores reemplazados por los registros del Excel en PostgreSQL.'
      : 'Importación confirmada en PostgreSQL.';
    excelImportState.error = '';
  } catch (error) {
    excelImportState.error = error.message;
    excelImportState.progress = 'La importación no se confirmó. Si ocurrió un error crítico, PostgreSQL revirtió la transacción completa.';
  } finally {
    excelImportState.busy = false;
    await showModule('import-excel');
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  for (const field of settingsGroups.flatMap((group) => group.fields)) {
    const input = form.elements.namedItem(field.key);
    if (!input) continue;
    if (field.percent && data[field.key] !== '') data[field.key] = Number(data[field.key]) / 100;
    else if (field.type === 'number' && data[field.key] !== '') data[field.key] = Number(data[field.key]);
  }
  button.disabled = true;
  try {
    const settings = await api('settings', { method: 'PUT', body: JSON.stringify(data) });
    settingsCache = settings;
    document.getElementById('year-chip').textContent = `Ejercicio ${settings.fiscal_year}`;
    toast('Parámetros guardados en PostgreSQL.');
    await showModule('parameters');
  } catch (error) {
    button.disabled = false;
    showFormError(form, error.message);
  }
}

function showFormError(form, message) {
  form.querySelector('.form-error')?.remove();
  const banner = document.createElement('div');
  banner.className = 'form-error';
  banner.setAttribute('role', 'alert');
  banner.textContent = message;
  form.prepend(banner);
}

async function createOrEdit(resource, id = null) {
  const fields = fieldSets[resource];
  if (!fields) return;
  const row = id === null ? null : currentRows.find((item) => String(item.id ?? item[resource === 'clients' ? 'client_nit' : 'service_code']) === String(id));
  if (id !== null && !row) {
    toast('El registro ya no está en la lista. Actualiza la pantalla e inténtalo de nuevo.', true);
    return;
  }
  let relations;
  try {
    relations = await loadRelations(fields);
    if (resource === 'sales' && relations['service-prices']) {
      relations['service-prices'] = relations['service-prices'].filter((price) => price.active);
    }
  } catch (error) {
    toast(error.message, true);
    return;
  }
  modalContext = { resource, id };
  const modalLayer = document.getElementById('modal-layer');
  const fieldMarkup = fields.map((field) => fieldControl(field, row?.[field.key] ?? (
    field.type === 'checkbox'
      ? resource === 'service-prices' || resource === 'catalog-options'
      : resource === 'tax-records' && field.key === 'paid_amount' ? 0 : ''
  ), relations[field.resource] || [])).join('');
  modalLayer.hidden = false;
  modalLayer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header class="modal-header"><div><h2 id="modal-title">${row ? 'Editar registro' : 'Nuevo registro'}</h2><p>Los cambios se guardan directamente en PostgreSQL.</p></div>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Cerrar">${svg('close')}</button></header>
    <form id="record-form"><div class="modal-body"><div class="modal-fields">${fieldMarkup}</div></div>
      <footer class="modal-footer">${row ? `<button class="button button-danger modal-delete" type="button" data-action="delete-modal">${svg('trash')} Eliminar registro</button>` : ''}
      <button class="button button-secondary" type="button" data-action="close-modal">Cancelar</button>
      <button class="button button-primary" type="submit">${row ? 'Guardar cambios' : 'Guardar registro'}</button></footer></form>
  </section>`;
  modalLayer.querySelector('.modal').addEventListener('click', async (event) => {
    event.stopPropagation();
    const button = event.target.closest('[data-action]');
    if (button?.dataset.action === 'close-modal') closeModal();
    if (button?.dataset.action === 'delete-modal' && modalContext) {
      await deleteRecord(modalContext.resource, modalContext.id, true);
    }
  });
  modalLayer.querySelector('[name]')?.focus();
  if (resource === 'sales') {
    const serviceSelect = modalLayer.querySelector('[name="service_code"]');
    const feeInput = modalLayer.querySelector('[name="unit_fee"]');
    serviceSelect?.addEventListener('change', () => {
      const selectedService = relations['service-prices'].find((service) => service.service_code === serviceSelect.value);
      if (selectedService && feeInput) feeInput.value = selectedService.suggested_price;
    });
  }
  if (resource === 'payroll') {
    const arlInput = modalLayer.querySelector('[name="arl_rate"]');
    if (arlInput && !row) arlInput.value = settingsCache?.default_arl_rate == null ? '' : Number(settingsCache.default_arl_rate) * 100;
  }
  if (resource === 'investments-financing') {
    const interestInput = modalLayer.querySelector('[name="annual_interest_rate"]');
    if (interestInput && !row) {
      interestInput.value = settingsCache?.annual_credit_interest_rate == null
        ? ''
        : Number(settingsCache.annual_credit_interest_rate) * 100;
    }
  }
  modalLayer.querySelector('#record-form').addEventListener('submit', saveRecord);
}

async function saveRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const payload = {};
  for (const field of fieldSets[modalContext.resource]) {
    const input = form.elements.namedItem(field.key);
    if (!input) continue;
    if (field.type === 'checkbox') {
      payload[field.key] = input.checked;
    } else if (field.type === 'number') {
      if (input.value === '' && field.nullable) payload[field.key] = null;
      else {
        payload[field.key] = Number(input.value);
        if (field.percent) payload[field.key] /= 100;
      }
    } else if (input.value === '' && field.nullable) {
      payload[field.key] = null;
    } else {
      payload[field.key] = input.value;
    }
  }
  button.disabled = true;
  const { resource, id } = modalContext;
  const row = id === null ? null : currentRows.find((item) => String(item.id ?? item[resource === 'clients' ? 'client_nit' : 'service_code']) === String(id));
  const key = row?.id ?? row?.[resource === 'clients' ? 'client_nit' : 'service_code'];
  try {
    await api(id === null ? resource : `${resource}/${encodeURIComponent(key)}`, {
      method: id === null ? 'POST' : 'PUT',
      body: JSON.stringify(payload)
    });
    closeModal();
    toast(id === null ? 'Registro guardado en PostgreSQL.' : 'Cambios guardados en PostgreSQL.');
    await showModule(currentModule);
  } catch (error) {
    button.disabled = false;
    showFormError(form, error.message);
  }
}

function closeModal() {
  const layer = document.getElementById('modal-layer');
  layer.hidden = true;
  layer.innerHTML = '';
  modalContext = null;
}

async function deleteRecord(resource, id, closeAfterDelete = false) {
  const row = currentRows.find((item) => String(item.id ?? item[resource === 'clients' ? 'client_nit' : 'service_code']) === String(id));
  if (!row) {
    toast('El registro ya no está disponible. Actualiza la lista.', true);
    return;
  }
  const label = row.name || row.service_name || row.concept || row.employee_name || row.label || String(id);
  if (!window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) return;
  const key = row.id ?? row[resource === 'clients' ? 'client_nit' : 'service_code'];
  try {
    await api(`${resource}/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (closeAfterDelete) closeModal();
    toast('Registro eliminado de PostgreSQL.');
    await showModule(currentModule);
  } catch (error) {
    toast(error.message, true);
  }
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
    event.preventDefault();
    navigateTo(`${target.pathname}${target.search}`);
  });
  document.getElementById('main-navigation').addEventListener('click', (event) => {
    if (event.target.closest('.nav-link')) document.getElementById('sidebar').classList.remove('open');
  });
  document.getElementById('menu-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.toggle('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', String(isOpen));
  });
  document.getElementById('modal-layer').addEventListener('click', (event) => {
    if (event.target.id === 'modal-layer') closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('modal-layer').hidden) closeModal();
  });
  document.getElementById('main-content').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'create' && currentResource) await createOrEdit(currentResource);
    if (action === 'edit' && currentResource) await createOrEdit(currentResource, button.dataset.id);
    if (action === 'delete' && currentResource) await deleteRecord(currentResource, button.dataset.id);
    if (action === 'close-modal') closeModal();
    if (action === 'retry') await showModule(currentModule);
    if (action === 'validate-excel') await validateExcelImport();
    if (action === 'import-excel') await runExcelImport();
    if (action === 'reset-excel') {
      excelImportState = null;
      await showModule('import-excel');
    }
  });
  document.getElementById('main-content').addEventListener('input', (event) => {
    if (event.target.id !== 'record-search') return;
    const search = event.target.value;
    window.clearTimeout(searchTimer);
    const resource = currentResource;
    if (!resource) return;
    searchTimer = window.setTimeout(async () => {
      try {
        const query = search ? `?q=${encodeURIComponent(search)}` : '';
        currentRows = await api(`${resource}${query}`);
        if (currentResource !== resource) return;
        updateVisibleEntityRows();
      } catch (error) {
        toast(error.message, true);
      }
    }, 280);
  });
  document.getElementById('main-content').addEventListener('change', (event) => {
    if (event.target.id === 'excel-file') {
      void uploadExcel(event.target.files?.[0]);
      return;
    }
    if (event.target.matches('[data-excel-target]')) {
      const mappings = readExcelMappingsFromPage();
      for (const mapping of mappings) {
        const sheet = excelImportState.sheets.find((item) => item.name === mapping.sheetName);
        if (sheet) {
          sheet.target = mapping.target;
          sheet.fields = mapping.target === 'skip'
            ? {}
            : autoMapExcelFields(sheet, excelImportState.targets.find((target) => target.id === mapping.target));
        }
      }
      excelImportState.validation = null;
      void showModule('import-excel');
      return;
    }
    if (event.target.id === 'excel-replace-existing') {
      excelImportState.replaceExisting = event.target.checked;
      excelImportState.validation = null;
      void showModule('import-excel');
      return;
    }
    if (!event.target.matches('[data-filter]')) return;
    updateVisibleEntityRows();
  });
  window.addEventListener('popstate', () => {
    renderRoute();
  });
}

function updateVisibleEntityRows() {
  const filters = [...document.querySelectorAll('[data-filter]')]
    .map((select) => [select.dataset.filter, select.value])
    .filter(([, value]) => value !== '');
  const filtered = currentRows.filter((row) => filters.every(([key, value]) => String(row[key]) === value));
  const entityTable = document.getElementById('entity-table');
  if (entityTable) entityTable.innerHTML = renderEntityTable(filtered, tableColumns[currentResource], currentResource);
  const meta = document.querySelector('.table-meta');
  if (meta) meta.textContent = `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`;
}

async function start() {
  bindEvents();
  renderNavigation();
  renderRoute();
  try {
    await loadSettings();
    renderRoute();
  } catch (error) {
    setConnection(false, 'Error de conexión con PostgreSQL');
    toast(error.message, true);
  }
}

start();

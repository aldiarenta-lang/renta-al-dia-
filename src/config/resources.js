export const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const resourceDefinitions = {
  clients: {
    table: 'clients', view: 'clients', key: 'client_nit',
    search: ['client_nit', 'name', 'municipality'],
    fields: {
      client_nit: { type: 'text', required: true, max: 32 },
      name: { type: 'text', required: true, max: 180 },
      address: { type: 'text', required: true, max: 240 },
      municipality: { type: 'text', required: true, max: 100 },
      client_type: { type: 'enum', required: true, values: ['Persona natural', 'Persona jurídica'] }
    }
  },
  'service-prices': {
    table: 'service_prices', view: 'service_prices', key: 'service_code',
    search: ['service_code', 'service_name', 'billing_unit'],
    fields: {
      service_code: { type: 'text', required: true, max: 32 },
      service_name: { type: 'text', required: true, max: 180 },
      billing_unit: { type: 'text', required: true, max: 80 },
      reference_low: { type: 'number', required: true, min: 0 },
      reference_high: { type: 'number', required: true, min: 0 },
      suggested_price: { type: 'number', required: true, min: 0 },
      price_type: { type: 'text', required: true, max: 60 },
      notes: { type: 'text', required: false, max: 1000 },
      active: { type: 'boolean', required: true }
    }
  },
  sales: {
    table: 'sales', view: 'sales_calculated', key: 'id', integerKey: true,
    search: ['client_nit', 'client_name', 'service_name', 'status'],
    fields: {
      sale_date: { type: 'date', required: true },
      client_nit: { type: 'text', required: true, max: 32 },
      service_code: { type: 'text', required: true, max: 32 },
      quantity: { type: 'number', required: true, min: 0.01 },
      unit_fee: { type: 'number', required: true, min: 0 },
      discount_rate: { type: 'rate', required: true, min: 0, max: 1 },
      refund_rate: { type: 'rate', required: true, min: 0, max: 1 },
      cash_rate: { type: 'rate', required: true, min: 0, max: 1 },
      receivable_days: { type: 'integer', required: true, min: 0, max: 3650 },
      status: { type: 'enum', required: true, values: ['Presupuestado', 'En proceso', 'Completado', 'Cancelado'] }
    }
  },
  'direct-costs': {
    table: 'service_costs', view: 'service_costs_calculated', key: 'id', integerKey: true,
    search: ['period', 'service_code', 'notes'],
    fields: {
      period: { type: 'enum', required: true, values: [...months, 'Anual'] },
      service_code: { type: 'text', required: true, max: 32 },
      services_served: { type: 'integer', required: true, min: 0 },
      materials_per_service: { type: 'number', required: true, min: 0 },
      external_fees_per_service: { type: 'number', required: true, min: 0 },
      other_direct_per_service: { type: 'number', required: true, min: 0 },
      other_monthly_costs: { type: 'number', required: true, min: 0 },
      notes: { type: 'text', required: false, max: 1000 }
    }
  },
  expenses: {
    table: 'expenses', view: 'expenses_calculated', key: 'id', integerKey: true,
    search: ['month', 'expense_code', 'concept', 'category', 'area'],
    fields: {
      month: { type: 'enum', required: true, values: months },
      expense_code: { type: 'text', required: true, max: 40 },
      concept: { type: 'text', required: true, max: 180 },
      category: { type: 'text', required: true, max: 100 },
      expense_type: { type: 'enum', required: true, values: ['Fijo', 'Variable'] },
      area: { type: 'text', required: true, max: 100 },
      budget_amount: { type: 'number', required: true, min: 0 },
      annual_frequency: { type: 'integer', required: false, nullable: true, min: 1, max: 12 },
      expected_payment_date: { type: 'date', required: false, nullable: true }
    }
  },
  payroll: {
    table: 'payroll', view: 'payroll_calculated', key: 'id', integerKey: true,
    search: ['employee_name', 'job_title', 'area'],
    fields: {
      employee_name: { type: 'text', required: true, max: 180 },
      job_title: { type: 'text', required: true, max: 120 },
      area: { type: 'text', required: true, max: 100 },
      days_worked: { type: 'integer', required: true, min: 1, max: 30 },
      monthly_salary: { type: 'number', required: true, min: 0 },
      monthly_transport_allowance: { type: 'number', required: true, min: 0 },
      arl_rate: { type: 'rate', required: true, min: 0, max: 1 }
    }
  },
  'investments-financing': {
    table: 'investments_financing', view: 'investments_financing_calculated', key: 'id', integerKey: true,
    search: ['transaction_type', 'concept', 'counterparty'],
    fields: {
      transaction_date: { type: 'date', required: true },
      transaction_type: { type: 'enum', required: true, values: ['Activo fijo', 'Activo intangible', 'Capital de trabajo', 'Financiación', 'Aporte socio'] },
      concept: { type: 'text', required: true, max: 180 },
      counterparty: { type: 'text', required: false, max: 180 },
      amount: { type: 'number', required: true, min: 0 },
      useful_life_years: { type: 'number', required: false, nullable: true, min: 0.01 },
      residual_value: { type: 'number', required: true, min: 0 },
      annual_interest_rate: { type: 'rate', required: true, min: 0, max: 1 },
      term_months: { type: 'integer', required: false, nullable: true, min: 1, max: 600 },
      monthly_payment: { type: 'number', required: true, min: 0 }
    }
  },
  'budget-control': {
    table: 'budget_control', view: 'budget_control_calculated', key: 'id', integerKey: true,
    search: ['month', 'area', 'account_concept', 'responsible'],
    fields: {
      month: { type: 'enum', required: true, values: months },
      area: { type: 'text', required: true, max: 100 },
      account_concept: { type: 'text', required: true, max: 180 },
      budget_amount: { type: 'number', required: true, min: 0 },
      actual_amount: { type: 'number', required: true, min: 0 },
      budget_type: { type: 'enum', required: true, values: ['Fijo', 'Variable'] },
      responsible: { type: 'text', required: false, max: 120 },
      observation: { type: 'text', required: false, max: 1000 }
    }
  },
  'tax-records': {
    table: 'tax_obligations', view: 'tax_obligations_calculated', key: 'id', integerKey: true,
    search: ['tax_name', 'period', 'responsible', 'notes'],
    fields: {
      tax_name: { type: 'enum', required: true, values: ['IVA sobre servicios', 'IVA descontable', 'Retención en la fuente', 'Autorretención', 'Impuesto de renta', 'ICA', 'Otro'] },
      taxable_base: { type: 'number', required: true, min: 0 },
      rate: { type: 'rate', required: true, min: 0, max: 1 },
      period: { type: 'text', required: true, max: 80 },
      responsible: { type: 'text', required: false, max: 180 },
      due_date: { type: 'date', required: false, nullable: true },
      paid_amount: { type: 'number', required: true, min: 0 },
      notes: { type: 'text', required: false, max: 1000 }
    }
  },
  'catalog-options': {
    table: 'catalog_options', view: 'catalog_options', key: 'id', integerKey: true,
    search: ['category', 'label'],
    fields: {
      category: { type: 'text', required: true, max: 100 },
      label: { type: 'text', required: true, max: 180 },
      active: { type: 'boolean', required: true }
    }
  }
};

export const settingsFields = {
  company_name: { type: 'text', required: true, max: 180 },
  tax_id: { type: 'text', required: true, max: 32 },
  activity: { type: 'text', required: true, max: 240 },
  municipality: { type: 'text', required: true, max: 100 },
  fiscal_year: { type: 'integer', required: true, min: 2000, max: 2100 },
  currency: { type: 'enum', required: true, values: ['COP'] },
  scenario: { type: 'enum', required: true, values: ['Conservador', 'Base', 'Optimista'] },
  opening_cash: { type: 'number', required: true, min: 0 },
  monthly_sales_growth: { type: 'rate', required: true, min: -0.99999 },
  annual_price_increase: { type: 'rate', required: true, min: -0.99999 },
  annual_direct_cost_growth: { type: 'rate', required: true, min: -0.99999 },
  annual_expense_growth: { type: 'rate', required: true, min: -0.99999 },
  average_receivable_days: { type: 'integer', required: true, min: 0, max: 3650 },
  average_payable_days: { type: 'integer', required: true, min: 0, max: 3650 },
  inventory_days: { type: 'integer', required: true, min: 0, max: 3650 },
  annual_credit_interest_rate: { type: 'rate', required: true, min: 0, max: 1 },
  income_tax_rate: { type: 'rate', required: true, min: 0, max: 1 },
  vat_rate: { type: 'rate', required: true, min: 0, max: 1 },
  default_arl_rate: { type: 'rate', required: true, min: 0, max: 1 },
  employee_health_rate: { type: 'rate', required: true, min: 0, max: 1 },
  employee_pension_rate: { type: 'rate', required: true, min: 0, max: 1 },
  employer_health_rate: { type: 'rate', required: true, min: 0, max: 1 },
  employer_pension_rate: { type: 'rate', required: true, min: 0, max: 1 },
  family_compensation_rate: { type: 'rate', required: true, min: 0, max: 1 },
  sena_rate: { type: 'rate', required: true, min: 0, max: 1 },
  icbf_rate: { type: 'rate', required: true, min: 0, max: 1 },
  severance_provision_rate: { type: 'rate', required: true, min: 0, max: 1 },
  severance_interest_rate: { type: 'rate', required: true, min: 0, max: 1 },
  service_bonus_rate: { type: 'rate', required: true, min: 0, max: 1 },
  vacation_provision_rate: { type: 'rate', required: true, min: 0, max: 1 },
  target_net_margin: { type: 'rate', required: true, min: 0, max: 1 },
  minimum_cash_reserve: { type: 'number', required: true, min: 0 },
  monthly_billable_hours_per_professional: { type: 'number', required: true, min: 0.01 },
  professional_count: { type: 'integer', required: true, min: 1, max: 10000 },
  annual_client_growth: { type: 'rate', required: false, min: -0.99999 },
  scenario_conservative_revenue_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_conservative_direct_cost_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_conservative_expense_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_base_revenue_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_base_direct_cost_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_base_expense_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_optimistic_revenue_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_optimistic_direct_cost_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  scenario_optimistic_expense_adjustment: { type: 'rate', required: false, min: -0.99999, max: 10 },
  annual_salary_increase: { type: 'rate', required: false, min: -0.99999 },
  annual_rent_increase: { type: 'rate', required: false, min: -0.99999 },
  annual_utilities_increase: { type: 'rate', required: false, min: -0.99999 },
  annual_advertising_increase: { type: 'rate', required: false, min: -0.99999 },
  annual_inflation: { type: 'rate', required: false, min: -0.99999 },
  discount_rate: { type: 'rate', required: false, min: 0, max: 1 },
  office_rent_monthly: { type: 'number', required: false, min: 0 },
  office_utilities_monthly: { type: 'number', required: false, min: 0 },
  office_internet_monthly: { type: 'number', required: false, min: 0 },
  office_cleaning_monthly: { type: 'number', required: false, min: 0 },
  office_cafeteria_monthly: { type: 'number', required: false, min: 0 },
  office_stationery_monthly: { type: 'number', required: false, min: 0 },
  office_maintenance_monthly: { type: 'number', required: false, min: 0 },
  office_software_monthly: { type: 'number', required: false, min: 0 },
  office_security_monthly: { type: 'number', required: false, min: 0 },
  office_other_monthly: { type: 'number', required: false, min: 0 },
  projected_admin_salary: { type: 'number', required: false, min: 0 },
  projected_admin_transport: { type: 'number', required: false, min: 0 },
  projected_cleaning_salary: { type: 'number', required: false, min: 0 },
  projected_cleaning_transport: { type: 'number', required: false, min: 0 },
  advertising_year_1: { type: 'number', required: false, min: 0 },
  advertising_year_2: { type: 'number', required: false, min: 0 },
  advertising_year_3: { type: 'number', required: false, min: 0 },
  opening_other_current_assets: { type: 'number', required: false, min: 0 },
  opening_noncurrent_assets: { type: 'number', required: false, min: 0 },
  opening_current_liabilities: { type: 'number', required: false, min: 0 },
  opening_long_term_liabilities: { type: 'number', required: false, min: 0 },
  opening_equity: { type: 'number', required: false }
};

DO $demo$
BEGIN
INSERT INTO company_settings (
    id, company_name, tax_id, activity, municipality, fiscal_year, currency, scenario,
    opening_cash, monthly_sales_growth, annual_price_increase, annual_direct_cost_growth,
    annual_expense_growth, average_receivable_days, average_payable_days, inventory_days,
    annual_credit_interest_rate, income_tax_rate, vat_rate, default_arl_rate,
    employee_health_rate, employee_pension_rate, employer_health_rate, employer_pension_rate,
    family_compensation_rate, sena_rate, icbf_rate, severance_provision_rate,
    severance_interest_rate, service_bonus_rate, vacation_provision_rate, target_net_margin,
    minimum_cash_reserve, monthly_billable_hours_per_professional, professional_count
) VALUES (
    true, 'Servicios Integrales Demo S.A.S.', '900000000-1',
    'Consultoría administrativa, contable y tecnológica', 'Bogotá D.C.', 2026, 'COP', 'Base',
    28000000, 0.025, 0.06, 0.04, 0.05, 30, 30, 0,
    0.14, 0.35, 0.19, 0.00522, 0.04, 0.04, 0.085, 0.12,
    0.04, 0.02, 0.03, 0.0833, 0.01, 0.0833, 0.0417, 0.18,
    8000000, 120, 3
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (client_nit, name, address, municipality, client_type) VALUES
    ('DEMO-CLIENTE-001', 'Comercializadora Ejemplo Andina S.A.S.', 'Calle 10 # 20-30', 'Bogotá D.C.', 'Persona jurídica'),
    ('DEMO-CLIENTE-002', 'Tecnología Ficticia del Norte S.A.S.', 'Carrera 15 # 80-12', 'Medellín', 'Persona jurídica'),
    ('DEMO-CLIENTE-003', 'Camila Torres (cliente de prueba)', 'Carrera 7 # 45-18', 'Bogotá D.C.', 'Persona natural')
ON CONFLICT (client_nit) DO NOTHING;

INSERT INTO service_prices (
    service_code, service_name, billing_unit, reference_low, reference_high,
    suggested_price, price_type, notes, active
) VALUES
    ('DEMO-CONT', 'Acompañamiento contable mensual', 'Mes', 450000, 1200000, 780000, 'Recurrente', 'Registro ficticio para demostración.', true),
    ('DEMO-CONS', 'Consultoría de procesos', 'Hora', 90000, 220000, 145000, 'Por horas', 'Registro ficticio para demostración.', true),
    ('DEMO-TEC', 'Implementación tecnológica', 'Proyecto', 1200000, 6000000, 2800000, 'Por proyecto', 'Registro ficticio para demostración.', true)
ON CONFLICT (service_code) DO NOTHING;

INSERT INTO service_costs (
    period, service_code, services_served, materials_per_service,
    external_fees_per_service, other_direct_per_service, other_monthly_costs, notes
)
SELECT
    (ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'])[m.month_no],
    service.service_code,
    8 + ((m.month_no + service.service_index) % 7),
    service.materials_cost + ((m.month_no % 3) * 5000),
    service.external_cost,
    service.other_cost,
    service.monthly_cost,
    'Costo mensual ficticio de demostración.'
FROM generate_series(1, 12) AS m(month_no)
CROSS JOIN (VALUES
    ('DEMO-CONT', 1, 35000, 45000, 20000, 90000),
    ('DEMO-CONS', 2, 15000, 65000, 12000, 50000),
    ('DEMO-TEC', 3, 95000, 180000, 55000, 160000)
) AS service(service_code, service_index, materials_cost, external_cost, other_cost, monthly_cost);

INSERT INTO sales (
    sale_date, client_nit, service_code, quantity, unit_fee, discount_rate,
    refund_rate, cash_rate, receivable_days, status
)
SELECT
    make_date((SELECT fiscal_year FROM company_settings WHERE id = true), m.month_no, 5),
    (ARRAY['DEMO-CLIENTE-001', 'DEMO-CLIENTE-002', 'DEMO-CLIENTE-003'])[((m.month_no - 1) % 3) + 1],
    (ARRAY['DEMO-CONT', 'DEMO-CONS', 'DEMO-TEC'])[((m.month_no - 1) % 3) + 1],
    CASE (m.month_no - 1) % 3
        WHEN 0 THEN 4 + (m.month_no % 4)
        WHEN 1 THEN 16 + (m.month_no % 7)
        ELSE 1 + (m.month_no % 2)
    END,
    (ARRAY[780000, 145000, 2800000])[((m.month_no - 1) % 3) + 1],
    CASE WHEN m.month_no % 4 = 0 THEN 0.05 ELSE 0.02 END,
    CASE WHEN m.month_no % 6 = 0 THEN 0.01 ELSE 0 END,
    CASE WHEN m.month_no % 2 = 0 THEN 0.7 ELSE 0.8 END,
    30,
    'Completado'
FROM generate_series(1, 12) AS m(month_no)
UNION ALL
SELECT
    make_date((SELECT fiscal_year FROM company_settings WHERE id = true), m.month_no, 20),
    (ARRAY['DEMO-CLIENTE-002', 'DEMO-CLIENTE-003', 'DEMO-CLIENTE-001'])[((m.month_no - 1) % 3) + 1],
    (ARRAY['DEMO-CONS', 'DEMO-TEC', 'DEMO-CONT'])[((m.month_no - 1) % 3) + 1],
    2 + (m.month_no % 3),
    (ARRAY[145000, 2800000, 780000])[((m.month_no - 1) % 3) + 1],
    0, 0, 1, 0,
    CASE m.month_no % 4
        WHEN 0 THEN 'En proceso'
        WHEN 1 THEN 'Presupuestado'
        WHEN 2 THEN 'Cancelado'
        ELSE 'Completado'
    END
FROM generate_series(1, 12) AS m(month_no);

INSERT INTO expenses (
    month, expense_code, concept, category, expense_type, area,
    budget_amount, annual_frequency, expected_payment_date
)
SELECT
    (ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'])[m.month_no],
    expense.code,
    expense.concept,
    expense.category,
    expense.expense_type,
    expense.area,
    expense.amount + ((m.month_no % 3) * expense.variation),
    expense.annual_frequency,
    make_date((SELECT fiscal_year FROM company_settings WHERE id = true), m.month_no, expense.payment_day)
FROM generate_series(1, 12) AS m(month_no)
CROSS JOIN (VALUES
    ('GAS-ARR', 'Arrendamiento de oficina', 'Administrativa', 'Fijo', 'Administración', 1450000, 0, NULL::integer, 5),
    ('GAS-TEC', 'Internet y herramientas digitales', 'Administrativa', 'Fijo', 'Tecnología', 360000, 15000, NULL::integer, 10),
    ('GAS-COM', 'Mercadeo y captación de clientes', 'Comercial', 'Variable', 'Comercial', 480000, 50000, NULL::integer, 15),
    ('GAS-ASE', 'Asesoría legal anual', 'Administrativa', 'Fijo', 'Administración', 1800000, 0, 1, 20)
) AS expense(code, concept, category, expense_type, area, amount, variation, annual_frequency, payment_day);

INSERT INTO payroll (
    employee_name, job_title, area, days_worked, monthly_salary,
    monthly_transport_allowance, arl_rate
) VALUES
    ('Laura Méndez (demo)', 'Consultora contable', 'Operaciones', 30, 2600000, 200000, 0.00522),
    ('Andrés Rojas (demo)', 'Analista de procesos', 'Operaciones', 30, 2250000, 200000, 0.01044),
    ('Sofía Pardo (demo)', 'Coordinadora comercial', 'Comercial', 30, 2100000, 200000, 0.00522);

INSERT INTO investments_financing (
    transaction_date, transaction_type, concept, counterparty, amount,
    useful_life_years, residual_value, annual_interest_rate, term_months, monthly_payment
) VALUES
    (make_date((SELECT fiscal_year FROM company_settings WHERE id = true), 1, 10), 'Activo fijo', 'Equipos de cómputo de demostración', 'Proveedor ficticio', 7200000, 4, 500000, 0, NULL, 0),
    (make_date((SELECT fiscal_year FROM company_settings WHERE id = true), 1, 15), 'Activo intangible', 'Licencias de software anualizadas', 'Proveedor ficticio', 2400000, 3, 0, 0, NULL, 0),
    (make_date((SELECT fiscal_year FROM company_settings WHERE id = true), 1, 20), 'Capital de trabajo', 'Fondo inicial para operación', 'Caja de la empresa demo', 1800000, NULL, 0, 0, NULL, 0),
    (make_date((SELECT fiscal_year FROM company_settings WHERE id = true), 1, 5), 'Financiación', 'Crédito empresarial de prueba', 'Entidad financiera ficticia', 12000000, NULL, 0, 0.14, 12, 1080000),
    (make_date((SELECT fiscal_year FROM company_settings WHERE id = true), 1, 2), 'Aporte socio', 'Aporte inicial de capital de prueba', 'Socios ficticios', 5000000, NULL, 0, 0, NULL, 0);

INSERT INTO budget_control (
    month, area, account_concept, budget_amount, actual_amount,
    budget_type, responsible, observation
)
SELECT
    (ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'])[m.month_no],
    budget.area,
    budget.concept,
    budget.budget_amount,
    budget.budget_amount + ((m.month_no % 4) * budget.variation),
    budget.budget_type,
    budget.responsible,
    'Dato ficticio de comparación presupuestal.'
FROM generate_series(1, 12) AS m(month_no)
CROSS JOIN (VALUES
    ('Administración', 'Gastos administrativos', 1900000, 75000, 'Fijo', 'Laura Méndez (demo)'),
    ('Comercial', 'Mercadeo y ventas', 500000, 40000, 'Variable', 'Sofía Pardo (demo)'),
    ('Operaciones', 'Costos directos de servicios', 1500000, 60000, 'Variable', 'Andrés Rojas (demo)')
) AS budget(area, concept, budget_amount, variation, budget_type, responsible);

INSERT INTO tax_obligations (
    tax_name, taxable_base, rate, period, responsible, due_date, paid_amount, notes
)
SELECT
    obligation.tax_name, obligation.taxable_base, obligation.rate,
    settings.fiscal_year::text || obligation.period_suffix,
    obligation.responsible,
    make_date(settings.fiscal_year + obligation.due_year_offset, obligation.due_month, obligation.due_day),
    obligation.paid_amount, obligation.notes
FROM company_settings settings
CROSS JOIN (VALUES
    ('IVA sobre servicios', 10500000, 0.19, ' - Bimestre 1', 'Sofía Pardo (demo)', 0, 3, 15, 900000, 'Obligación ficticia; cifras solo para pruebas.'),
    ('IVA descontable', 2800000, 0.19, ' - Bimestre 1', 'Laura Méndez (demo)', 0, 3, 15, 300000, 'Registro de IVA descontable ficticio.'),
    ('Retención en la fuente', 4200000, 0.035, ' - Enero', 'Laura Méndez (demo)', 0, 2, 14, 147000, 'Retención de demostración.'),
    ('Autorretención', 8200000, 0.004, ' - Febrero', 'Laura Méndez (demo)', 0, 3, 14, 32800, 'Autorretención de demostración.'),
    ('Impuesto de renta', 18000000, 0.35, ' - Proyección anual',  'Laura Méndez (demo)', 1, 4, 15, 0, 'Estimación ficticia para pruebas.'),
    ('ICA', 10500000, 0.00966, ' - Bimestre 1', 'Laura Méndez (demo)', 0, 3, 20, 0, 'ICA ficticio para pruebas.'),
    ('Otro', 1250000, 0.02, ' - Ejemplo', 'Sofía Pardo (demo)', 0, 6, 30, 10000, 'Obligación de ejemplo no real.')
) AS obligation(
    tax_name, taxable_base, rate, period_suffix, responsible, due_year_offset,
    due_month, due_day, paid_amount, notes
);

INSERT INTO catalog_options (category, label, active) VALUES
    ('Área', 'Administración', true),
    ('Área', 'Comercial', true),
    ('Área', 'Operaciones', true),
    ('Área', 'Tecnología', true),
    ('Categoría de gasto', 'Administrativa', true),
    ('Categoría de gasto', 'Comercial', true),
    ('Tipo de servicio', 'Recurrente', true),
    ('Tipo de servicio', 'Por horas', true),
    ('Tipo de servicio', 'Por proyecto', true),
    ('Responsable', 'Laura Méndez (demo)', true),
    ('Responsable', 'Andrés Rojas (demo)', true),
    ('Responsable', 'Sofía Pardo (demo)', true)
ON CONFLICT (category, label) DO NOTHING;

INSERT INTO demo_seed_status (seed_name) VALUES ('demo-data-v1');
END
$demo$;

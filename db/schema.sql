CREATE TABLE IF NOT EXISTS clients (
    client_nit text PRIMARY KEY,
    name text NOT NULL,
    address text NOT NULL,
    municipality text NOT NULL,
    client_type text NOT NULL CHECK (client_type IN ('Persona natural', 'Persona jurídica'))
);

CREATE TABLE IF NOT EXISTS service_prices (
    service_code text PRIMARY KEY,
    service_name text NOT NULL,
    billing_unit text NOT NULL,
    reference_low numeric(14, 2) NOT NULL CHECK (reference_low >= 0),
    reference_high numeric(14, 2) NOT NULL CHECK (reference_high >= reference_low),
    suggested_price numeric(14, 2) NOT NULL CHECK (suggested_price >= 0),
    price_type text NOT NULL,
    notes text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS service_costs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period text NOT NULL,
    service_code text NOT NULL REFERENCES service_prices(service_code) ON UPDATE CASCADE,
    services_served integer NOT NULL CHECK (services_served >= 0),
    materials_per_service numeric(14, 2) NOT NULL CHECK (materials_per_service >= 0),
    external_fees_per_service numeric(14, 2) NOT NULL CHECK (external_fees_per_service >= 0),
    other_direct_per_service numeric(14, 2) NOT NULL CHECK (other_direct_per_service >= 0),
    other_monthly_costs numeric(14, 2) NOT NULL DEFAULT 0 CHECK (other_monthly_costs >= 0),
    notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sales (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_date date NOT NULL,
    client_nit text NOT NULL REFERENCES clients(client_nit) ON UPDATE CASCADE,
    service_code text NOT NULL REFERENCES service_prices(service_code) ON UPDATE CASCADE,
    quantity numeric(12, 2) NOT NULL CHECK (quantity > 0),
    unit_fee numeric(14, 2) NOT NULL CHECK (unit_fee >= 0),
    discount_rate numeric(6, 5) NOT NULL DEFAULT 0 CHECK (discount_rate BETWEEN 0 AND 1),
    refund_rate numeric(6, 5) NOT NULL DEFAULT 0 CHECK (refund_rate BETWEEN 0 AND 1),
    cash_rate numeric(6, 5) NOT NULL DEFAULT 1 CHECK (cash_rate BETWEEN 0 AND 1),
    receivable_days integer NOT NULL DEFAULT 0 CHECK (receivable_days >= 0),
    status text NOT NULL CHECK (status IN ('Presupuestado', 'En proceso', 'Completado', 'Cancelado'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    month text NOT NULL CHECK (month IN ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')),
    expense_code text NOT NULL,
    concept text NOT NULL,
    category text NOT NULL,
    expense_type text NOT NULL CHECK (expense_type IN ('Fijo', 'Variable')),
    area text NOT NULL,
    budget_amount numeric(14, 2) NOT NULL CHECK (budget_amount >= 0),
    annual_frequency integer CHECK (annual_frequency BETWEEN 1 AND 12),
    expected_payment_date date
);

CREATE TABLE IF NOT EXISTS payroll (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_name text NOT NULL,
    job_title text NOT NULL,
    area text NOT NULL,
    days_worked integer NOT NULL CHECK (days_worked BETWEEN 1 AND 30),
    monthly_salary numeric(14, 2) NOT NULL CHECK (monthly_salary >= 0),
    monthly_transport_allowance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_transport_allowance >= 0),
    arl_rate numeric(6, 5) NOT NULL CHECK (arl_rate BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS investments_financing (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_date date NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('Activo fijo', 'Activo intangible', 'Capital de trabajo', 'Financiación', 'Aporte socio')),
    concept text NOT NULL,
    counterparty text NOT NULL DEFAULT '',
    amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
    useful_life_years numeric(8, 2) CHECK (useful_life_years > 0),
    residual_value numeric(14, 2) NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
    annual_interest_rate numeric(6, 5) NOT NULL DEFAULT 0 CHECK (annual_interest_rate BETWEEN 0 AND 1),
    term_months integer CHECK (term_months > 0),
    monthly_payment numeric(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_payment >= 0)
);

CREATE TABLE IF NOT EXISTS budget_control (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    month text NOT NULL CHECK (month IN ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre')),
    area text NOT NULL,
    account_concept text NOT NULL,
    budget_amount numeric(14, 2) NOT NULL CHECK (budget_amount >= 0),
    actual_amount numeric(14, 2) NOT NULL CHECK (actual_amount >= 0),
    budget_type text NOT NULL CHECK (budget_type IN ('Fijo', 'Variable')),
    responsible text NOT NULL DEFAULT '',
    observation text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tax_obligations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tax_name text NOT NULL CHECK (tax_name IN ('IVA sobre servicios', 'IVA descontable', 'Retención en la fuente', 'Autorretención', 'Impuesto de renta', 'ICA', 'Otro')),
    taxable_base numeric(14, 2) NOT NULL CHECK (taxable_base >= 0),
    rate numeric(6, 5) NOT NULL CHECK (rate BETWEEN 0 AND 1),
    period text NOT NULL,
    responsible text NOT NULL DEFAULT '',
    due_date date,
    paid_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS catalog_options (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category text NOT NULL,
    label text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    UNIQUE (category, label)
);

CREATE TABLE IF NOT EXISTS company_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    company_name text NOT NULL,
    tax_id text NOT NULL,
    activity text NOT NULL,
    municipality text NOT NULL,
    fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
    currency text NOT NULL CHECK (currency = 'COP'),
    scenario text NOT NULL CHECK (scenario IN ('Conservador', 'Base', 'Optimista')),
    opening_cash numeric(14, 2) NOT NULL CHECK (opening_cash >= 0),
    monthly_sales_growth numeric(7, 5) NOT NULL CHECK (monthly_sales_growth > -1),
    annual_price_increase numeric(7, 5) NOT NULL CHECK (annual_price_increase > -1),
    annual_direct_cost_growth numeric(7, 5) NOT NULL CHECK (annual_direct_cost_growth > -1),
    annual_expense_growth numeric(7, 5) NOT NULL CHECK (annual_expense_growth > -1),
    average_receivable_days integer NOT NULL CHECK (average_receivable_days >= 0),
    average_payable_days integer NOT NULL CHECK (average_payable_days >= 0),
    inventory_days integer NOT NULL CHECK (inventory_days >= 0),
    annual_credit_interest_rate numeric(6, 5) NOT NULL CHECK (annual_credit_interest_rate BETWEEN 0 AND 1),
    income_tax_rate numeric(6, 5) NOT NULL CHECK (income_tax_rate BETWEEN 0 AND 1),
    vat_rate numeric(6, 5) NOT NULL CHECK (vat_rate BETWEEN 0 AND 1),
    default_arl_rate numeric(6, 5) NOT NULL CHECK (default_arl_rate BETWEEN 0 AND 1),
    employee_health_rate numeric(6, 5) NOT NULL CHECK (employee_health_rate BETWEEN 0 AND 1),
    employee_pension_rate numeric(6, 5) NOT NULL CHECK (employee_pension_rate BETWEEN 0 AND 1),
    employer_health_rate numeric(6, 5) NOT NULL CHECK (employer_health_rate BETWEEN 0 AND 1),
    employer_pension_rate numeric(6, 5) NOT NULL CHECK (employer_pension_rate BETWEEN 0 AND 1),
    family_compensation_rate numeric(6, 5) NOT NULL CHECK (family_compensation_rate BETWEEN 0 AND 1),
    sena_rate numeric(6, 5) NOT NULL CHECK (sena_rate BETWEEN 0 AND 1),
    icbf_rate numeric(6, 5) NOT NULL CHECK (icbf_rate BETWEEN 0 AND 1),
    severance_provision_rate numeric(6, 5) NOT NULL CHECK (severance_provision_rate BETWEEN 0 AND 1),
    severance_interest_rate numeric(6, 5) NOT NULL CHECK (severance_interest_rate BETWEEN 0 AND 1),
    service_bonus_rate numeric(6, 5) NOT NULL CHECK (service_bonus_rate BETWEEN 0 AND 1),
    vacation_provision_rate numeric(6, 5) NOT NULL CHECK (vacation_provision_rate BETWEEN 0 AND 1),
    target_net_margin numeric(6, 5) NOT NULL CHECK (target_net_margin BETWEEN 0 AND 1),
    minimum_cash_reserve numeric(14, 2) NOT NULL CHECK (minimum_cash_reserve >= 0),
    monthly_billable_hours_per_professional numeric(8, 2) NOT NULL CHECK (monthly_billable_hours_per_professional > 0),
    professional_count integer NOT NULL CHECK (professional_count > 0),
    annual_client_growth numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_client_growth > -1),
    scenario_conservative_revenue_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_conservative_revenue_adjustment > -1 AND scenario_conservative_revenue_adjustment <= 10),
    scenario_conservative_direct_cost_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_conservative_direct_cost_adjustment > -1 AND scenario_conservative_direct_cost_adjustment <= 10),
    scenario_conservative_expense_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_conservative_expense_adjustment > -1 AND scenario_conservative_expense_adjustment <= 10),
    scenario_base_revenue_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_base_revenue_adjustment > -1 AND scenario_base_revenue_adjustment <= 10),
    scenario_base_direct_cost_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_base_direct_cost_adjustment > -1 AND scenario_base_direct_cost_adjustment <= 10),
    scenario_base_expense_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_base_expense_adjustment > -1 AND scenario_base_expense_adjustment <= 10),
    scenario_optimistic_revenue_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_optimistic_revenue_adjustment > -1 AND scenario_optimistic_revenue_adjustment <= 10),
    scenario_optimistic_direct_cost_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_optimistic_direct_cost_adjustment > -1 AND scenario_optimistic_direct_cost_adjustment <= 10),
    scenario_optimistic_expense_adjustment numeric(8, 5) NOT NULL DEFAULT 0 CHECK (scenario_optimistic_expense_adjustment > -1 AND scenario_optimistic_expense_adjustment <= 10),
    annual_salary_increase numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_salary_increase > -1),
    annual_rent_increase numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_rent_increase > -1),
    annual_utilities_increase numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_utilities_increase > -1),
    annual_advertising_increase numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_advertising_increase > -1),
    annual_inflation numeric(8, 5) NOT NULL DEFAULT 0 CHECK (annual_inflation > -1),
    discount_rate numeric(8, 5) NOT NULL DEFAULT 0 CHECK (discount_rate > -1),
    office_rent_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_rent_monthly >= 0),
    office_utilities_monthly numeric(14, 2) NOT NULL DEFAULT 300000 CHECK (office_utilities_monthly >= 0),
    office_internet_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_internet_monthly >= 0),
    office_cleaning_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_cleaning_monthly >= 0),
    office_cafeteria_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_cafeteria_monthly >= 0),
    office_stationery_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_stationery_monthly >= 0),
    office_maintenance_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_maintenance_monthly >= 0),
    office_software_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_software_monthly >= 0),
    office_security_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_security_monthly >= 0),
    office_other_monthly numeric(14, 2) NOT NULL DEFAULT 0 CHECK (office_other_monthly >= 0),
    projected_admin_salary numeric(14, 2) NOT NULL DEFAULT 0 CHECK (projected_admin_salary >= 0),
    projected_admin_transport numeric(14, 2) NOT NULL DEFAULT 0 CHECK (projected_admin_transport >= 0),
    projected_cleaning_salary numeric(14, 2) NOT NULL DEFAULT 0 CHECK (projected_cleaning_salary >= 0),
    projected_cleaning_transport numeric(14, 2) NOT NULL DEFAULT 0 CHECK (projected_cleaning_transport >= 0),
    advertising_year_1 numeric(14, 2) NOT NULL DEFAULT 0 CHECK (advertising_year_1 >= 0),
    advertising_year_2 numeric(14, 2) NOT NULL DEFAULT 0 CHECK (advertising_year_2 >= 0),
    advertising_year_3 numeric(14, 2) NOT NULL DEFAULT 0 CHECK (advertising_year_3 >= 0),
    opening_other_current_assets numeric(14, 2) NOT NULL DEFAULT 0 CHECK (opening_other_current_assets >= 0),
    opening_noncurrent_assets numeric(14, 2) NOT NULL DEFAULT 0 CHECK (opening_noncurrent_assets >= 0),
    opening_current_liabilities numeric(14, 2) NOT NULL DEFAULT 0 CHECK (opening_current_liabilities >= 0),
    opening_long_term_liabilities numeric(14, 2) NOT NULL DEFAULT 0 CHECK (opening_long_term_liabilities >= 0),
    opening_equity numeric(14, 2) NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_seed_status (
    seed_name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW service_costs_calculated AS
SELECT sc.*,
       sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service AS unit_direct_cost,
       sc.services_served * (sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service) AS total_direct_cost,
       sc.services_served * (sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service) + sc.other_monthly_costs AS budgeted_direct_cost
FROM service_costs sc;

CREATE OR REPLACE VIEW sales_calculated AS
SELECT s.*,
       c.name AS client_name,
       sp.service_name,
       s.quantity * s.unit_fee AS gross_fees,
       s.quantity * s.unit_fee * s.discount_rate AS discounts,
       s.quantity * s.unit_fee * (1 - s.discount_rate) * s.refund_rate AS refunds,
       s.quantity * s.unit_fee * (1 - s.discount_rate) * (1 - s.refund_rate) AS net_revenue,
       COALESCE(costs.unit_direct_cost, 0) AS unit_direct_cost,
       s.quantity * COALESCE(costs.unit_direct_cost, 0) AS total_direct_cost,
       s.quantity * s.unit_fee * (1 - s.discount_rate) * (1 - s.refund_rate)
           - s.quantity * COALESCE(costs.unit_direct_cost, 0) AS contribution_margin,
       s.quantity * s.unit_fee * (1 - s.discount_rate) * (1 - s.refund_rate) * s.cash_rate AS cash_receipts,
       s.quantity * s.unit_fee * (1 - s.discount_rate) * (1 - s.refund_rate) * (1 - s.cash_rate) AS credit_receipts
FROM sales s
JOIN clients c ON c.client_nit = s.client_nit
JOIN service_prices sp ON sp.service_code = s.service_code
LEFT JOIN LATERAL (
    SELECT COALESCE(
        (SELECT SUM(sc.unit_direct_cost)
         FROM service_costs_calculated sc
         WHERE sc.service_code = s.service_code
           AND sc.period = CASE EXTRACT(MONTH FROM s.sale_date)::int
               WHEN 1 THEN 'Enero'
               WHEN 2 THEN 'Febrero'
               WHEN 3 THEN 'Marzo'
               WHEN 4 THEN 'Abril'
               WHEN 5 THEN 'Mayo'
               WHEN 6 THEN 'Junio'
               WHEN 7 THEN 'Julio'
               WHEN 8 THEN 'Agosto'
               WHEN 9 THEN 'Septiembre'
               WHEN 10 THEN 'Octubre'
               WHEN 11 THEN 'Noviembre'
               WHEN 12 THEN 'Diciembre'
           END),
        (SELECT SUM(sc.unit_direct_cost)
         FROM service_costs_calculated sc
         WHERE sc.service_code = s.service_code
           AND sc.period = 'Anual')
    ) AS unit_direct_cost
) costs ON true;

CREATE OR REPLACE VIEW expenses_calculated AS
SELECT e.*,
       CASE WHEN e.annual_frequency IS NULL OR e.annual_frequency = 0
            THEN e.budget_amount
            ELSE e.budget_amount * e.annual_frequency / 12
       END AS monthly_equivalent
FROM expenses e;

CREATE OR REPLACE VIEW payroll_calculated AS
SELECT p.*,
       p.monthly_salary * p.days_worked / 30 AS period_salary,
       p.monthly_transport_allowance * p.days_worked / 30 AS period_transport,
       p.monthly_salary * p.days_worked / 30 AS contribution_base,
       p.monthly_salary * p.days_worked / 30 * cs.employee_health_rate AS employee_health,
       p.monthly_salary * p.days_worked / 30 * cs.employee_pension_rate AS employee_pension,
       p.monthly_salary * p.days_worked / 30 + p.monthly_transport_allowance * p.days_worked / 30
           - p.monthly_salary * p.days_worked / 30 * (cs.employee_health_rate + cs.employee_pension_rate) AS estimated_net,
       p.monthly_salary * p.days_worked / 30 * cs.employer_health_rate AS employer_health,
       p.monthly_salary * p.days_worked / 30 * cs.employer_pension_rate AS employer_pension,
       p.monthly_salary * p.days_worked / 30 * p.arl_rate AS employer_arl,
       p.monthly_salary * p.days_worked / 30 * cs.family_compensation_rate AS family_compensation,
       p.monthly_salary * p.days_worked / 30 * cs.sena_rate AS sena,
       p.monthly_salary * p.days_worked / 30 * cs.icbf_rate AS icbf,
       ROUND((p.monthly_salary * p.days_worked / 30 + p.monthly_transport_allowance * p.days_worked / 30)
           * (cs.severance_provision_rate + cs.severance_interest_rate + cs.service_bonus_rate + cs.vacation_provision_rate), 0) AS benefits_provision,
       p.monthly_salary * p.days_worked / 30 + p.monthly_transport_allowance * p.days_worked / 30
           + p.monthly_salary * p.days_worked / 30
             * (cs.employer_health_rate + cs.employer_pension_rate + p.arl_rate
                + cs.family_compensation_rate + cs.sena_rate + cs.icbf_rate)
           + ROUND((p.monthly_salary * p.days_worked / 30 + p.monthly_transport_allowance * p.days_worked / 30)
               * (cs.severance_provision_rate + cs.severance_interest_rate + cs.service_bonus_rate + cs.vacation_provision_rate), 0) AS total_employer_cost
FROM payroll p
LEFT JOIN company_settings cs ON cs.id = true;

CREATE OR REPLACE VIEW investments_financing_calculated AS
SELECT i.*,
       CASE WHEN i.transaction_type IN ('Activo fijo', 'Activo intangible')
                  AND i.useful_life_years IS NOT NULL
            THEN GREATEST(0, (i.amount - i.residual_value) / (i.useful_life_years * 12))
            ELSE 0
       END AS monthly_depreciation
FROM investments_financing i;

CREATE OR REPLACE VIEW budget_control_calculated AS
SELECT b.*,
       b.actual_amount - b.budget_amount AS variance_amount,
       CASE WHEN b.budget_amount = 0 THEN NULL
            ELSE (b.actual_amount - b.budget_amount) / b.budget_amount
       END AS variance_rate
FROM budget_control b;

CREATE OR REPLACE VIEW tax_obligations_calculated AS
SELECT t.*,
       t.taxable_base * t.rate AS tax_amount,
       t.taxable_base * t.rate - t.paid_amount AS balance
FROM tax_obligations t;

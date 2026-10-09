DROP VIEW IF EXISTS sales_calculated CASCADE;
DROP VIEW IF EXISTS service_costs_calculated CASCADE;
DROP VIEW IF EXISTS expenses_calculated CASCADE;
DROP VIEW IF EXISTS payroll_calculated CASCADE;
DROP VIEW IF EXISTS investments_financing_calculated CASCADE;
DROP VIEW IF EXISTS budget_control_calculated CASCADE;
DROP VIEW IF EXISTS tax_obligations_calculated CASCADE;

CREATE OR REPLACE VIEW service_costs_calculated WITH (security_invoker = true) AS
SELECT sc.*,
       sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service AS unit_direct_cost,
       sc.services_served * (sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service) AS total_direct_cost,
       sc.services_served * (sc.materials_per_service + sc.external_fees_per_service + sc.other_direct_per_service) + sc.other_monthly_costs AS budgeted_direct_cost
FROM service_costs sc;

CREATE OR REPLACE VIEW sales_calculated WITH (security_invoker = true) AS
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
JOIN clients c ON c.company_id = s.company_id AND c.client_nit = s.client_nit
JOIN service_prices sp ON sp.company_id = s.company_id AND sp.service_code = s.service_code
LEFT JOIN LATERAL (
    SELECT COALESCE(
        (SELECT SUM(sc.unit_direct_cost)
         FROM service_costs_calculated sc
         WHERE sc.company_id = s.company_id
           AND sc.service_code = s.service_code
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
         WHERE sc.company_id = s.company_id
           AND sc.service_code = s.service_code
           AND sc.period = 'Anual')
    ) AS unit_direct_cost
) costs ON true;

CREATE OR REPLACE VIEW expenses_calculated WITH (security_invoker = true) AS
SELECT e.*,
       CASE WHEN e.annual_frequency IS NULL OR e.annual_frequency = 0
            THEN e.budget_amount
            ELSE e.budget_amount * e.annual_frequency / 12
       END AS monthly_equivalent
FROM expenses e;

CREATE OR REPLACE VIEW payroll_calculated WITH (security_invoker = true) AS
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
LEFT JOIN company_settings cs ON cs.company_id = p.company_id;

CREATE OR REPLACE VIEW investments_financing_calculated WITH (security_invoker = true) AS
SELECT i.*,
       CASE WHEN i.transaction_type IN ('Activo fijo', 'Activo intangible')
                  AND i.useful_life_years IS NOT NULL
            THEN GREATEST(0, (i.amount - i.residual_value) / (i.useful_life_years * 12))
            ELSE 0
       END AS monthly_depreciation
FROM investments_financing i;

CREATE OR REPLACE VIEW budget_control_calculated WITH (security_invoker = true) AS
SELECT b.*,
       b.actual_amount - b.budget_amount AS variance_amount,
       CASE WHEN b.budget_amount = 0 THEN NULL
            ELSE (b.actual_amount - b.budget_amount) / b.budget_amount
       END AS variance_rate
FROM budget_control b;

CREATE OR REPLACE VIEW tax_obligations_calculated WITH (security_invoker = true) AS
SELECT t.*,
       t.taxable_base * t.rate AS tax_amount,
       t.taxable_base * t.rate - t.paid_amount AS balance
FROM tax_obligations t;

GRANT SELECT ON service_costs_calculated, sales_calculated, expenses_calculated,
    payroll_calculated, investments_financing_calculated, budget_control_calculated,
    tax_obligations_calculated TO rda_tenant_runtime;

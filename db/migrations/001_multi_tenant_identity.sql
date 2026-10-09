CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id text PRIMARY KEY,
    label text NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id text PRIMARY KEY,
    label text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    tax_id text NOT NULL UNIQUE,
    representative text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    municipality text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_tax_id_lower_idx ON companies(lower(tax_id));

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    is_super_admin boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_memberships (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id text NOT NULL REFERENCES roles(id),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS company_memberships_company_idx ON company_memberships(company_id, active);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id uuid PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '',
    monthly_price numeric(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
    features jsonb NOT NULL DEFAULT '[]'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_licenses (
    id uuid PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES subscription_plans(id),
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'expired')),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO roles (id, label) VALUES
    ('super_admin', 'Super Administrador'),
    ('company_admin', 'Administrador de empresa'),
    ('accountant', 'Contador'),
    ('financial_advisor', 'Asesor Financiero'),
    ('admin_assistant', 'Auxiliar Administrativo')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO permissions (id, label) VALUES
    ('companies:read', 'Consultar empresas'),
    ('companies:manage', 'Administrar empresas'),
    ('users:read', 'Consultar usuarios'),
    ('users:manage', 'Administrar usuarios de empresa'),
    ('licenses:manage', 'Administrar licencias y planes'),
    ('settings:read', 'Consultar parámetros de empresa'),
    ('settings:manage', 'Modificar parámetros de empresa'),
    ('excel:import', 'Importar Excel'),
    ('catalogs:manage', 'Administrar catálogos'),
    ('reports:read', 'Consultar informes'),
    ('financial-reports:read', 'Consultar informes financieros detallados'),
    ('reports:download', 'Descargar informes'),
    ('scenarios:manage', 'Administrar escenarios'),
    ('clients:read', 'Consultar clientes'),
    ('clients:write', 'Administrar clientes'),
    ('clients:delete', 'Eliminar clientes'),
    ('service-prices:read', 'Consultar servicios'),
    ('service-prices:write', 'Administrar servicios'),
    ('service-prices:delete', 'Eliminar servicios'),
    ('sales:read', 'Consultar ventas'),
    ('sales:write', 'Registrar y corregir ventas'),
    ('sales:delete', 'Eliminar ventas'),
    ('expenses:read', 'Consultar gastos'),
    ('expenses:write', 'Registrar y corregir gastos'),
    ('expenses:delete', 'Eliminar gastos'),
    ('payroll:read', 'Consultar nómina'),
    ('payroll:write', 'Registrar y corregir nómina'),
    ('payroll:delete', 'Eliminar nómina'),
    ('tax-records:read', 'Consultar impuestos'),
    ('tax-records:write', 'Registrar y corregir impuestos'),
    ('tax-records:delete', 'Eliminar impuestos'),
    ('direct-costs:read', 'Consultar costos de servicios'),
    ('direct-costs:write', 'Administrar costos de servicios'),
    ('direct-costs:delete', 'Eliminar costos de servicios'),
    ('budget-control:read', 'Consultar presupuestos'),
    ('budget-control:write', 'Administrar presupuestos'),
    ('budget-control:delete', 'Eliminar presupuestos'),
    ('investments-financing:read', 'Consultar inversiones'),
    ('investments-financing:write', 'Administrar inversiones'),
    ('investments-financing:delete', 'Eliminar inversiones')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'company_admin', id FROM permissions
WHERE id NOT IN ('companies:manage', 'licenses:manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('accountant', 'reports:read'), ('accountant', 'reports:download'),
    ('accountant', 'financial-reports:read'),
    ('accountant', 'sales:read'), ('accountant', 'sales:write'),
    ('accountant', 'expenses:read'), ('accountant', 'expenses:write'),
    ('accountant', 'payroll:read'), ('accountant', 'payroll:write'),
    ('accountant', 'tax-records:read'), ('accountant', 'tax-records:write'),
    ('accountant', 'direct-costs:read'), ('accountant', 'budget-control:read'),
    ('accountant', 'investments-financing:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'financial_advisor', id FROM permissions
WHERE id IN ('reports:read', 'reports:download', 'scenarios:manage',
             'financial-reports:read',
             'clients:read', 'service-prices:read', 'sales:read', 'expenses:read',
             'payroll:read', 'tax-records:read', 'direct-costs:read',
             'budget-control:read', 'investments-financing:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('admin_assistant', 'reports:read'), ('admin_assistant', 'clients:read'),
    ('admin_assistant', 'clients:write'), ('admin_assistant', 'service-prices:read'),
    ('admin_assistant', 'service-prices:write'), ('admin_assistant', 'sales:read'),
    ('admin_assistant', 'sales:write')
ON CONFLICT DO NOTHING;

INSERT INTO companies (id, name, tax_id, municipality)
SELECT '00000000-0000-4000-8000-000000000001'::uuid,
       cs.company_name, cs.tax_id, cs.municipality
FROM company_settings cs
WHERE cs.id = true
  AND NOT EXISTS (SELECT 1 FROM companies);

INSERT INTO companies (id, name, tax_id)
SELECT '00000000-0000-4000-8000-000000000001'::uuid,
       'Empresa inicial', 'PENDIENTE-' || substr(md5(clock_timestamp()::text), 1, 12)
WHERE NOT EXISTS (SELECT 1 FROM companies);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE service_costs ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE investments_financing ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE budget_control ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE tax_obligations ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE catalog_options ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE clients SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE service_prices SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE service_costs SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE sales SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE expenses SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE payroll SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE investments_financing SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE budget_control SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE tax_obligations SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE catalog_options SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;
UPDATE company_settings SET company_id = (SELECT id FROM companies ORDER BY created_at, id LIMIT 1) WHERE company_id IS NULL;

DO $$
DECLARE
    table_name text;
    constraint_name text;
BEGIN
    FOR table_name IN
        SELECT unnest(ARRAY['clients', 'service_prices', 'service_costs', 'sales', 'expenses',
                            'payroll', 'investments_financing', 'budget_control', 'tax_obligations',
                            'catalog_options', 'company_settings'])
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', table_name);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES companies(id)', table_name, table_name || '_company_id_fkey');
    END LOOP;

    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_client_nit_fkey;
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_service_code_fkey;
    ALTER TABLE service_costs DROP CONSTRAINT IF EXISTS service_costs_service_code_fkey;

    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pkey;
    ALTER TABLE clients ADD CONSTRAINT clients_pkey PRIMARY KEY (company_id, client_nit);
    ALTER TABLE service_prices DROP CONSTRAINT IF EXISTS service_prices_pkey;
    ALTER TABLE service_prices ADD CONSTRAINT service_prices_pkey PRIMARY KEY (company_id, service_code);

    ALTER TABLE catalog_options DROP CONSTRAINT IF EXISTS catalog_options_category_label_key;
    ALTER TABLE catalog_options ADD CONSTRAINT catalog_options_company_category_label_key UNIQUE (company_id, category, label);

    ALTER TABLE company_settings DROP CONSTRAINT IF EXISTS company_settings_pkey;
    ALTER TABLE company_settings ADD CONSTRAINT company_settings_pkey PRIMARY KEY (company_id);

    ALTER TABLE service_costs ADD CONSTRAINT service_costs_company_service_fkey
        FOREIGN KEY (company_id, service_code) REFERENCES service_prices(company_id, service_code) ON UPDATE CASCADE;
    ALTER TABLE sales ADD CONSTRAINT sales_company_client_fkey
        FOREIGN KEY (company_id, client_nit) REFERENCES clients(company_id, client_nit) ON UPDATE CASCADE;
    ALTER TABLE sales ADD CONSTRAINT sales_company_service_fkey
        FOREIGN KEY (company_id, service_code) REFERENCES service_prices(company_id, service_code) ON UPDATE CASCADE;

    FOR table_name IN
        SELECT unnest(ARRAY['clients', 'service_prices', 'service_costs', 'sales', 'expenses',
                            'payroll', 'investments_financing', 'budget_control', 'tax_obligations',
                            'catalog_options', 'company_settings'])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
        constraint_name := table_name || '_tenant_isolation';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', constraint_name, table_name);
        EXECUTE format(
            'CREATE POLICY %I ON %I USING (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid) WITH CHECK (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid)',
            constraint_name, table_name
        );
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(company_id)', table_name || '_company_id_idx', table_name);
    END LOOP;

END $$;

INSERT INTO schema_migrations (name) VALUES ('001_multi_tenant_identity')
ON CONFLICT (name) DO NOTHING;

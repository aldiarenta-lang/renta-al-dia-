CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rda_tenant_runtime') THEN
        CREATE ROLE rda_tenant_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
    EXECUTE format('GRANT rda_tenant_runtime TO %I', current_user);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON clients, service_prices, service_costs, sales,
    expenses, payroll, investments_financing, budget_control, tax_obligations,
    catalog_options, company_settings TO rda_tenant_runtime;
GRANT SELECT ON companies, roles, permissions, role_permissions, company_memberships TO rda_tenant_runtime;
GRANT DELETE ON user_sessions TO rda_tenant_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rda_tenant_runtime;

INSERT INTO schema_migrations (name) VALUES ('002_restricted_runtime_role')
ON CONFLICT (name) DO NOTHING;

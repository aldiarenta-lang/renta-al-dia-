CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

GRANT UPDATE ON companies TO rda_tenant_runtime;

INSERT INTO schema_migrations (name) VALUES ('003_company_profile_permissions')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO permissions (id, label)
VALUES ('financial-reports:read', 'Consultar informes financieros detallados')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, 'financial-reports:read'
FROM role_permissions
WHERE role_id IN ('super_admin', 'company_admin', 'accountant', 'financial_advisor')
  AND permission_id = 'reports:read'
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('004_financial_report_permission')
ON CONFLICT (name) DO NOTHING;

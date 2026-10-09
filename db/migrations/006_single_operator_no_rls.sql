DO $$
DECLARE
    table_name text;
    policy_name text;
BEGIN
    FOR table_name IN
        SELECT unnest(ARRAY[
            'companies', 'company_settings', 'clients', 'service_prices', 'service_costs',
            'sales', 'expenses', 'payroll', 'investments_financing', 'budget_control',
            'tax_obligations', 'catalog_options'
        ])
    LOOP
        FOR policy_name IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = current_schema()
              AND tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY %I ON %I', policy_name, table_name);
        END LOOP;

        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END $$;

INSERT INTO schema_migrations (name) VALUES ('006_single_operator_no_rls')
ON CONFLICT (name) DO NOTHING;

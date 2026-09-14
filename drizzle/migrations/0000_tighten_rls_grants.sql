-- anon rolünün hiçbir politikası yok; erişimi kaldır
REVOKE ALL ON public.accounting_entries FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.bank_accounts FROM anon;
REVOKE ALL ON public.bank_imports FROM anon;
REVOKE ALL ON public.bank_statements FROM anon;
REVOKE ALL ON public.bank_transactions FROM anon;
REVOKE ALL ON public.banks FROM anon;
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.edm_invoice_lines FROM anon;
REVOKE ALL ON public.edm_invoices FROM anon;
REVOKE ALL ON public.integration_settings FROM anon;
REVOKE ALL ON public.invoices FROM anon;
REVOKE ALL ON public.user_data FROM anon;
REVOKE ALL ON public.user_prefs FROM anon;

-- public rol yerine authenticated'a bağlı politikalar
DROP POLICY IF EXISTS accounting_entries_own ON public.accounting_entries;
CREATE POLICY accounting_entries_own ON public.accounting_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customers_own ON public.customers;
CREATE POLICY customers_own ON public.customers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS invoices_own ON public.invoices;
CREATE POLICY invoices_own ON public.invoices
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sunucu tarafı işlemler için tam yetki garanti
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entries TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edm_invoice_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edm_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.accounting_entries, public.audit_logs, public.bank_accounts, public.bank_imports,
  public.bank_statements, public.bank_transactions, public.banks, public.customers,
  public.edm_invoice_lines, public.edm_invoices, public.integration_settings, public.invoices,
  public.user_data, public.user_prefs TO service_role;
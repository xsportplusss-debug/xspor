GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT ALL ON public.bank_statements TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entries TO authenticated;
GRANT ALL ON public.accounting_entries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT ALL ON public.banks TO service_role;
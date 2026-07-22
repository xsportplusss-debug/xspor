
-- Extend banks
ALTER TABLE public.banks
  ADD COLUMN IF NOT EXISTS account_no text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_statement_date date;

-- Extend bank_statements
ALTER TABLE public.bank_statements
  ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES public.banks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS tx_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS bank_statements_user_hash_uidx
  ON public.bank_statements(user_id, file_hash) WHERE file_hash IS NOT NULL;

-- Extend bank_transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS statement_id uuid REFERENCES public.bank_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS matched_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS matched_customer_id uuid;

CREATE INDEX IF NOT EXISTS bank_transactions_statement_idx ON public.bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS bank_transactions_user_date_idx ON public.bank_transactions(user_id, date DESC);

-- customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  tax_id text,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_own" ON public.customers;
CREATE POLICY "customers_own" ON public.customers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_no text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Ödeme Bekleniyor',
  invoice_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_own" ON public.invoices;
CREATE POLICY "invoices_own" ON public.invoices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- accounting_entries (kept even when statement file is deleted)
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid,
  entry_type text NOT NULL,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'bank_statement',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entries TO authenticated;
GRANT ALL ON public.accounting_entries TO service_role;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounting_entries_own" ON public.accounting_entries;
CREATE POLICY "accounting_entries_own" ON public.accounting_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS accounting_entries_user_date_idx ON public.accounting_entries(user_id, entry_date DESC);

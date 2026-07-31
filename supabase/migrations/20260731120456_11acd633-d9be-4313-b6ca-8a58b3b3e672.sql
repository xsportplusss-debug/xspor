
-- ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_id uuid NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  account_no text,
  iban text,
  account_name text,
  currency text NOT NULL DEFAULT 'TRY',
  last_balance numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts own" ON public.bank_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  description text,
  actor text,
  affected_count integer NOT NULL DEFAULT 0,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs own select" ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "audit_logs own insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx ON public.audit_logs (user_id, created_at DESC);

-- USER PREFS (son banka, filtreler, sıralama, ayarlar)
CREATE TABLE IF NOT EXISTS public.user_prefs (
  user_id uuid PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_prefs own" ON public.user_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_prefs_updated_at BEFORE UPDATE ON public.user_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SOFT DELETE (çöp kutusu)
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.bank_statements  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.banks            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.banks            ADD COLUMN IF NOT EXISTS bank_code text;
ALTER TABLE public.banks            ADD COLUMN IF NOT EXISTS parser text;
ALTER TABLE public.bank_statements  ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.bank_imports     ADD COLUMN IF NOT EXISTS file_hash text;
ALTER TABLE public.bank_imports     ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.bank_imports     ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.bank_imports     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- PERFORMANS INDEKSLERI
CREATE INDEX IF NOT EXISTS bank_tx_user_bank_date_idx ON public.bank_transactions (user_id, bank_id, date DESC);
CREATE INDEX IF NOT EXISTS bank_tx_live_idx ON public.bank_transactions (bank_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS bank_tx_statement_idx ON public.bank_transactions (statement_id);
CREATE INDEX IF NOT EXISTS bank_statements_user_idx ON public.bank_statements (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bank_accounts_bank_idx ON public.bank_accounts (bank_id) WHERE deleted_at IS NULL;

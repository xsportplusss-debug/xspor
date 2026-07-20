
-- ============ banks ============
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  iban TEXT,
  account_name TEXT,
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT ALL ON public.banks TO service_role;

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banks own select" ON public.banks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "banks own insert" ON public.banks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "banks own update" ON public.banks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "banks own delete" ON public.banks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX banks_user_idx ON public.banks(user_id);

-- ============ bank_imports ============
CREATE TABLE public.bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  parser TEXT,
  tx_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_imports TO authenticated;
GRANT ALL ON public.bank_imports TO service_role;

ALTER TABLE public.bank_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_imports own select" ON public.bank_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bank_imports own insert" ON public.bank_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_imports own update" ON public.bank_imports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_imports own delete" ON public.bank_imports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX bank_imports_bank_idx ON public.bank_imports(bank_id);
CREATE INDEX bank_imports_user_idx ON public.bank_imports(user_id);

-- ============ bank_transactions ============
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.bank_imports(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ref_no TEXT,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance NUMERIC(18,2),
  currency TEXT,
  source TEXT NOT NULL DEFAULT 'Manuel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_tx own select" ON public.bank_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bank_tx own insert" ON public.bank_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_tx own update" ON public.bank_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_tx own delete" ON public.bank_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX bank_tx_bank_idx ON public.bank_transactions(bank_id);
CREATE INDEX bank_tx_user_idx ON public.bank_transactions(user_id);
CREATE INDEX bank_tx_import_idx ON public.bank_transactions(import_id);
CREATE INDEX bank_tx_date_idx ON public.bank_transactions(date DESC);

-- Mükerrer koruması
CREATE UNIQUE INDEX bank_tx_dedup_idx ON public.bank_transactions
  (user_id, bank_id, date, description, debit, credit, COALESCE(ref_no, ''));

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER banks_set_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

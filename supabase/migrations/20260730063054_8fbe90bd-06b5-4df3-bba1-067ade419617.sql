ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS value_date date,
  ADD COLUMN IF NOT EXISTS tx_time text,
  ADD COLUMN IF NOT EXISTS doc_no text,
  ADD COLUMN IF NOT EXISTS operation text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS counterparty text,
  ADD COLUMN IF NOT EXISTS counterparty_iban text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS user_description text,
  ADD COLUMN IF NOT EXISTS raw jsonb,
  ADD COLUMN IF NOT EXISTS dedup_key text;

CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_dedup_uidx
  ON public.bank_transactions (user_id, bank_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS bank_transactions_bank_date_idx
  ON public.bank_transactions (bank_id, date DESC);

ALTER TABLE public.bank_statements
  ADD COLUMN IF NOT EXISTS total_debit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_credit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imported_by text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT ALL ON public.bank_statements TO service_role;
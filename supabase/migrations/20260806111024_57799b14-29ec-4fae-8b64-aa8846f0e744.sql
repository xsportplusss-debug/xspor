DROP INDEX IF EXISTS public.bank_transactions_dedup_uidx;

ALTER TABLE public.bank_transactions
  ADD CONSTRAINT bank_transactions_user_bank_dedup_key
  UNIQUE (user_id, bank_id, dedup_key);
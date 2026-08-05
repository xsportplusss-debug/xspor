ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS statement_date date;
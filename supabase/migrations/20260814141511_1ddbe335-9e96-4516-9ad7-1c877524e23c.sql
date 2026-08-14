CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'EDM',
  api_url text NOT NULL DEFAULT '',
  environment text NOT NULL DEFAULT 'test',
  username text NOT NULL DEFAULT '',
  encrypted_password text,
  vkn_tckn text,
  company_name text,
  gb_label text,
  pk_label text,
  company_code text,
  token text,
  session_id text,
  session_expires_at timestamptz,
  last_sync_at timestamptz,
  connection_status text NOT NULL DEFAULT 'disconnected',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

GRANT SELECT (id, user_id, provider, api_url, environment, username, vkn_tckn, company_name, gb_label, pk_label, company_code, last_sync_at, session_expires_at, connection_status, last_error, created_at, updated_at) ON public.integration_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_settings own" ON public.integration_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER integration_settings_updated_at BEFORE UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.edm_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'EDM',
  invoice_uuid text NOT NULL,
  invoice_number text,
  invoice_date date,
  invoice_type text,
  scenario text,
  direction text NOT NULL CHECK (direction IN ('IN','OUT')),
  seller_vkn text,
  seller_name text,
  buyer_vkn text,
  buyer_name text,
  tax_office text,
  currency text NOT NULL DEFAULT 'TRY',
  line_extension_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_base numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  payable_amount numeric NOT NULL DEFAULT 0,
  status text,
  gib_status_code text,
  gib_status_desc text,
  edm_status text,
  ubl_xml text,
  issued_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, invoice_uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.edm_invoices TO authenticated;
GRANT ALL ON public.edm_invoices TO service_role;
ALTER TABLE public.edm_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edm_invoices own" ON public.edm_invoices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER edm_invoices_updated_at BEFORE UPDATE ON public.edm_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX edm_invoices_user_dir_date ON public.edm_invoices (user_id, direction, invoice_date DESC);

CREATE TABLE public.edm_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.edm_invoices(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 0,
  name text,
  code text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  matched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, line_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.edm_invoice_lines TO authenticated;
GRANT ALL ON public.edm_invoice_lines TO service_role;
ALTER TABLE public.edm_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edm_invoice_lines own" ON public.edm_invoice_lines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX edm_invoice_lines_invoice ON public.edm_invoice_lines (invoice_id);
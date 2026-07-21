
CREATE TABLE public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT ALL ON public.bank_statements TO service_role;

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.bank_statements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.bank_statements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.bank_statements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.bank_statements FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bank_statements_set_updated_at
  BEFORE UPDATE ON public.bank_statements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for bank-statements bucket (files under {user_id}/...)
CREATE POLICY "bank-statements own select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bank-statements own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bank-statements own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bank-statements own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bank-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

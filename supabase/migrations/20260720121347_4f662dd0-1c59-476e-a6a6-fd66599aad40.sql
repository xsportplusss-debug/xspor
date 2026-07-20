
CREATE POLICY "bank_logos read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bank-logos');

CREATE POLICY "bank_logos own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bank_logos own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bank_logos own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bank-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

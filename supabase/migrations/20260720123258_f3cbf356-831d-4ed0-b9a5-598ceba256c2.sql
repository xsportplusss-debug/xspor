DROP POLICY IF EXISTS "bank_logos read authenticated" ON storage.objects;

CREATE POLICY "bank_logos read own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bank-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
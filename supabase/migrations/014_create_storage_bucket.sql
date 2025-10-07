-- Create storage bucket for listing images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow public read access
CREATE POLICY "Public read access" ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Create storage policy to allow service role to upload
CREATE POLICY "Service role upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'service_role');

-- Create storage policy to allow service role to delete
CREATE POLICY "Service role delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.role() = 'service_role');

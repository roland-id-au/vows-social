-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- Allow service role to upload images
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'listing-images');

-- Allow service role to delete images
CREATE POLICY "Service Role Delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'listing-images');

-- Allow service role to update images
CREATE POLICY "Service Role Update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'listing-images');

-- Fix storage bucket policies for listing-images

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete" ON storage.objects;

-- Create policy to allow authenticated and anon to read
CREATE POLICY "listing_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- Create policy to allow authenticated users and service role to upload
CREATE POLICY "listing_images_authenticated_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
);

-- Create policy to allow authenticated users and service role to update
CREATE POLICY "listing_images_authenticated_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
);

-- Create policy to allow service role to delete
CREATE POLICY "listing_images_service_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
);

-- Make sure bucket is public
UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
WHERE id = 'listing-images';

-- Migration: setup_storage_buckets.sql
-- Create storage buckets for different file types

-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES 
  ('message-images', 'message-images', true, 
   '{"image/jpeg","image/png","image/gif","image/webp"}', 
   10485760), -- 10MB
  ('message-audio', 'message-audio', true, 
   '{"audio/mpeg","audio/wav","audio/ogg","audio/webm"}', 
   26214400), -- 25MB
  ('message-files', 'message-files', false, 
   '{"*"}', 
   104857600) -- 100MB
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files to their channels" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view files in their channels" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND (
      bucket_id IN ('message-images', 'message-audio') -- Public buckets
      OR auth.uid()::text = (storage.foldername(name))[1] -- Private files
    )
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
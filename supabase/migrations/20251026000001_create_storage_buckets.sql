
-- Create storage buckets for production readiness
-- This creates the required avatars, company-logos, and recordings buckets

-- Create avatars bucket (public for viewing, authenticated for uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create company logos bucket (public for viewing, authenticated for uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos', 
  'company-logos', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create recordings bucket (private, authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings', 
  'recordings', 
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create RLS policies for company-logos bucket
CREATE POLICY "Anyone can view company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Company admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Company admins can update logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Company admins can delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-logos' 
    AND auth.role() = 'authenticated'
  );

-- Create RLS policies for recordings bucket
CREATE POLICY "Users can view recordings from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update recordings" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete recordings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );


-- Create storage buckets if they don't exist
DO $$
BEGIN
  -- Create avatars bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('avatars', 'User profile avatars', true, false);
  END IF;
  
  -- Create company-logos bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'company-logos') THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('company-logos', 'Company logo images', true, false);
  END IF;
  
  -- Create recordings bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'recordings') THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('recordings', 'Call recordings', true, false);
  END IF;
END $$;

-- Create storage policies for public access
-- Avatars bucket policies
CREATE POLICY "Public Access Avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
  
CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
  
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- Company logos bucket policies
CREATE POLICY "Public Access Company Logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');
  
CREATE POLICY "Company admins can upload company logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos' 
    AND EXISTS (
      SELECT 1 FROM public.companies 
      WHERE owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    )
  );
  
CREATE POLICY "Company admins can update company logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos' 
    AND EXISTS (
      SELECT 1 FROM public.companies 
      WHERE owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    )
  );

-- Recordings bucket policies
CREATE POLICY "Users can access their own recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' 
    AND EXISTS (
      SELECT 1 FROM public.calls 
      WHERE audio_url LIKE '%' || storage.objects.name || '%'
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can upload their own recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.uid() IS NOT NULL
  );

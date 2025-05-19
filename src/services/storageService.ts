
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Get bucket names from environment variables or use defaults
const LOGOS_BUCKET = import.meta.env.VITE_STORAGE_COMPANY_LOGOS_BUCKET || 'company-logos';
const RECORDINGS_BUCKET = import.meta.env.VITE_STORAGE_RECORDINGS_BUCKET || 'recordings';

export const uploadLogo = async (file: File): Promise<string | null> => {
  try {
    // Check if the bucket exists, if not create it with public access
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === LOGOS_BUCKET);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(LOGOS_BUCKET, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 2, // 2MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
      });
      
      if (createError) {
        console.error("Error creating logos bucket:", createError);
        toast.error("Failed to initialize storage for logos");
        return null;
      }
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      toast.error("Failed to upload logo");
      return null;
    }

    const { data } = supabase.storage
      .from(LOGOS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadLogo:", error);
    toast.error("Failed to upload logo");
    return null;
  }
};

// Get signed URL for audio files
export const getAudioUrl = async (companyId: string, audioKey: string): Promise<string | null> => {
  try {
    // If already a full URL, just return it
    if (audioKey && (audioKey.startsWith('http://') || audioKey.startsWith('https://'))) {
      return audioKey;
    }
    
    // If it's a relative path, get a public/signed URL
    if (audioKey) {
      // Check if the recordings bucket exists, create if not
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === RECORDINGS_BUCKET);
      
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(RECORDINGS_BUCKET, {
          public: false,
          fileSizeLimit: 1024 * 1024 * 50, // 50MB limit for audio files
          allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/webm']
        });
        
        if (createError) {
          console.error("Error creating recordings bucket:", createError);
          return null;
        }
      }
      
      const filePath = audioKey.includes('/') ? audioKey : `${companyId}/${audioKey}`;
      
      // First try to get a signed URL
      const { data, error } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour expiry
        
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      
      // If that fails, try getting a public URL as fallback
      const { data: publicData } = supabase.storage
        .from(RECORDINGS_BUCKET)
        .getPublicUrl(filePath);
        
      return publicData.publicUrl;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getAudioUrl:", error);
    return null;
  }
};

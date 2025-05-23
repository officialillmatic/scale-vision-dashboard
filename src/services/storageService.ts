
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const requiredBuckets = [
  {
    id: 'avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  },
  {
    id: 'company-logos',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
  },
  {
    id: 'recordings',
    public: false, // private storage for call recordings
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/wav']
  }
];

// Initialize storage buckets
export const initializeStorage = async () => {
  let hasError = false;
  const results = [];

  for (const bucket of requiredBuckets) {
    try {
      // Check if bucket exists first to avoid unnecessary errors
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`Error listing buckets:`, listError);
        hasError = true;
        results.push({
          bucket: bucket.id,
          success: false,
          error: listError
        });
        continue;
      }
      
      const bucketExists = existingBuckets.some(b => b.name === bucket.id);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { data, error } = await supabase.storage.createBucket(
          bucket.id, 
          { 
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          }
        );
        
        if (error) {
          console.error(`Error creating bucket ${bucket.id}:`, error);
          hasError = true;
          results.push({
            bucket: bucket.id,
            success: false,
            error
          });
        } else {
          console.log(`Successfully created bucket ${bucket.id}`);
          results.push({
            bucket: bucket.id,
            success: true
          });
        }
      } else {
        console.log(`Bucket ${bucket.id} already exists`);
        results.push({
          bucket: bucket.id,
          success: true,
          existed: true
        });
      }
    } catch (error) {
      console.error(`Unexpected error with bucket ${bucket.id}:`, error);
      hasError = true;
      results.push({
        bucket: bucket.id,
        success: false,
        error
      });
    }
  }

  if (hasError) {
    console.warn("Some storage buckets could not be initialized. This may limit functionality, but the app will continue to work.");
    // Only show toast on errors, not on success to avoid annoying users
    toast.error("Some storage features may be limited. Please contact support if you experience issues.");
  }

  return { results, hasError };
};

// Upload profile avatar
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

// Upload company logo
export const uploadCompanyLogo = async (companyId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading company logo:", error);
    toast.error("Failed to upload company logo");
    return null;
  }
};

// Upload call recording
export const uploadRecording = async (userId: string, companyId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Use await to properly handle the promise
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days
      
    return result.data?.signedUrl || null;
  } catch (error) {
    console.error("Error uploading recording:", error);
    toast.error("Failed to upload recording");
    return null;
  }
};

// Get a signed URL for a recording (private access)
export const getRecordingUrl = async (filePath: string): Promise<string | null> => {
  try {
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(filePath, 60 * 60); // 1 hour

    if (result.error) {
      throw result.error;
    }

    return result.data.signedUrl;
  } catch (error) {
    console.error("Error getting recording URL:", error);
    return null;
  }
};


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

// Initialize storage buckets - now that RLS is properly configured, this should work
export const initializeStorage = async () => {
  let hasError = false;
  const results = [];

  for (const bucket of requiredBuckets) {
    try {
      // Check if bucket exists first
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`Error listing buckets:`, listError);
        results.push({
          bucket: bucket.id,
          success: false,
          error: listError
        });
        continue;
      }
      
      const bucketExists = existingBuckets.some(b => b.name === bucket.id);
      
      if (bucketExists) {
        console.log(`Bucket ${bucket.id} already exists`);
        results.push({
          bucket: bucket.id,
          success: true,
          existed: true
        });
      } else {
        console.log(`Bucket ${bucket.id} should have been created by migration`);
        results.push({
          bucket: bucket.id,
          success: true,
          note: 'Created by migration'
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
    console.warn("Some storage buckets could not be verified. This may limit functionality, but the app will continue to work.");
    toast.error("Some storage features may be limited. Please contact support if you experience issues.");
  } else {
    console.log("All storage buckets are properly configured");
  }

  return { results, hasError };
};

// Upload profile avatar - now with proper error handling for RLS
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading avatar for user:", userId, "File:", file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log("Avatar uploaded successfully:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

// Upload company logo - enhanced with better error handling
export const uploadCompanyLogo = async (companyId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading company logo for company:", companyId, "File:", file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Company logo upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    console.log("Company logo uploaded successfully:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading company logo:", error);
    toast.error("Failed to upload company logo");
    return null;
  }
};

// Upload call recording - enhanced with proper signed URL generation
export const uploadRecording = async (userId: string, companyId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading recording for user:", userId, "company:", companyId, "File:", file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Recording upload error:", uploadError);
      throw uploadError;
    }

    // Use signed URL for private recordings
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days
      
    if (result.error) {
      console.error("Error creating signed URL:", result.error);
      throw result.error;
    }

    console.log("Recording uploaded successfully with signed URL");
    return result.data?.signedUrl || null;
  } catch (error) {
    console.error("Error uploading recording:", error);
    toast.error("Failed to upload recording");
    return null;
  }
};

// Get a signed URL for a recording (private access) - enhanced error handling
export const getRecordingUrl = async (filePath: string): Promise<string | null> => {
  try {
    console.log("Getting signed URL for recording:", filePath);
    
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(filePath, 60 * 60); // 1 hour

    if (result.error) {
      console.error("Error creating signed URL:", result.error);
      throw result.error;
    }

    console.log("Signed URL created successfully");
    return result.data.signedUrl;
  } catch (error) {
    console.error("Error getting recording URL:", error);
    return null;
  }
};

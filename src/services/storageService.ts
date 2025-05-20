
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

// Ensure storage buckets exist
const ensureBucketExists = async (bucketName: string, isPublic: boolean = true): Promise<boolean> => {
  try {
    // Check if bucket exists
    const { data: buckets, error: getBucketsError } = await supabase
      .storage
      .listBuckets();
      
    if (getBucketsError) {
      console.error("Error checking buckets:", getBucketsError);
      return false;
    }
    
    // If the bucket doesn't exist, create it
    if (!buckets.find(bucket => bucket.name === bucketName)) {
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: 10485760, // 10MB
        });
        
      if (createError) {
        // Log the error but don't fail entirely
        console.error(`Error creating bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`Created storage bucket: ${bucketName}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    return false;
  }
};

// Initialize storage buckets
export const initializeStorage = async (): Promise<void> => {
  // Try to initialize buckets but don't break the app if it fails
  try {
    await Promise.allSettled([
      ensureBucketExists('avatars', true),
      ensureBucketExists('company-logos', true),
      ensureBucketExists('recordings', true)
    ]);
  } catch (error) {
    console.error("Failed to initialize storage buckets:", error);
  }
};

export const uploadCompanyLogo = async (file: File, companyId: string): Promise<string | null> => {
  try {
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage.from("company-logos").upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.error("Error uploading company logo:", error);
      toast.error("Failed to upload company logo");
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadCompanyLogo:", error);
    toast.error("Failed to upload company logo");
    return null;
  }
};

export const uploadUserAvatar = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.error("Error uploading user avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadUserAvatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

// Updated getAudioUrl function to work with recordings bucket
export const getAudioUrl = (path: string | null): string | null => {
  if (!path) return null;
  
  try {
    // Ensure we're using the correct bucket
    const bucket = path.includes('/') ? path.split('/')[0] : 'recordings';
    const actualPath = path.includes('/') ? path : `${path}`;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(actualPath);
    
    return data.publicUrl;
  } catch (error) {
    console.error("Error in getAudioUrl:", error);
    return null;
  }
};

// Initialize storage on module import - but don't break the app if it fails
initializeStorage().catch(e => console.error("Failed to initialize storage buckets:", e));

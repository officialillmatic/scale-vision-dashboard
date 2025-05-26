
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Upload profile avatar with proper error handling
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading avatar for user:", userId, "File:", file.name);
    
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
      return null;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File too large. Please upload an image smaller than 5MB.");
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload avatar. Please try again.");
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log("Avatar uploaded successfully:", data.publicUrl);
    toast.success("Avatar uploaded successfully!");
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

// Upload company logo with enhanced error handling
export const uploadCompanyLogo = async (companyId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading company logo for company:", companyId, "File:", file.name);
    
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.");
      return null;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for company logos
      toast.error("File too large. Please upload an image smaller than 10MB.");
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Company logo upload error:", uploadError);
      toast.error("Failed to upload company logo. Please try again.");
      return null;
    }

    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath);

    console.log("Company logo uploaded successfully:", data.publicUrl);
    toast.success("Company logo uploaded successfully!");
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading company logo:", error);
    toast.error("Failed to upload company logo");
    return null;
  }
};

// Upload call recording with proper signed URL generation
export const uploadRecording = async (userId: string, companyId: string, file: File): Promise<string | null> => {
  try {
    console.log("Uploading recording for user:", userId, "company:", companyId, "File:", file.name);
    
    // Validate file type and size
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload an audio file (MP3, MP4, WAV, WebM, OGG).");
      return null;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit for recordings
      toast.error("File too large. Please upload an audio file smaller than 100MB.");
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Recording upload error:", uploadError);
      toast.error("Failed to upload recording. Please try again.");
      return null;
    }

    // Use signed URL for private recordings
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days
      
    if (result.error) {
      console.error("Error creating signed URL:", result.error);
      toast.error("Failed to generate access URL for recording.");
      return null;
    }

    console.log("Recording uploaded successfully with signed URL");
    toast.success("Recording uploaded successfully!");
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
    console.log("Getting signed URL for recording:", filePath);
    
    const result = await supabase.storage
      .from('recordings')
      .createSignedUrl(filePath, 60 * 60); // 1 hour

    if (result.error) {
      console.error("Error creating signed URL:", result.error);
      return null;
    }

    console.log("Signed URL created successfully");
    return result.data.signedUrl;
  } catch (error) {
    console.error("Error getting recording URL:", error);
    return null;
  }
};

// Storage bucket validation
export const validateStorageBuckets = async (): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      return false;
    }
    
    const requiredBuckets = ['avatars', 'company-logos', 'recordings'];
    const existingBuckets = buckets.map(bucket => bucket.id);
    const missingBuckets = requiredBuckets.filter(bucket => !existingBuckets.includes(bucket));
    
    if (missingBuckets.length > 0) {
      console.warn("Missing storage buckets:", missingBuckets);
      toast.error("Some storage features may be unavailable. Please contact support.");
      return false;
    }
    
    console.log("All required storage buckets are available");
    return true;
  } catch (error) {
    console.error("Error validating storage buckets:", error);
    return false;
  }
};

// Delete file from storage
export const deleteFile = async (bucket: string, filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
      return false;
    }

    toast.success("File deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    toast.error("Failed to delete file");
    return false;
  }
};

// List files in a bucket (for admin purposes)
export const listFiles = async (bucket: string, folder?: string): Promise<any[] | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) {
      console.error("Error listing files:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error listing files:", error);
    return null;
  }
};

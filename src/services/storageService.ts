
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export const uploadCompanyLogo = async (file: File, companyId: string): Promise<string | null> => {
  try {
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${uuidv4()}.${fileExt}`;
    const filePath = `company_logos/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage.from("public").upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.error("Error uploading company logo:", error);
      toast.error("Failed to upload company logo");
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("public").getPublicUrl(filePath);
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
    const filePath = `avatars/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage.from("public").upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.error("Error uploading user avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("public").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadUserAvatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

// Alias for uploadCompanyLogo for backward compatibility
export const uploadLogo = async (file: File, companyId: string): Promise<string | null> => {
  return uploadCompanyLogo(file, companyId);
};

export const getAudioUrl = (path: string | null): string | null => {
  if (!path) return null;
  
  const { data } = supabase.storage.from("public").getPublicUrl(path);
  return data.publicUrl;
};

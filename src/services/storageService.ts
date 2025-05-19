
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadLogo = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recordings')  // Using the recordings bucket for now
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      toast.error("Failed to upload logo");
      return null;
    }

    const { data } = supabase.storage
      .from('recordings')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadLogo:", error);
    toast.error("Failed to upload logo");
    return null;
  }
};

// Add function to get signed URL for audio files
export const getAudioUrl = async (companyId: string, audioKey: string): Promise<string | null> => {
  try {
    // If already a full URL, just return it
    if (audioKey && (audioKey.startsWith('http://') || audioKey.startsWith('https://'))) {
      return audioKey;
    }
    
    // If it's a relative path, get a public/signed URL
    if (audioKey) {
      const filePath = audioKey.includes('/') ? audioKey : `${companyId}/${audioKey}`;
      
      const { data, error } = await supabase.storage
        .from('recordings')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
        
      if (error) {
        console.error("Error getting signed audio URL:", error);
        return null;
      }
      
      return data.signedUrl;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getAudioUrl:", error);
    return null;
  }
};

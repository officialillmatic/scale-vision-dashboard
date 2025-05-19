
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

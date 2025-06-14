import { debugLog } from "@/lib/debug";
import { toast } from "sonner";

// Upload profile avatar convertido a Base64 y guardado en la base de datos
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    debugLog("Converting avatar to Base64 for user:", userId, "File:", file.name);
    
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

    // Redimensionar imagen antes de convertir a Base64
    const resizedFile = await resizeImage(file, 300, 300);
    
    // Convert to Base64
    const base64String = await fileToBase64(resizedFile);
    
    debugLog("Avatar converted to Base64 successfully");
    toast.success("Avatar uploaded successfully!");
    
    // Retornamos el Base64 que se puede guardar directamente en la base de datos
    return base64String;
    
  } catch (error: any) {
    console.error("Error processing avatar:", error);
    toast.error(`Failed to upload avatar: ${error.message}`);
    return null;
  }
};

// Upload company logo convertido a Base64
export const uploadCompanyLogo = async (companyId: string, file: File): Promise<string | null> => {
  try {
    debugLog("Converting company logo to Base64 for company:", companyId, "File:", file.name);
    
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, SVG, or WebP image.");
      return null;
    }
    
    if (file.size > 6 * 1024 * 1024) { // 6MB limit
      toast.error("File too large. Please upload an image smaller than 6MB.");
      return null;
    }

    // Redimensionar imagen antes de convertir a Base64
    const resizedFile = await resizeImage(file, 512, 512);
    
    // Convert to Base64
    const base64String = await fileToBase64(resizedFile);
    
    debugLog("Company logo converted to Base64 successfully");
    toast.success("Company logo uploaded successfully!");
    
    return base64String;
    
  } catch (error: any) {
    console.error("Error processing company logo:", error);
    toast.error(`Failed to upload company logo: ${error.message}`);
    return null;
  }
};

// Upload call recording (mantenemos la funcionalidad existente si la necesitas)
export const uploadRecording = async (userId: string, companyId: string, file: File): Promise<string | null> => {
  try {
    debugLog("Note: Recording uploads still use Supabase Storage");
    toast.error("Recording uploads not yet converted to Base64. Contact support.");
    return null;
  } catch (error) {
    console.error("Error uploading recording:", error);
    toast.error("Failed to upload recording");
    return null;
  }
};

// Get a signed URL for a recording (placeholder)
export const getRecordingUrl = async (filePath: string): Promise<string | null> => {
  try {
    debugLog("Getting recording URL:", filePath);
    return null;
  } catch (error) {
    console.error("Error getting recording URL:", error);
    return null;
  }
};

// Storage bucket validation (no needed for Base64 but kept for compatibility)
export const validateStorageBuckets = async (): Promise<boolean> => {
  debugLog("Base64 storage doesn't require bucket validation");
  return true;
};

// Delete file from storage (for Base64, this would be removing from database)
export const deleteFile = async (bucket: string, filePath: string): Promise<boolean> => {
  try {
    debugLog("Base64 files are deleted by updating the database record");
    toast.success("File deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    toast.error("Failed to delete file");
    return false;
  }
};

// List files in a bucket (not applicable for Base64)
export const listFiles = async (bucket: string, folder?: string): Promise<any[] | null> => {
  try {
    debugLog("Base64 storage doesn't use file listing");
    return [];
  } catch (error) {
    console.error("Error listing files:", error);
    return null;
  }
};

// Utility function: Convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to Base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// Utility function: Resize image
const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob and then to File
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }
      }, file.type, 0.9);
    };

    img.src = URL.createObjectURL(file);
  });
};
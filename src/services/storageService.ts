import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Upload profile avatar with detailed debugging
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    console.log("=== AVATAR UPLOAD DEBUG START ===");
    console.log("User ID:", userId);
    console.log("File:", file.name, file.size, file.type);
    
    // Check if user is authenticated
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    console.log("Current authenticated user:", currentUser);
    console.log("Auth error:", authError);
    
    if (authError) {
      console.error("Authentication error:", authError);
      toast.error("Authentication error. Please log in again.");
      return null;
    }
    
    if (!currentUser) {
      console.error("No authenticated user found");
      toast.error("No authenticated user. Please log in.");
      return null;
    }
    
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log("Invalid file type:", file.type);
      toast.error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
      return null;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      console.log("File too large:", file.size);
      toast.error("File too large. Please upload an image smaller than 5MB.");
      return null;
    }
    
    console.log("✅ File validation passed");
    
    // Check if bucket exists and is accessible
    console.log("🔍 Checking bucket access...");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log("Available buckets:", buckets);
    console.log("Buckets error:", bucketsError);
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      toast.error("Storage access error. Check console for details.");
      return null;
    }
    
    const avatarBucket = buckets?.find(bucket => bucket.id === 'User Profile Avatars');
    console.log("Avatar bucket found:", avatarBucket);
    
    if (!avatarBucket) {
      console.error("Avatar bucket not found. Available buckets:", buckets?.map(b => b.id));
      toast.error("Avatar storage bucket not found.");
      return null;
    }
    
    // Test bucket permissions by trying to list files
    console.log("🔐 Testing bucket permissions...");
    const { data: listTest, error: listError } = await supabase.storage
      .from('User Profile Avatars')
      .list('', { limit: 1 });
    
    console.log("List test result:", listTest);
    console.log("List test error:", listError);
    
    // Create file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    console.log("📁 File path:", filePath);
    
    // Attempt upload
    console.log("📤 Starting upload...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('User Profile Avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    console.log("Upload data:", uploadData);
    console.log("Upload error:", uploadError);

    if (uploadError) {
      console.error("❌ Upload failed:");
      console.error("Error message:", uploadError.message);
      console.error("Error details:", uploadError);
      
      // Provide specific error messages
      if (uploadError.message.includes('permission')) {
        toast.error("Permission denied. Check RLS policies in Supabase.");
      } else if (uploadError.message.includes('quota')) {
        toast.error("Storage quota exceeded.");
      } else if (uploadError.message.includes('size')) {
        toast.error("File size limit exceeded.");
      } else {
        toast.error(`Upload failed: ${uploadError.message}`);
      }
      return null;
    }

    console.log("✅ Upload successful!");
    
    // Get public URL
    console.log("🔗 Getting public URL...");
    const { data: urlData } = supabase.storage
      .from('User Profile Avatars')
      .getPublicUrl(filePath);

    console.log("URL data:", urlData);

    if (!urlData.publicUrl) {
      console.error("❌ Failed to get public URL");
      toast.error("Failed to generate public URL for uploaded image.");
      return null;
    }

    console.log("✅ Public URL generated:", urlData.publicUrl);
    console.log("=== AVATAR UPLOAD DEBUG END ===");
    
    toast.success("Avatar uploaded successfully!");
    return urlData.publicUrl;
  } catch (error: any) {
    console.error("❌ Unexpected error in uploadAvatar:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    toast.error(`Unexpected error: ${error.message}`);
    return null;
  }
};
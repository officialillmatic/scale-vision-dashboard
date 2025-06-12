
import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, X, AlertTriangle } from "lucide-react";

export function ProfileAvatar() {
  const { user, updateUserProfile: updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user initials for the avatar fallback
  const getUserInitials = () => {
    if (!user) return "?";
    
    const name = user.user_metadata?.name || user.email || "";
    if (!name) return "?";
    
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Custom upload function with detailed debugging
  const uploadAvatarDebug = async (userId: string, file: File): Promise<string | null> => {
    try {
      setDebugInfo(`Starting upload - User: ${userId}, File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setDebugInfo(`❌ Invalid file type: ${file.type}`);
        toast({
          title: "Invalid file type", 
          description: "Please upload a JPEG, PNG, GIF, or WebP image.",
          variant: "destructive"
        });
        return null;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setDebugInfo(`❌ File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive"
        });
        return null;
      }
      
      setDebugInfo("✅ File validation passed");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      let filePath = `${userId}/${fileName}`; // Changed from const to let

      setDebugInfo(`📁 Uploading to path: ${filePath}`);

      // Check if bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        setDebugInfo(`❌ Error listing buckets: ${bucketsError.message}`);
        return null;
      }
      
      const avatarBucket = buckets.find(bucket => bucket.id === 'avatars');
      if (!avatarBucket) {
        setDebugInfo(`❌ 'avatars' bucket not found. Available buckets: ${buckets.map(b => b.id).join(', ')}`);
        toast({
          title: "Storage Error",
          description: "Avatar storage bucket not configured. Please contact support.",
          variant: "destructive"
        });
        return null;
      }
      
      setDebugInfo("✅ 'avatars' bucket found");

      // Try to upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // This will overwrite if file exists
        });

      if (uploadError) {
        setDebugInfo(`❌ Upload error: ${uploadError.message}`); // Removed .error property access
        console.error("Detailed upload error:", uploadError);
        
        // Handle specific error cases
        if (uploadError.message.includes('duplicate')) {
          setDebugInfo("🔄 File exists, trying with new name...");
          const newFileName = `${userId}-${Date.now()}.${fileExt}`;
          const newFilePath = `${userId}/${newFileName}`;
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from('avatars')
            .upload(newFilePath, file);
            
          if (retryError) {
            setDebugInfo(`❌ Retry failed: ${retryError.message}`);
            return null;
          } else {
            setDebugInfo(`✅ Retry successful: ${newFilePath}`);
            filePath = newFilePath; // Now this works since filePath is let
          }
        } else {
          return null;
        }
      } else {
        setDebugInfo(`✅ Upload successful: ${uploadData.path}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        setDebugInfo("❌ Failed to get public URL");
        return null;
      }

      setDebugInfo(`✅ Public URL generated: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error: any) {
      setDebugInfo(`❌ Unexpected error: ${error.message}`);
      console.error("Unexpected error:", error);
      return null;
    }
  };

  // Handle file upload with detailed debugging
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      setDebugInfo("❌ No file selected or no user found");
      return;
    }

    setIsUploading(true);
    setShowUploadOptions(false);
    setDebugInfo("🚀 Starting upload process...");
    
    try {
      const avatarUrl = await uploadAvatarDebug(user.id, file);
      
      if (avatarUrl) {
        setDebugInfo("📝 Updating user profile...");
        
        await updateProfile({ avatar_url: avatarUrl });
        
        setDebugInfo("✅ Profile updated successfully!");
        
        toast({
          title: "Avatar updated",
          description: "Your profile photo has been updated successfully",
        });
      } else {
        setDebugInfo("❌ Upload failed - no URL returned");
      }
    } catch (error: any) {
      setDebugInfo(`❌ Profile update error: ${error.message}`);
      console.error("Error in profile update:", error);
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUploading(true);
    setShowUploadOptions(false);
    setDebugInfo("🗑️ Removing avatar...");
    
    try {
      await updateProfile({ avatar_url: null });
      
      setDebugInfo("✅ Avatar removed successfully");
      
      toast({
        title: "Avatar removed",
        description: "Your profile photo has been removed",
      });
    } catch (error: any) {
      setDebugInfo(`❌ Error removing avatar: ${error.message}`);
      console.error("Error removing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    setDebugInfo("📂 Opening file dialog...");
    fileInputRef.current?.click();
    setShowUploadOptions(false);
  };

  const currentAvatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Debug info */}
      {debugInfo && (
        <div className="w-full max-w-md p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <div className="flex items-center space-x-1 mb-1">
            <AlertTriangle size={12} />
            <span className="font-medium">Debug Info:</span>
          </div>
          <div className="whitespace-pre-wrap break-words font-mono">{debugInfo}</div>
        </div>
      )}

      {/* Avatar principal */}
      <div className="relative group">
        <Avatar className="h-24 w-24">
          <AvatarImage 
            src={currentAvatarUrl} 
            alt={user?.user_metadata?.name || "User"} 
          />
          <AvatarFallback className="bg-brand-light-purple text-brand-purple text-xl">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}

        {/* Camera button */}
        <button
          onClick={() => {
            setDebugInfo("📷 Camera button clicked");
            setShowUploadOptions(!showUploadOptions);
          }}
          disabled={isUploading}
          className="absolute bottom-0 right-0 h-8 w-8 bg-brand-green text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-green/90 transition-colors disabled:opacity-50"
        >
          <Camera size={16} />
        </button>
      </div>

      {/* Upload options */}
      {showUploadOptions && !isUploading && (
        <div className="space-y-3 w-full max-w-sm">
          <div className="flex flex-col space-y-2">
            <Button
              onClick={openFileDialog}
              size="sm"
              className="flex items-center justify-center space-x-2"
            >
              <Upload size={16} />
              <span>Upload new photo</span>
            </Button>
            
            {currentAvatarUrl && (
              <Button
                onClick={handleRemoveAvatar}
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-2"
              >
                <X size={16} />
                <span>Remove photo</span>
              </Button>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              JPG, PNG, WebP • Max 5MB
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Help text */}
      {!showUploadOptions && !isUploading && (
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Click the camera icon to change your profile photo
        </p>
      )}

      {/* Supabase connection info */}
      <div className="w-full max-w-md p-2 bg-gray-50 border rounded text-xs text-gray-600">
        <div><strong>User ID:</strong> {user?.id || "Not found"}</div>
        <div><strong>Current Avatar:</strong> {currentAvatarUrl ? "Yes" : "No"}</div>
        <div><strong>Connected:</strong> {supabase ? "Yes" : "No"}</div>
      </div>
    </div>
  );
}

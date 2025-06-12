import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/services/storageService";
import { Camera, Upload, X } from "lucide-react";

export function ProfileAvatar() {
  const { user, updateUserProfile: updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
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

  // Handle file upload - simplified to work with the existing service
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setIsUploading(true);
    setShowUploadOptions(false);
    
    try {
      // The uploadAvatar service handles all validation and shows toasts
      const avatarUrl = await uploadAvatar(user.id, file);
      
      if (avatarUrl) {
        // Update user profile with new avatar URL
        await updateProfile({ avatar_url: avatarUrl });
        
        // Show success toast (the service already shows one, but this confirms the profile update)
        toast({
          title: "Profile updated",
          description: "Your profile photo has been updated successfully",
        });
      }
      // If avatarUrl is null, the service already showed an error toast
    } catch (error: any) {
      console.error("Error in profile update:", error);
      // Don't show toast here as the service already handles it
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
    
    try {
      await updateProfile({ avatar_url: null });
      
      toast({
        title: "Avatar removed",
        description: "Your profile photo has been removed",
      });
    } catch (error: any) {
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
    fileInputRef.current?.click();
    setShowUploadOptions(false);
  };

  const currentAvatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col items-center space-y-4">
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
          onClick={() => setShowUploadOptions(!showUploadOptions)}
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
    </div>
  );
}
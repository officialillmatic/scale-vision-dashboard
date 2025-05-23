
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/services/storageService";
import { updateUserProfile } from "@/services/userService";
import { Camera } from "lucide-react";

export function ProfileAvatar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
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
  
  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload avatar
      const avatarUrl = await uploadAvatar(user.id, file);
      
      if (avatarUrl) {
        // Update user profile with new avatar URL
        await updateUserProfile(user.id, { avatar_url: avatarUrl });
        
        toast({
          title: "Avatar updated",
          description: "Your profile photo has been updated successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to update your profile photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage 
          src={user?.user_metadata?.avatar_url} 
          alt={user?.user_metadata?.name || "User"} 
        />
        <AvatarFallback className="bg-brand-light-purple text-brand-purple text-xl">
          {getUserInitials()}
        </AvatarFallback>
      </Avatar>
      
      <div className="absolute bottom-0 right-0">
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <div className="h-8 w-8 bg-brand-green text-white rounded-full flex items-center justify-center shadow-md">
            <Camera size={16} />
          </div>
          <input 
            type="file" 
            id="avatar-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/services/storageService";
import { Camera, Upload, X, User, AlertTriangle } from "lucide-react";

export function ProfileAvatar() {
  const { user, updateUserProfile: updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de validación
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid format. Accepted: ${ACCEPTED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB allowed.`;
    }
    
    return null;
  };

  // Handle file upload with extensive debugging
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      setDebugInfo("No file selected or no user found");
      return;
    }

    setDebugInfo(`File selected: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}`);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setDebugInfo(`Validation failed: ${validationError}`);
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setShowUploadOptions(false);
    setDebugInfo("Starting upload process...");
    
    try {
      // Debug user info
      console.log("User ID:", user.id);
      console.log("User object:", user);
      
      setDebugInfo(`Uploading for user ID: ${user.id}`);
      
      // Upload avatar using the storage service
      const avatarUrl = await uploadAvatar(user.id, file);
      
      console.log("Upload result:", avatarUrl);
      setDebugInfo(`Upload completed. Avatar URL: ${avatarUrl}`);
      
      if (avatarUrl) {
        setDebugInfo("Updating user profile...");
        
        // Update user profile with new avatar URL
        await updateProfile({ avatar_url: avatarUrl });
        
        setDebugInfo("Profile updated successfully");
        
        toast({
          title: "Avatar updated",
          description: "Your profile photo has been updated successfully",
        });
      } else {
        throw new Error("Upload service returned null/undefined URL");
      }
    } catch (error: any) {
      console.error("Full error object:", error);
      console.error("Error stack:", error?.stack);
      
      const errorMessage = error?.message || "Unknown error occurred";
      setDebugInfo(`Error: ${errorMessage}`);
      
      toast({
        title: "Upload failed",
        description: `${errorMessage}. Check console for details.`,
        variant: "destructive",
      });
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
    setDebugInfo("Removing avatar...");
    
    try {
      await updateProfile({ avatar_url: null });
      
      setDebugInfo("Avatar removed successfully");
      
      toast({
        title: "Avatar removed",
        description: "Your profile photo has been removed",
      });
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      setDebugInfo(`Error removing avatar: ${error?.message}`);
      
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
    setDebugInfo("Opening file dialog...");
    fileInputRef.current?.click();
    setShowUploadOptions(false);
  };

  const currentAvatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Debug info */}
      {debugInfo && (
        <div className="w-full max-w-sm p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <div className="flex items-center space-x-1 mb-1">
            <AlertTriangle size={12} />
            <span className="font-medium">Debug Info:</span>
          </div>
          <div className="break-words">{debugInfo}</div>
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
            setDebugInfo("Camera button clicked");
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
        accept={ACCEPTED_TYPES.join(',')}
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

      {/* User debug info */}
      <div className="w-full max-w-sm p-2 bg-gray-50 border rounded text-xs text-gray-600">
        <div><strong>User ID:</strong> {user?.id || "Not found"}</div>
        <div><strong>Current Avatar:</strong> {currentAvatarUrl ? "Yes" : "No"}</div>
        <div><strong>User Name:</strong> {user?.user_metadata?.name || "Not set"}</div>
      </div>
    </div>
  );
}
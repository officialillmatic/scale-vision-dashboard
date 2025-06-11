import React, { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/services/storageService";
import { Camera, Upload, X, AlertCircle, User } from "lucide-react";

export function ProfileAvatar() {
  const { user, updateUserProfile: updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de validación
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Formato no válido. Se aceptan: ${ACCEPTED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `El archivo es demasiado grande. Máximo ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB permitido.`;
    }
    
    return null;
  }, []);

  const resizeImage = useCallback((file: File, size: number = 300): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Para avatares, siempre hacer crop cuadrado
        const minDimension = Math.min(img.width, img.height);
        const startX = (img.width - minDimension) / 2;
        const startY = (img.height - minDimension) / 2;

        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(
          img,
          startX, startY, minDimension, minDimension,
          0, 0, size, size
        );

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
  }, []);

  // Get user initials for the avatar fallback
  const getUserInitials = useCallback(() => {
    if (!user) return "?";
    
    const name = user.user_metadata?.name || user.email || "";
    if (!name) return "?";
    
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    // Validar archivo
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast({
        title: "Error de validación",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setShowUploadOptions(false);

    try {
      // Redimensionar imagen
      const processedFile = await resizeImage(file);
      
      // Crear preview
      const newPreviewUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(newPreviewUrl);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 100);

      // Upload avatar usando el storage service
      const avatarUrl = await uploadAvatar(user.id, processedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (avatarUrl) {
        // Update user profile con nueva avatar URL
        await updateProfile({ avatar_url: avatarUrl });
        
        toast({
          title: "Avatar actualizado",
          description: "Tu foto de perfil se ha actualizado exitosamente",
        });
        
        // Limpiar preview URL anterior si es diferente
        if (newPreviewUrl !== avatarUrl) {
          URL.revokeObjectURL(newPreviewUrl);
        }
        setPreviewUrl(avatarUrl);
      }
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setError(error.message || "Error al subir el avatar");
      toast({
        title: "Error de subida",
        description: error.message || "Error al actualizar tu foto de perfil",
        variant: "destructive",
      });
      
      // Restaurar preview anterior
      setPreviewUrl(user?.user_metadata?.avatar_url || null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Limpiar el input
    e.target.value = '';
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      setIsUploading(true);
      await updateProfile({ avatar_url: '' });
      setPreviewUrl(null);
      setShowUploadOptions(false);
      
      toast({
        title: "Avatar removido",
        description: "Tu foto de perfil ha sido removida",
      });
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast({
        title: "Error",
        description: "Error al remover la foto de perfil",
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

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar principal */}
      <div className="relative group">
        <Avatar className="h-24 w-24">
          <AvatarImage 
            src={previewUrl || undefined} 
            alt={user?.user_metadata?.name || "User"} 
          />
          <AvatarFallback className="bg-brand-light-purple text-brand-purple text-xl">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
              <div className="text-xs mt-1">{uploadProgress}%</div>
            </div>
          </div>
        )}

        {/* Botón de cámara */}
        <button
          onClick={() => setShowUploadOptions(!showUploadOptions)}
          disabled={isUploading}
          className="absolute bottom-0 right-0 h-8 w-8 bg-brand-green text-white rounded-full flex items-center justify-center shadow-md hover:bg-brand-green/90 transition-colors disabled:opacity-50"
        >
          <Camera size={16} />
        </button>
      </div>

      {/* Opciones de subida expandidas */}
      {showUploadOptions && (
        <div className="space-y-3 w-full max-w-sm">
          {/* Botones de acción */}
          <div className="flex space-x-2 justify-center">
            <Button
              onClick={openFileDialog}
              disabled={isUploading}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Upload size={16} />
              <span>Subir foto</span>
            </Button>
            
            {previewUrl && (
              <Button
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <X size={16} />
                <span>Remover</span>
              </Button>
            )}
          </div>

          {/* Zona de drag & drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
              ${dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <User className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 mb-1">
              {dragActive 
                ? 'Suelta la imagen aquí' 
                : 'Arrastra tu foto aquí'
              }
            </p>
            <p className="text-xs text-gray-500">
              JPG, PNG, WebP • Máximo 5MB
            </p>
          </div>
        </div>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm">
          <AlertCircle size={16} />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {/* Texto informativo */}
      {!showUploadOptions && (
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Haz clic en el ícono de cámara para cambiar tu foto de perfil
        </p>
      )}
    </div>
  );
}
import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { updateCompanyLogo } from '@/services/companyService';
import { uploadCompanyLogo } from '@/services/storageService';
import { toast } from 'sonner';
import { useRole } from '@/hooks/useRole';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { Upload, X, Building2, AlertCircle } from 'lucide-react';

interface CompanyLogoUploadProps {
  logoUrl: string | null;
  onLogoUpdate: (url: string) => void;
}

export function CompanyLogoUpload({ logoUrl, onLogoUpdate }: CompanyLogoUploadProps) {
  const { company, refreshCompany } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const { isCompanyOwner, can } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración de validación
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid format. Accepted: ${ACCEPTED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB allowed.`;
    }
    
    return null;
  }, []);

  const resizeImage = useCallback((file: File, maxWidth: number = 512, maxHeight: number = 512): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        
        // Calcular nuevas dimensiones manteniendo aspect ratio
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
        ctx.drawImage(img, 0, 0, width, height);

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

  const handleFileUpload = async (file: File) => {
    if (!company) return;

    // Validar archivo
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Redimensionar imagen si es necesario
      const processedFile = await resizeImage(file);
      
      // Crear preview
      const previewUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(previewUrl);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 100);

      // Upload logo usando el storage service
      const logoUrl = await uploadCompanyLogo(company.id, processedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (logoUrl) {
        // Update company record con la nueva logo URL
        const updated = await updateCompanyLogo(company.id, logoUrl);
        
        if (updated) {
          onLogoUpdate(logoUrl);
          await refreshCompany();
          toast.success("Company logo updated successfully");
          
          // Limpiar preview URL anterior
          if (previewUrl && previewUrl !== logoUrl) {
            URL.revokeObjectURL(previewUrl);
          }
        } else {
          throw new Error("Failed to update company record with logo URL");
        }
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      setError(error.message || "Error uploading logo");
      toast.error(error.message || "Error uploading logo. Please try again.");
      
      // Restaurar preview anterior
      setPreviewUrl(logoUrl);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Limpiar file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
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

    if (!isCompanyOwner && !can.editSettings) {
      toast.error("Only company administrators can change the logo");
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [isCompanyOwner, can.editSettings, handleFileUpload]);

  const handleClick = () => {
    if (!isCompanyOwner && !can.editSettings) {
      toast.error("Only company administrators can change the logo");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = async () => {
    if (!company) return;

    try {
      setIsUploading(true);
      const updated = await updateCompanyLogo(company.id, '');
      
      if (updated) {
        setPreviewUrl(null);
        onLogoUpdate('');
        await refreshCompany();
        toast.success("Logo removed successfully");
      }
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Error removing logo");
    } finally {
      setIsUploading(false);
    }
  };

  const canEdit = isCompanyOwner || can.editSettings;

  return (
    <div className="space-y-4">
      <Label>Company Logo</Label>
      
      <RoleCheck
        adminOnly
        fallback={
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center">
            {previewUrl ? (
              <Avatar className="w-24 h-24 mb-4">
                <img 
                  src={previewUrl} 
                  alt={company?.name} 
                  className="object-contain" 
                  onError={() => setPreviewUrl(null)}
                />
              </Avatar>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400">
                <Building2 size={32} />
              </div>
            )}
            <p className="text-sm text-gray-500 text-center">
              Only administrators can change the company logo
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Preview y botones */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Logo preview" 
                    className="w-full h-full object-contain p-1"
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-400" />
                )}
              </div>
              
              {/* Progress overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <LoadingSpinner size="sm" />
                    <div className="text-xs mt-1">{uploadProgress}%</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex space-x-2">
                <Button
                  onClick={handleClick}
                  disabled={isUploading}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Upload size={16} />
                  <span>{previewUrl ? 'Change logo' : 'Upload logo'}</span>
                </Button>
                
                {previewUrl && (
                  <Button
                    onClick={handleRemoveLogo}
                    disabled={isUploading}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <X size={16} />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Formatos: JPG, PNG, WebP, SVG • Máximo 10MB
              </p>
            </div>
          </div>

          {/* Zona de drag & drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              {dragActive 
                ? 'Drop the image here' 
                : 'Drag your logo here, or click to select'
              }
            </p>
            <p className="text-xs text-gray-500">
              We recommend a square logo of at least 200x200 pixels
            </p>
          </div>

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
            <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </RoleCheck>
    </div>
  );
}
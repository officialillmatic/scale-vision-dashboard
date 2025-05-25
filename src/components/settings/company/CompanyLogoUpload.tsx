
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/avatar';
import { updateCompanyLogo } from '@/services/companyService';
import { uploadCompanyLogo } from '@/services/storageService';
import { toast } from 'sonner';
import { useRole } from '@/hooks/useRole';
import { RoleCheck } from '@/components/auth/RoleCheck';

interface CompanyLogoUploadProps {
  logoUrl: string | null;
  onLogoUpdate: (url: string) => void;
}

export function CompanyLogoUpload({ logoUrl, onLogoUpdate }: CompanyLogoUploadProps) {
  const { company, refreshCompany } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const { isCompanyOwner, can } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    // Only allow logo uploads for company owners/admins
    if (!isCompanyOwner && !can.editSettings) {
      toast.error("Only company admins can change the logo");
      return;
    }
    
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) {
      return;
    }

    setIsUploading(true);
    try {
      // Upload logo using the storage service
      const logoUrl = await uploadCompanyLogo(company.id, file);
      
      if (logoUrl) {
        // Update company record with the new logo URL
        const updated = await updateCompanyLogo(company.id, logoUrl);
        
        if (updated) {
          // Preview the logo while waiting for refresh
          onLogoUpdate(logoUrl);
          // Refresh company data to get the updated logo
          await refreshCompany();
          toast.success("Company logo updated successfully");
        } else {
          throw new Error("Failed to update company record with logo URL");
        }
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo. Please try again.");
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>Company Logo</Label>
      <RoleCheck
        adminOnly
        fallback={
          <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
            {logoUrl ? (
              <Avatar className="w-24 h-24 mb-4">
                <img 
                  src={logoUrl} 
                  alt={company?.name} 
                  className="object-cover" 
                  onError={() => onLogoUpdate('')}
                />
              </Avatar>
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Only administrators can change the company logo
            </p>
          </div>
        }
      >
        <div 
          className="cursor-pointer border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
          onClick={handleLogoClick}
        >
          {isUploading ? (
            <LoadingSpinner size="md" className="mb-4" />
          ) : logoUrl ? (
            <Avatar className="w-24 h-24 mb-4">
              <img 
                src={logoUrl} 
                alt={company?.name} 
                className="object-cover" 
                onError={() => onLogoUpdate('')}
              />
            </Avatar>
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
              </svg>
            </div>
          )}
          <p className="text-sm text-gray-500">
            {logoUrl ? 'Click to change logo' : 'Click to upload logo'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
            disabled={isUploading}
          />
        </div>
      </RoleCheck>
    </div>
  );
}

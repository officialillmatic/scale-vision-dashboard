import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/avatar';
import { createCompany, updateCompanyLogo } from '@/services/companyService';
import { uploadCompanyLogo } from '@/services/storageService';
import { toast } from 'sonner';
import { useRole } from '@/hooks/useRole';
import { RoleCheck } from '@/components/auth/RoleCheck';

export function CompanySettings() {
  const { user, company, isCompanyLoading, refreshCompany } = useAuth();
  const [companyName, setCompanyName] = useState<string>(company?.name || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(company?.logo_url || null);
  const { isCompanyOwner, can } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update state when company data changes
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setLogoUrl(company.logo_url || null);
    }
  }, [company]);

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      const newCompany = await createCompany(companyName, user.id);
      if (newCompany) {
        await refreshCompany();
        toast.success("Company created successfully");
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

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

    // Check if file is an image and under 5MB
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload logo to storage bucket
      const logoUrl = await uploadCompanyLogo(company.id, file);
      
      if (logoUrl) {
        // Update company record with the new logo URL
        const updated = await updateCompanyLogo(company.id, logoUrl);
        
        if (updated) {
          // Preview the logo while waiting for refresh
          setLogoUrl(logoUrl);
          // Refresh company data to get the updated logo
          await refreshCompany();
          toast.success("Company logo updated successfully");
        } else {
          throw new Error("Failed to update company record with logo URL");
        }
      } else {
        throw new Error("Failed to upload logo file to storage");
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

  if (isCompanyLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Setup</CardTitle>
          <CardDescription>Create your company profile to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompanyCreate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input 
                  id="company-name"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCompanyCreate} 
            disabled={isCreating || !companyName.trim()}
          >
            {isCreating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Create Company
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
        <CardDescription>Manage your company profile and branding</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <div className="text-lg font-medium">{company.name}</div>
          </div>

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
                        alt={company.name} 
                        className="object-cover" 
                        onError={() => setLogoUrl(null)}
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
                      alt={company.name} 
                      className="object-cover" 
                      onError={() => setLogoUrl(null)}
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
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                  disabled={isUploading}
                />
              </div>
            </RoleCheck>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

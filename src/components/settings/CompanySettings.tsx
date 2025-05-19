
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Avatar } from '@/components/ui/avatar';
import { createCompany, updateCompanyLogo, uploadLogo } from '@/services/companyService';
import { toast } from 'sonner';

export function CompanySettings() {
  const { user, company, isCompanyLoading, refreshCompany } = useAuth();
  const [companyName, setCompanyName] = useState<string>(company?.name || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setIsCreating(true);
    try {
      const newCompany = await createCompany(companyName);
      if (newCompany) {
        await refreshCompany();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

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
      const logoUrl = await uploadLogo(file);
      if (logoUrl) {
        const updated = await updateCompanyLogo(company.id, logoUrl);
        if (updated) {
          await refreshCompany();
        }
      }
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
            <div 
              className="cursor-pointer border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
              onClick={handleLogoClick}
            >
              {isUploading ? (
                <LoadingSpinner size="md" className="mb-4" />
              ) : company.logo_url ? (
                <Avatar className="w-24 h-24 mb-4">
                  <img src={company.logo_url} alt={company.name} className="object-cover" />
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
                {company.logo_url ? 'Click to change logo' : 'Click to upload logo'}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

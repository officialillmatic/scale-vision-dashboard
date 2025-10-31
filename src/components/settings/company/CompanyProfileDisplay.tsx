
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CompanyLogoUpload } from './CompanyLogoUpload';
import { Company } from '@/types/auth';

interface CompanyProfileDisplayProps {
  company: Company;
  logoUrl: string | null;
  onLogoUpdate: (url: string) => void;
}

export function CompanyProfileDisplay({ company, logoUrl, onLogoUpdate }: CompanyProfileDisplayProps) {
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

          <CompanyLogoUpload 
            logoUrl={logoUrl}
            onLogoUpdate={onLogoUpdate}
          />
        </div>
      </CardContent>
    </Card>
  );
}

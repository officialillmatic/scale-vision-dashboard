
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyCreationForm } from './company/CompanyCreationForm';
import { CompanyProfileDisplay } from './company/CompanyProfileDisplay';

export function CompanySettings() {
  const { company, isCompanyLoading } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(company?.logo_url || null);
  
  // Update state when company data changes
  useEffect(() => {
    if (company) {
      setLogoUrl(company.logo_url || null);
    }
  }, [company]);

  const handleLogoUpdate = (url: string) => {
    setLogoUrl(url || null);
  };

  if (isCompanyLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!company) {
    return <CompanyCreationForm />;
  }

  return (
    <CompanyProfileDisplay 
      company={company}
      logoUrl={logoUrl}
      onLogoUpdate={handleLogoUpdate}
    />
  );
}

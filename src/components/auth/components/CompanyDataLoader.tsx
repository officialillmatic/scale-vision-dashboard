
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CompanyDataLoaderProps {
  children: React.ReactNode;
}

export const CompanyDataLoader: React.FC<CompanyDataLoaderProps> = ({ children }) => {
  const { user, isLoading, isCompanyLoading, refreshCompany } = useAuth();

  useEffect(() => {
    // If user is authenticated but company data is still loading after a reasonable time,
    // trigger a refresh to ensure we have the latest data
    if (user && !isLoading && isCompanyLoading) {
      const timer = setTimeout(() => {
        console.log("[COMPANY_DATA_LOADER] Triggering company data refresh");
        refreshCompany();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, isCompanyLoading, refreshCompany]);

  // Show loading spinner while auth or company data is loading
  if (isLoading || (user && isCompanyLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-brand-purple" />
      </div>
    );
  }

  return <>{children}</>;
};

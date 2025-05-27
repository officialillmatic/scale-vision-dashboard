
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "./useSuperAdmin";

interface SuperAdminMetrics {
  totalCalls: number;
  totalDurationMin: number;
  totalCost: number;
  totalCompanies: number;
  totalUsers: number;
}

interface CompanyMetrics {
  companyId: string;
  companyName: string;
  totalCalls: number;
  totalCost: number;
  totalUsers: number;
}

export const useSuperAdminData = () => {
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const [globalMetrics, setGlobalMetrics] = useState<SuperAdminMetrics | null>(null);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuperAdminData = async () => {
      if (isSuperAdminLoading) return;
      
      if (!isSuperAdmin) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: globalData, error: globalError } = await supabase.rpc('get_super_admin_call_metrics');
        
        if (globalError) {
          console.error('Error fetching global metrics:', globalError);
          setError('Failed to load global metrics');
        } else if (globalData && globalData.length > 0) {
          const metrics = globalData[0];
          setGlobalMetrics({
            totalCalls: Number(metrics.total_calls),
            totalDurationMin: Number(metrics.total_duration_min),
            totalCost: Number(metrics.total_cost),
            totalCompanies: Number(metrics.total_companies),
            totalUsers: Number(metrics.total_users)
          });
        }

        const { data: companyData, error: companyError } = await supabase.rpc('get_super_admin_company_metrics');
        
        if (companyError) {
          console.error('Error fetching company metrics:', companyError);
          setError('Failed to load company metrics');
        } else {
          setCompanyMetrics(companyData || []);
        }

      } catch (error) {
        console.error('Error in super admin data fetch:', error);
        setError('Failed to load super admin data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuperAdminData();
  }, [isSuperAdmin, isSuperAdminLoading]);

  return {
    globalMetrics,
    companyMetrics,
    isLoading,
    error,
    isSuperAdmin
  };
};

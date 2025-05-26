
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/auth';
import { fetchCompany } from '@/services/companyService';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export const useCompanyState = (user: User | null) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);

  const { isSuperAdmin } = useSuperAdmin();

  const loadCompanyData = async (userId: string) => {
    console.log("[COMPANY_STATE] Loading company data for user:", userId);
    setIsCompanyLoading(true);
    
    try {
      const companyData = await fetchCompany(userId);
      console.log("[COMPANY_STATE] Company data loaded:", companyData);
      setCompany(companyData);
      
      if (companyData) {
        // Get user role in the company
        const { data: memberData } = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', userId)
          .eq('company_id', companyData.id)
          .eq('status', 'active')
          .single();
        
        if (memberData) {
          setUserRole(memberData.role);
        } else if (companyData.owner_id === userId) {
          setUserRole('admin');
        }

        // Load company members
        try {
          const { data: membersData } = await supabase
            .from('company_members')
            .select(`
              id,
              company_id,
              user_id,
              role,
              status,
              created_at,
              updated_at
            `)
            .eq('company_id', companyData.id)
            .eq('status', 'active');

          setCompanyMembers(membersData || []);
        } catch (error) {
          console.error("[COMPANY_STATE] Error loading company members:", error);
          setCompanyMembers([]);
        }
      }
    } catch (error) {
      console.error("[COMPANY_STATE] Error loading company:", error);
      setCompany(null);
      setUserRole(null);
      setCompanyMembers([]);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (user?.id) {
      await loadCompanyData(user.id);
    }
  };

  const clearCompanyData = () => {
    setCompany(null);
    setUserRole(null);
    setCompanyMembers([]);
    setIsCompanyLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      loadCompanyData(user.id);
    } else {
      clearCompanyData();
    }
  }, [user?.id]);

  const isCompanyOwner = company?.owner_id === user?.id;

  return {
    company,
    isCompanyLoading,
    userRole,
    companyMembers,
    isCompanyOwner,
    refreshCompany,
    loadCompanyData,
    clearCompanyData
  };
};

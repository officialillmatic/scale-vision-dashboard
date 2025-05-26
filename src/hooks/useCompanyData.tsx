
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "./useSuperAdmin";

export interface CompanyData {
  id: string;
  name: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  user_details?: {
    email: string;
    name?: string;
  };
}

export function useCompanyData(user?: any) {
  const { isSuperAdmin } = useSuperAdmin();

  const companyQuery = useQuery({
    queryKey: ['company-data', user?.id],
    queryFn: async (): Promise<CompanyData | null> => {
      if (!user) return null;

      try {
        // For super admins, get all companies
        if (isSuperAdmin) {
          const { data: companies, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error('Error fetching companies for super admin:', error);
            return null;
          }

          return companies?.[0] || null;
        }

        // For regular users, get their company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Error fetching user company:', companyError);
          
          // Try to get company through membership
          const { data: membership, error: membershipError } = await supabase
            .from('company_members')
            .select(`
              company_id,
              companies!inner (*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (membershipError) {
            console.error('Error fetching company membership:', membershipError);
            return null;
          }

          // Fix the type casting - companies is the nested object, not an array
          return (membership?.companies as unknown as CompanyData) || null;
        }

        return company;
      } catch (error) {
        console.error('Error in useCompanyData:', error);
        return null;
      }
    },
    enabled: !!user,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const membersQuery = useQuery({
    queryKey: ['company-members', companyQuery.data?.id],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (!companyQuery.data?.id) return [];

      try {
        const { data: members, error } = await supabase
          .from('company_members')
          .select(`
            *,
            user_details:user_profiles(email, name)
          `)
          .eq('company_id', companyQuery.data.id)
          .eq('status', 'active');

        if (error) {
          console.error('Error fetching company members:', error);
          return [];
        }

        return members || [];
      } catch (error) {
        console.error('Error fetching company members:', error);
        return [];
      }
    },
    enabled: !!companyQuery.data?.id,
  });

  // Calculate user role and ownership
  const userRole = user && companyQuery.data ? 
    (companyQuery.data.owner_id === user.id ? 'admin' : 
     membersQuery.data?.find(m => m.user_id === user.id)?.role || null) : null;

  const isCompanyOwner = user && companyQuery.data ? 
    companyQuery.data.owner_id === user.id : false;

  const refreshCompany = async () => {
    await companyQuery.refetch();
    await membersQuery.refetch();
  };

  return {
    company: companyQuery.data || null,
    isCompanyLoading: companyQuery.isLoading || membersQuery.isLoading,
    companyMembers: membersQuery.data || [],
    userRole,
    isCompanyOwner,
    refreshCompany,
    isLoading: companyQuery.isLoading,
    error: companyQuery.error || membersQuery.error,
  };
}

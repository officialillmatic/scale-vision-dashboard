
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  // First check if user is super admin
  const superAdminQuery = useQuery({
    queryKey: ['super-admin-check', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      
      try {
        const { data, error } = await supabase.rpc('is_super_admin_safe');
        if (error) {
          console.error('Error checking super admin status:', error);
          return false;
        }
        return data || false;
      } catch (error) {
        console.error('Error in super admin check:', error);
        return false;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const companyQuery = useQuery({
    queryKey: ['company-data', user?.id, superAdminQuery.data],
    queryFn: async (): Promise<CompanyData | null> => {
      if (!user) return null;

      try {
        console.log("[COMPANY_DATA] Fetching company for user:", user.id, "isSuperAdmin:", superAdminQuery.data);

        // For super admins, get all companies
        if (superAdminQuery.data) {
          const { data: companies, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error('Error fetching companies for super admin:', error);
            return null;
          }

          console.log("[COMPANY_DATA] Super admin companies:", companies);
          return companies?.[0] || null;
        }

        // For regular users, get their company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (companyError) {
          console.error('Error fetching user company:', companyError);
        }

        if (company) {
          console.log("[COMPANY_DATA] Found owned company:", company);
          return company;
        }

        // Try to get company through membership
        const { data: membership, error: membershipError } = await supabase
          .from('company_members')
          .select(`
            company_id,
            companies!inner (
              id,
              name,
              logo_url,
              owner_id,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError) {
          console.error('Error fetching company membership:', membershipError);
          return null;
        }

        if (membership?.companies) {
          console.log("[COMPANY_DATA] Found membership company:", membership.companies);
          return (membership.companies as unknown as CompanyData) || null;
        }

        console.log("[COMPANY_DATA] No company found for user");
        return null;
      } catch (error) {
        console.error('Error in useCompanyData:', error);
        return null;
      }
    },
    enabled: !!user && !superAdminQuery.isLoading,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const membersQuery = useQuery({
    queryKey: ['company-members', companyQuery.data?.id],
    queryFn: async (): Promise<CompanyMember[]> => {
      if (!companyQuery.data?.id) return [];

      try {
        console.log("[COMPANY_DATA] Fetching members for company:", companyQuery.data.id);
        
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

        console.log("[COMPANY_DATA] Found members:", members);
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
    await superAdminQuery.refetch();
  };

  console.log("[COMPANY_DATA] Final state:", {
    company: companyQuery.data,
    isLoading: companyQuery.isLoading || membersQuery.isLoading || superAdminQuery.isLoading,
    userRole,
    isCompanyOwner,
    isSuperAdmin: superAdminQuery.data,
    membersCount: membersQuery.data?.length || 0
  });

  return {
    company: companyQuery.data || null,
    isCompanyLoading: companyQuery.isLoading || membersQuery.isLoading || superAdminQuery.isLoading,
    companyMembers: membersQuery.data || [],
    userRole,
    isCompanyOwner,
    refreshCompany,
    isLoading: companyQuery.isLoading || superAdminQuery.isLoading,
    error: companyQuery.error || membersQuery.error || superAdminQuery.error,
    isSuperAdmin: superAdminQuery.data || false,
  };
}

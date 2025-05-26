
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

export function useCompanyData() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  return useQuery({
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

          return membership?.companies || null;
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
}

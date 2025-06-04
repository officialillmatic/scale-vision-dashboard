
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
  last_sign_in_at?: string;
  company_id?: string;
  email_confirmed_at?: string;
}

export function useTeamMembers() {
  const { company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const { data: members, isLoading, error, refetch } = useQuery({
    queryKey: ['team-members', company?.id, isSuperAdmin],
    queryFn: async () => {
      try {
        // For super admins, get all users across all companies
        if (isSuperAdmin) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

          if (profilesError) throw profilesError;

          return profiles?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role || 'user',
            status: profile.email_confirmed_at ? 'active' : 'invited' as const,
            created_at: profile.created_at,
            last_sign_in_at: profile.last_sign_in_at,
            company_id: profile.company_id,
            email_confirmed_at: profile.email_confirmed_at
          })) || [];
        }

        // For company users, get only their company's members
        if (!company?.id) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        return profiles?.map(profile => ({
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role || 'user',
          status: profile.email_confirmed_at ? 'active' : 'invited' as const,
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at,
          company_id: profile.company_id,
          email_confirmed_at: profile.email_confirmed_at
        })) || [];
      } catch (error) {
        console.error('Error fetching team members:', error);
        return [];
      }
    },
    enabled: !!company?.id || isSuperAdmin
  });

  return {
    members: members || [],
    isLoading,
    error,
    refetch
  };
}

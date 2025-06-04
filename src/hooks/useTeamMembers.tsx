
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
  user_details?: {
    name?: string;
    email?: string;
  };
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function useTeamMembers(companyId?: string) {
  const { company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const targetCompanyId = companyId || company?.id;

  const { data: members, isLoading, error, refetch } = useQuery({
    queryKey: ['team-members', targetCompanyId, isSuperAdmin],
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
            email_confirmed_at: profile.email_confirmed_at,
            user_details: {
              name: profile.full_name,
              email: profile.email
            }
          })) || [];
        }

        // For company users, get only their company's members
        if (!targetCompanyId) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('company_id', targetCompanyId)
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
          email_confirmed_at: profile.email_confirmed_at,
          user_details: {
            name: profile.full_name,
            email: profile.email
          }
        })) || [];
      } catch (error) {
        console.error('Error fetching team members:', error);
        return [];
      }
    },
    enabled: !!targetCompanyId || isSuperAdmin
  });

  // Mock functions for invitation management
  const handleInvite = async (inviteData: any) => {
    console.log('Invite functionality not implemented:', inviteData);
    return false;
  };

  const fetchInvitations = async () => {
    console.log('Fetch invitations not implemented');
  };

  return {
    members: members || [],
    teamMembers: members || [], // Backward compatibility alias
    invitations: [] as TeamInvitation[], // Mock empty array
    isLoading,
    error,
    refetch,
    isInviting: false,
    handleInvite,
    fetchInvitations
  };
}

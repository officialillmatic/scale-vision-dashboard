import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { createInvitation } from "@/services/invitation/invitationActions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getConfirmedTeamMembers, getTrulyPendingInvitations } from "@/services/teamMigration";

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
  const { toast } = useToast();
  const [isInviting, setIsInviting] = useState(false);
  
  const targetCompanyId = companyId || company?.id;

  // Query for team members - VERSIÓN CORREGIDA SIN full_name
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['team-members', targetCompanyId],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching team members...');
      
      try {
        // For super admins - APLICANDO LÓGICA DE SuperAdminCreditPage
        if (isSuperAdmin) {
          console.log('✅ [SECURITY] Super admin verified, using SuperCredits logic');
          
          // PASO 1: Obtener todos los usuarios con créditos (como SuperAdminCreditPage)
          const { data: creditsData, error: creditsError } = await supabase
            .from('user_credits')
            .select('user_id');

          if (creditsError) {
            console.error('❌ Error fetching user_credits:', creditsError);
            // Fallback: obtener todos los users directamente
            const { data: allUsers, error: usersError } = await supabase
              .from('users')
              .select('id, email, name, avatar_url, created_at, updated_at')
              .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            return allUsers?.map(user => ({
              id: user.id,
              email: user.email || 'No email',
              full_name: user.name || user.email?.split('@')?.[0] || 'User',
              avatar_url: user.avatar_url,
              role: 'member',
              status: 'active' as const,
              created_at: user.created_at,
              last_sign_in_at: null,
              company_id: null,
              email_confirmed_at: user.created_at,
              user_details: {
                name: user.name || user.email?.split('@')?.[0] || 'User',
                email: user.email || 'No email'
              }
            })) || [];
          }

          // PASO 2: Obtener IDs de usuarios con créditos
          const userIds = creditsData?.map(c => c.user_id) || [];
          console.log(`🔍 [SUPER ADMIN] Found ${userIds.length} users with credits`);

          if (userIds.length === 0) {
            console.log('⚠️ [SUPER ADMIN] No users with credits found');
            return [];
          }

          // PASO 3: Intentar obtener perfiles de usuarios (SIN full_name)
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('id, email, name, avatar_url, created_at, updated_at, role')
            .in('id', userIds);

          // PASO 4: Fallback a users si no hay user_profiles (CLAVE!)
          let userProfiles = profilesData || [];
          if (!profilesData || profilesData.length < userIds.length) {
            console.log('🔄 [SUPER ADMIN] Falling back to users table...');
            const { data: usersData } = await supabase
              .from('users')
              .select('id, email, name, avatar_url, created_at, updated_at')
              .in('id', userIds);
            
            // Combinar profiles existentes con datos de users
            const profileEmails = new Set(profilesData?.map(p => p.id) || []);
            const missingUsers = usersData?.filter(u => !profileEmails.has(u.id)) || [];
            
            const usersAsProfiles = missingUsers.map(u => ({
              id: u.id,
              email: u.email,
              name: u.name,
              avatar_url: u.avatar_url,
              created_at: u.created_at,
              updated_at: u.updated_at,
              role: 'member'
            }));

            userProfiles = [...(profilesData || []), ...usersAsProfiles];
          }

          console.log(`✅ [SUPER ADMIN] Total users found: ${userProfiles.length}`);
          console.log('🔍 [SUPER ADMIN] Sample user:', userProfiles?.[0]);

          // PASO 5: Transformar datos al formato TeamMember
          return userProfiles?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.name || profile.email?.split('@')?.[0] || 'User',
            avatar_url: profile.avatar_url,
            role: profile.role || 'member',
            status: 'active' as const,
            created_at: profile.created_at,
            last_sign_in_at: null,
            company_id: null,
            email_confirmed_at: profile.created_at,
            user_details: {
              name: profile.name || profile.email?.split('@')?.[0] || 'User',
              email: profile.email || 'No email'
            }
          })) || [];
        }

        // For company users, get confirmed members from company_members
        if (!targetCompanyId) return [];

        console.log('🔍 [REGULAR USER] Fetching company team members only');
        return await getConfirmedTeamMembers(targetCompanyId, false);
      } catch (error) {
        console.error('❌ [useTeamMembers] Error fetching team members:', error);
        return [];
      }
    },
    enabled: !!targetCompanyId || isSuperAdmin,
    refetchInterval: 10000,
  });

  // Query for truly pending invitations
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ['pending-invitations', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return [];
      
      try {
        return await getTrulyPendingInvitations(targetCompanyId);
      } catch (error) {
        console.error('💥 Error fetching pending invitations:', error);
        return [];
      }
    },
    enabled: !!targetCompanyId,
    refetchInterval: 10000,
  });

  // Set up real-time updates
  useEffect(() => {
    if (!targetCompanyId) return;

    console.log('🔔 [useTeamMembers] Setting up real-time updates for team members...');
    
    const channel = supabase
      .channel('team-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
          filter: `company_id=eq.${targetCompanyId}`,
        },
        (payload) => {
          console.log('🔄 [useTeamMembers] Company member changed, refreshing:', payload);
          refetchMembers();
          refetchInvitations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('🔄 [useTeamMembers] Profile updated, refreshing team data:', payload);
          refetchMembers();
          refetchInvitations();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [useTeamMembers] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [targetCompanyId, refetchMembers, refetchInvitations]);

  // Enhanced invitation handling function
  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    console.log('🚀 [handleInvite] Starting invitation process...');
    console.log('📧 [handleInvite] Email:', email);
    console.log('👤 [handleInvite] Role:', role);
    console.log('🏢 [handleInvite] Company ID:', targetCompanyId);

    if (!targetCompanyId) {
      console.error('❌ [handleInvite] No company ID available');
      toast({
        title: "Error",
        description: "No company selected for invitation",
        variant: "destructive",
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ [handleInvite] Invalid email format:', email);
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // Check if email is already in profiles
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      console.warn('⚠️ [handleInvite] User already registered:', email);
      toast({
        title: "User Already Registered",
        description: `${email} is already a registered user`,
        variant: "destructive",
      });
      return false;
    }

    setIsInviting(true);

    try {
      console.log('📤 [handleInvite] Calling createInvitation...');
      const success = await createInvitation(targetCompanyId, email, role);
      
      if (success) {
        console.log('✅ [handleInvite] Invitation sent successfully');
        toast({
          title: "Invitation Sent",
          description: `Invitation sent to ${email} successfully`,
        });
        
        // Refresh both members and invitations lists
        await refetchMembers();
        await refetchInvitations();
        
        return true;
      } else {
        console.error('❌ [handleInvite] Failed to send invitation');
        toast({
          title: "Failed to Send Invitation",
          description: "Please try again later",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('💥 [handleInvite] Error sending invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  const fetchInvitations = async () => {
    console.log('🔄 [fetchInvitations] Force refreshing all data...');
    await Promise.all([refetchMembers(), refetchInvitations()]);
  };

  return {
    members: members || [],
    teamMembers: members || [],
    invitations: invitations || [],
    isLoading: membersLoading || invitationsLoading,
    error: membersError,
    refetch: refetchMembers,
    isInviting,
    handleInvite,
    fetchInvitations
  };
}

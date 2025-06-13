

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

  // Query for team members - SECURED VERSION
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['team-members', targetCompanyId],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching team members...');
      
      try {
        // For super admins - VERIFICACIÓN CORREGIDA
        if (isSuperAdmin) {
          console.log('✅ [SECURITY] Super admin verified by hook, proceeding with full access');
          console.log('🔍 [SUPER ADMIN] Fetching all users from profiles');
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, name, avatar_url, created_at, updated_at, role')
            .order('created_at', { ascending: false });

          if (profilesError) {
            console.error('❌ [SUPER ADMIN] Error:', profilesError);
            throw profilesError;
          }

          console.log(`✅ [SUPER ADMIN] Found ${profilesData?.length || 0} users`);
          console.log('🔍 [SUPER ADMIN] Sample user data:', profilesData?.[0]);
          console.log('🔍 [SUPER ADMIN] All user data:', profilesData);

          return profilesData?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.email?.split('@')?.[0] || 'User',
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
        return await getConfirmedTeamMembers(targetCompanyId);
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
      .from('profiles')
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

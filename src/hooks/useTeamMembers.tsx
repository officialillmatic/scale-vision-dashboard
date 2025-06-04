
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { createInvitation } from "@/services/invitation/invitationActions";
import { fetchCompanyInvitations } from "@/services/invitation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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

  // Query for team members (confirmed users)
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['team-members', targetCompanyId, isSuperAdmin],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching confirmed team members...');
      
      try {
        // For super admins, get all users across all companies
        if (isSuperAdmin) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .not('email_confirmed_at', 'is', null) // Only confirmed users
            .order('created_at', { ascending: false });

          if (profilesError) throw profilesError;

          return profiles?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role || 'user',
            status: 'active' as const,
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

        // For company users, get only their company's confirmed members
        if (!targetCompanyId) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('company_id', targetCompanyId)
          .not('email_confirmed_at', 'is', null) // Only confirmed users
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        return profiles?.map(profile => ({
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role || 'user',
          status: 'active' as const,
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
        console.error('❌ [useTeamMembers] Error fetching team members:', error);
        return [];
      }
    },
    enabled: !!targetCompanyId || isSuperAdmin,
    refetchInterval: 10000, // Auto-refresh every 10 seconds to catch new registrations
  });

  // Query for pending invitations (filtered to exclude confirmed users)
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ['company-invitations', targetCompanyId],
    queryFn: () => targetCompanyId ? fetchCompanyInvitations(targetCompanyId) : Promise.resolve([]),
    enabled: !!targetCompanyId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Set up real-time updates for new user registrations
  useEffect(() => {
    if (!targetCompanyId) return;

    console.log('🔔 Setting up real-time updates for team members...');
    
    const channel = supabase
      .channel('team-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `company_id=eq.${targetCompanyId}`,
        },
        (payload) => {
          console.log('🔄 Profile updated, refreshing team data:', payload);
          refetchMembers();
          refetchInvitations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
          filter: `company_id=eq.${targetCompanyId}`,
        },
        (payload) => {
          console.log('✨ New team member registered:', payload);
          refetchMembers();
          refetchInvitations();
          
          if (payload.new?.email) {
            toast({
              title: "New Team Member",
              description: `${payload.new.email} has joined the team!`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [targetCompanyId, refetchMembers, refetchInvitations, toast]);

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
    console.log('🔄 [fetchInvitations] Refreshing all data...');
    await Promise.all([refetchMembers(), refetchInvitations()]);
  };

  return {
    members: members || [],
    teamMembers: members || [], // Backward compatibility alias
    invitations: invitations || [],
    isLoading: membersLoading || invitationsLoading,
    error: membersError,
    refetch: refetchMembers,
    isInviting,
    handleInvite,
    fetchInvitations
  };
}


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { createInvitation } from "@/services/invitation/invitationActions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { migrateRegisteredUsers, getConfirmedTeamMembers, getTrulyPendingInvitations } from "@/services/teamMigration";

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
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  
  const targetCompanyId = companyId || company?.id;

  // Run migration when component loads
  useEffect(() => {
    const runMigration = async () => {
      if (targetCompanyId && !migrationCompleted && !isSuperAdmin) {
        console.log('🚀 Starting automatic user migration...');
        const success = await migrateRegisteredUsers(targetCompanyId);
        if (success) {
          setMigrationCompleted(true);
          toast({
            title: "Migration Complete",
            description: "Registered users have been added to the team",
          });
        }
      }
    };

    runMigration();
  }, [targetCompanyId, migrationCompleted, isSuperAdmin, toast]);

  // Query for confirmed team members from company_members table
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['confirmed-team-members', targetCompanyId, migrationCompleted],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching confirmed team members...');
      
      try {
        // For super admins, get all users across all companies
        if (isSuperAdmin) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .not('email_confirmed_at', 'is', null)
            .order('created_at', { ascending: false });

          if (profilesError) throw profilesError;

          console.log('👥 [useTeamMembers] Super admin - found confirmed users:', profiles?.length || 0);

          return profiles?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role || 'user',
            status: 'active' as const,
            created_at: profile.created_at,
            last_sign_in_at: null,
            company_id: null,
            email_confirmed_at: profile.email_confirmed_at,
            user_details: {
              name: profile.full_name,
              email: profile.email
            }
          })) || [];
        }

        // For company users, get confirmed members from company_members
        if (!targetCompanyId) return [];

        return await getConfirmedTeamMembers(targetCompanyId);
      } catch (error) {
        console.error('❌ [useTeamMembers] Error fetching team members:', error);
        return [];
      }
    },
    enabled: !!targetCompanyId || isSuperAdmin,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Query for truly pending invitations (filtered to exclude confirmed users)
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ['truly-pending-invitations', targetCompanyId, migrationCompleted],
    queryFn: () => targetCompanyId ? getTrulyPendingInvitations(targetCompanyId) : Promise.resolve([]),
    enabled: !!targetCompanyId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Set up real-time updates for new user registrations
  useEffect(() => {
    if (!targetCompanyId) return;

    console.log('🔔 [useTeamMembers] Setting up real-time updates for team members...');
    
    const channel = supabase
      .channel('team-sync-enhanced')
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
          console.log('   - Email confirmed at:', payload.new?.email_confirmed_at);
          refetchMembers();
          refetchInvitations();
          
          // If email was just confirmed, trigger custom event
          if (payload.new?.email_confirmed_at && !payload.old?.email_confirmed_at) {
            console.log('✨ [useTeamMembers] Email confirmed for user:', payload.new.email);
            window.dispatchEvent(new CustomEvent('teamMemberRegistered', {
              detail: { 
                email: payload.new.email, 
                userId: payload.new.id,
                confirmedAt: payload.new.email_confirmed_at
              }
            }));
          }
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

    // Check if email is already confirmed
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email, email_confirmed_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser?.email_confirmed_at) {
      console.warn('⚠️ [handleInvite] User already confirmed:', email);
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
    teamMembers: members || [], // Backward compatibility alias
    invitations: invitations || [],
    isLoading: membersLoading || invitationsLoading,
    error: membersError,
    refetch: refetchMembers,
    isInviting,
    handleInvite,
    fetchInvitations,
    migrationCompleted
  };
}

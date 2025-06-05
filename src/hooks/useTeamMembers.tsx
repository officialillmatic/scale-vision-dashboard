
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

  // Query for confirmed team members
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['confirmed-team-members', targetCompanyId, migrationCompleted],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching confirmed team members...');
      
      try {
        // For super admins, get all users from profiles (simple query that works)
        if (isSuperAdmin) {
          console.log('🔍 [SUPER ADMIN] Using simple profiles query that works');
          
          // Use the SAME query as fetchAvailableUsers (that works)
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .order('created_at', { ascending: false });

          if (profilesError) {
            console.error('❌ [SUPER ADMIN] Error:', profilesError);
            throw profilesError;
          }

          console.log(`✅ [SUPER ADMIN] Found ${profilesData?.length || 0} users in profiles`);

          // Transform to TeamMember format
          const teamMembers = profilesData?.map(profile => ({
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.full_name,
            avatar_url: null,
            role: profile.role || 'member', // ✅ FIXED: Use 'member' instead of 'user'
            status: 'active' as const,
            created_at: new Date().toISOString(),
            last_sign_in_at: null,
            company_id: null,
            email_confirmed_at: new Date().toISOString(),
            user_details: {
              name: profile.full_name || profile.email?.split('@')[0] || 'User',
              email: profile.email || 'No email'
            }
          })) || [];

          console.log(`✅ [SUPER ADMIN] Returning ${teamMembers.length} team members`);
          return teamMembers;
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

  // Query for truly pending invitations (using the fixed function)
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ['truly-pending-invitations', targetCompanyId, migrationCompleted],
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
          refetchMembers();
          refetchInvitations();
          
          // If email was just confirmed, trigger custom event
          if (payload.new?.email && !payload.old?.email) {
            console.log('✨ [useTeamMembers] New profile created:', payload.new.email);
            window.dispatchEvent(new CustomEvent('teamMemberRegistered', {
              detail: { 
                email: payload.new.email, 
                userId: payload.new.id
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

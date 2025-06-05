
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

  // 🚨 FORCE MIGRATION on page load - Create profiles + migrate immediately
  useEffect(() => {
    const forceMigrationOnLoad = async () => {
      if (!isSuperAdmin) return;

      console.log('🚨 [FORCE MIGRATION] Starting immediate migration...');
      
      try {
        // Step 1: Get all auth users and existing profiles
        console.log('🔍 [FORCE MIGRATION] Fetching auth users and profiles...');
        
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
          console.error('❌ Error fetching auth users:', authError);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, email');
        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
          return;
        }

        const profileIds = new Set(profiles?.map(p => p.id) || []);
        const usersWithoutProfile = authUsers.users.filter(u => !profileIds.has(u.id));
        
        console.log(`🔍 [FORCE MIGRATION] Auth users: ${authUsers.users.length}, Profiles: ${profiles?.length || 0}`);
        console.log(`🔍 [FORCE MIGRATION] Users without profile: ${usersWithoutProfile.length}`);

        // Step 2: Create missing profiles for auth users
        if (usersWithoutProfile.length > 0) {
          const newProfiles = usersWithoutProfile.map(user => ({
            id: user.id,
            email: user.email || 'no-email@example.com',
            full_name: user.email?.split('@')[0] || 'User',
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: insertError } = await supabase.from('profiles').upsert(newProfiles);
          if (insertError) {
            console.error('❌ Error creating profiles:', insertError);
          } else {
            console.log(`✅ [FORCE MIGRATION] Created ${newProfiles.length} missing profiles`);
            newProfiles.forEach(profile => {
              console.log(`   - Created profile for: ${profile.email}`);
            });
          }
        }

        // Step 3: Get pending invitations that now have profiles and migrate them
        if (targetCompanyId) {
          console.log('🔄 [FORCE MIGRATION] Checking for pending users to migrate...');
          
          const { data: pendingInvitations } = await supabase
            .from('company_invitations_raw')
            .select('email')
            .eq('company_id', targetCompanyId)
            .eq('status', 'pending');

          const { data: allProfiles } = await supabase.from('profiles').select('id, email');
          
          const profileEmailMap = new Map(allProfiles?.map(p => [p.email?.toLowerCase(), p.id]) || []);
          const toMigrate = pendingInvitations?.filter(inv => 
            profileEmailMap.has(inv.email.toLowerCase())
          ) || [];

          console.log(`🔍 [FORCE MIGRATION] Found ${toMigrate.length} users to migrate:`, toMigrate.map(u => u.email));

          if (toMigrate.length > 0) {
            // Add to company_members
            const memberInserts = toMigrate.map(inv => {
              const profileId = profileEmailMap.get(inv.email.toLowerCase());
              return {
                user_id: profileId,
                company_id: targetCompanyId,
                role: 'member',
                status: 'active',
                joined_at: new Date().toISOString()
              };
            }).filter(insert => insert.user_id);

            if (memberInserts.length > 0) {
              const { error: insertError } = await supabase
                .from('company_members')
                .insert(memberInserts);
              
              if (!insertError) {
                // Mark invitations as accepted
                const { error: updateError } = await supabase
                  .from('company_invitations_raw')
                  .update({ status: 'accepted' })
                  .eq('company_id', targetCompanyId)
                  .in('email', toMigrate.map(u => u.email));
                
                if (!updateError) {
                  console.log(`✅ [FORCE MIGRATION] Successfully migrated ${memberInserts.length} users to company_members`);
                  setMigrationCompleted(true);
                  
                  toast({
                    title: "Migration Complete",
                    description: `Successfully migrated ${memberInserts.length} users to team members`,
                  });
                }
              }
            }
          }
        }

      } catch (error) {
        console.error('💥 [FORCE MIGRATION] Error during forced migration:', error);
      }
    };

    forceMigrationOnLoad();
  }, [targetCompanyId, isSuperAdmin, toast]);

  // Query for confirmed team members with REAL ROLES
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ['confirmed-team-members', targetCompanyId, migrationCompleted],
    queryFn: async () => {
      console.log('🔍 [useTeamMembers] Fetching confirmed team members with REAL ROLES...');
      
      try {
        // For super admins, get all users from profiles with REAL ROLES from company_members
        if (isSuperAdmin) {
          console.log('🔍 [SUPER ADMIN] Using enhanced profiles query with REAL ROLES from company_members');
          
          // ✅ FIXED: Get real roles from company_members table
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select(`
              id, 
              full_name, 
              email, 
              role,
              created_at,
              company_members!left(role, company_id)
            `)
            .order('created_at', { ascending: false });

          if (profilesError) {
            console.error('❌ [SUPER ADMIN] Error:', profilesError);
            throw profilesError;
          }

          console.log(`✅ [SUPER ADMIN] Found ${profilesData?.length || 0} users in profiles with company_members data`);
          
          // Transform to TeamMember format with REAL ROLES from company_members
          const teamMembers = profilesData?.map(profile => {
            // Use role from company_members if available, otherwise use profile role
            const realRole = profile.company_members && profile.company_members.length > 0 
              ? profile.company_members[0].role 
              : profile.role || 'member';
            
            console.log(`🔍 [ROLE DEBUG] ${profile.email}: Profile role: ${profile.role}, Company role: ${profile.company_members?.[0]?.role}, Final role: ${realRole}`);
            
            return {
              id: profile.id,
              email: profile.email || 'No email',
              full_name: profile.full_name,
              avatar_url: null,
              role: realRole, // ✅ FIXED: Use REAL role from company_members
              status: 'active' as const,
              created_at: profile.created_at || new Date().toISOString(),
              last_sign_in_at: null,
              company_id: profile.company_members?.[0]?.company_id || null,
              email_confirmed_at: new Date().toISOString(),
              user_details: {
                name: profile.full_name || profile.email?.split('@')[0] || 'User',
                email: profile.email || 'No email'
              }
            };
          }) || [];

          console.log(`✅ [SUPER ADMIN] Returning ${teamMembers.length} team members with REAL ROLES`);
          console.log('🔍 [SUPER ADMIN] Role distribution:', teamMembers.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>));
          
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

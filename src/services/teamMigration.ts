import { debugLog } from "@/lib/debug";

import { supabase } from "@/integrations/supabase/client";

export const migrateRegisteredUsers = async (companyId: string) => {
  try {
    debugLog('🔄 Starting migration of registered users to company_members...');
    
    // Get all confirmed users from profiles (simplified)
    const { data: confirmedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (usersError) {
      console.error('Error fetching confirmed users:', usersError);
      return false;
    }

    debugLog(`Found ${confirmedUsers?.length || 0} confirmed users`);

    // Get existing company members
    const { data: existingMembers, error: membersError } = await supabase
      .from('company_members')
      .select('user_id, email')
      .eq('company_id', companyId);

    if (membersError) {
      console.error('Error fetching existing members:', membersError);
      return false;
    }

    debugLog(`Found ${existingMembers?.length || 0} existing company members`);

    // Find users who need to be added to company_members
    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
    const usersToAdd = confirmedUsers?.filter(user => !existingUserIds.has(user.id)) || [];

    debugLog(`Need to migrate ${usersToAdd.length} users to company_members`);

    if (usersToAdd.length === 0) {
      debugLog('✅ No users need migration');
      return true;
    }

    // Add missing users to company_members
    const memberInserts = usersToAdd.map(user => ({
      user_id: user.id,
      company_id: companyId,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('company_members')
      .insert(memberInserts);

    if (insertError) {
      console.error('Error inserting new members:', insertError);
      return false;
    }

    debugLog(`✅ Successfully migrated ${usersToAdd.length} users to company_members`);
    usersToAdd.forEach(user => {
      debugLog(`   - Added: ${user.email}`);
    });

    return true;
  } catch (error) {
    console.error('💥 Error in migration:', error);
    return false;
  }
};

export const getConfirmedTeamMembers = async (companyId: string) => {
  try {
    debugLog('🔍 Fetching confirmed team members from company_members...');
    
    // First, try to get members with user_id JOIN
    const { data: membersWithUserId, error: joinError } = await supabase
      .from('company_members')
      .select(`
        *,
        profiles!inner(
          id, 
          email, 
          full_name, 
          avatar_url
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .order('joined_at', { ascending: false });

    if (joinError) {
      console.error('Error fetching members with user_id:', joinError);
    }

    // Second, get members with email only (legacy data)
    const { data: membersWithEmail, error: emailError } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .is('user_id', null); // These have email but no user_id

    if (emailError) {
      console.error('Error fetching members with email only:', emailError);
    }

    // For email-only members, get their profile data
    const emailOnlyResults = [];
    if (membersWithEmail?.length) {
      debugLog(`Processing ${membersWithEmail.length} email-only members...`);
      for (const member of membersWithEmail) {
        if (member.email) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('email', member.email)
            .maybeSingle();
          
          if (profileError) {
            console.error(`Error fetching profile for ${member.email}:`, profileError);
            continue;
          }
          
          if (profile) {
            emailOnlyResults.push({
              ...member,
              profiles: profile
            });
            debugLog(`   - Found profile for: ${member.email}`);
          } else {
            debugLog(`   - No profile found for: ${member.email}`);
          }
        }
      }
    }

    // Combine both results
    const allMembers = [...(membersWithUserId || []), ...emailOnlyResults];
    
    debugLog(`Found ${allMembers.length} confirmed team members total`);
    debugLog(`- With user_id: ${membersWithUserId?.length || 0}`);
    debugLog(`- Email-only: ${emailOnlyResults.length}`);
    
    return allMembers.map(member => ({
      id: member.profiles.id,
      email: member.profiles.email,
      full_name: member.profiles.full_name,
      avatar_url: member.profiles.avatar_url,
      role: member.role,
      status: member.status,
      created_at: member.joined_at || member.created_at,
      last_sign_in_at: null,
      email_confirmed_at: new Date().toISOString(),
      user_details: {
        name: member.profiles.full_name,
        email: member.profiles.email
      }
    })) || [];
  } catch (error) {
    console.error('💥 Error fetching team members:', error);
    return [];
  }
};

export const getTrulyPendingInvitations = async (companyId: string) => {
  try {
    debugLog('🔍 Fetching truly pending invitations (ENHANCED DEBUG)...');
    
    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('company_invitations_raw')
      .select(`
        *,
        companies!inner(name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return [];
    }

    debugLog('🔍 [DEBUG] All invitations:', invitations?.map(i => i.email));

    // Get all profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('email');

    debugLog('🔍 [DEBUG] All profile emails:', allProfiles?.map(p => p.email));

    const profileEmails = new Set(allProfiles?.map(p => p.email?.toLowerCase()) || []);
    
    debugLog('🔍 [DEBUG] Checking each invitation:');
    
    const trulyPending = invitations?.filter(invitation => {
      const hasProfile = profileEmails.has(invitation.email.toLowerCase());
      debugLog(`  📧 ${invitation.email}: ${hasProfile ? '❌ HAS PROFILE (should be removed)' : '✅ NO PROFILE (truly pending)'}`);
      return !hasProfile;
    }) || [];

    debugLog('🔍 [DEBUG] Final truly pending:', trulyPending.map(tp => tp.email));

    debugLog(`🎯 RESULT: ${trulyPending.length} truly pending invitations (filtered from ${invitations?.length || 0} total)`);
    
    // Debug specific users
    const problemUsers = ['elbazardelasventas@gmail.com', 'familiajyn2024@gmail.com'];
    problemUsers.forEach(email => {
      const isInPending = trulyPending.some(inv => inv.email.toLowerCase() === email.toLowerCase());
      const hasProfile = profileEmails.has(email.toLowerCase());
      const wasInOriginal = invitations?.some(inv => inv.email.toLowerCase() === email.toLowerCase());
      debugLog(`🔍 Problem user ${email}:`);
      debugLog(`   - Was in original invitations: ${wasInOriginal}`);
      debugLog(`   - Has profile: ${hasProfile}`);
      debugLog(`   - In final pending list: ${isInPending}`);
      debugLog(`   - Should be migrated: ${hasProfile && wasInOriginal && !isInPending}`);
    });
    
    return trulyPending.map(invitation => ({
      ...invitation,
      company_name: invitation.companies?.name
    }));
  } catch (error) {
    console.error('💥 Error fetching pending invitations:', error);
    return [];
  }
};

// New function for manual migration
export const manualMigratePendingUsers = async (companyId: string) => {
  try {
    debugLog('🚀 MANUAL MIGRATION: Starting...');
    
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, id');
    
    // Get pending invitations
    const { data: pending } = await supabase
      .from('company_invitations_raw')
      .select('email')
      .eq('company_id', companyId)
      .eq('status', 'pending');
    
    if (!profiles || !pending) {
      debugLog('❌ Could not fetch data for migration');
      return { success: false, message: 'Could not fetch data' };
    }
    
    const profileEmails = new Set(profiles.map(p => p.email?.toLowerCase()));
    const toMigrate = pending.filter(p => profileEmails.has(p.email.toLowerCase()));
    
    debugLog('🔍 Users to migrate:', toMigrate.map(u => u.email));
    
    if (toMigrate.length === 0) {
      return { success: true, message: 'No users need migration', count: 0 };
    }
    
    // Add users to company_members
    const memberInserts = toMigrate.map(pendingUser => {
      const profile = profiles.find(p => p.email?.toLowerCase() === pendingUser.email.toLowerCase());
      return {
        user_id: profile?.id,
        company_id: companyId,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString()
      };
    }).filter(insert => insert.user_id); // Only include users with valid profile IDs
    
    if (memberInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('company_members')
        .insert(memberInserts);
      
      if (insertError) {
        console.error('❌ Error inserting members:', insertError);
        return { success: false, message: 'Error inserting members', error: insertError };
      }
    }
    
    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('company_invitations_raw')
      .update({ status: 'accepted' })
      .eq('company_id', companyId)
      .in('email', toMigrate.map(u => u.email));
    
    if (updateError) {
      console.error('❌ Error updating invitations:', updateError);
    }
    
    debugLog(`✅ Successfully migrated ${memberInserts.length} users`);
    return { 
      success: true, 
      message: `Migrated ${memberInserts.length} users`, 
      count: memberInserts.length,
      users: toMigrate.map(u => u.email)
    };
    
  } catch (error) {
    console.error('💥 Error in manual migration:', error);
    return { success: false, message: 'Migration failed', error };
  }
};


import { supabase } from "@/integrations/supabase/client";

export const migrateRegisteredUsers = async (companyId: string) => {
  try {
    console.log('🔄 Starting migration of registered users to company_members...');
    
    // Get all confirmed users (registered users)
    const { data: confirmedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email_confirmed_at', 'is', null);

    if (usersError) {
      console.error('Error fetching confirmed users:', usersError);
      return false;
    }

    console.log(`Found ${confirmedUsers?.length || 0} confirmed users`);

    // Get existing company members
    const { data: existingMembers, error: membersError } = await supabase
      .from('company_members')
      .select('user_id, email')
      .eq('company_id', companyId);

    if (membersError) {
      console.error('Error fetching existing members:', membersError);
      return false;
    }

    console.log(`Found ${existingMembers?.length || 0} existing company members`);

    // Find users who need to be added to company_members
    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
    const usersToAdd = confirmedUsers?.filter(user => !existingUserIds.has(user.id)) || [];

    console.log(`Need to migrate ${usersToAdd.length} users to company_members`);

    if (usersToAdd.length === 0) {
      console.log('✅ No users need migration');
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

    console.log(`✅ Successfully migrated ${usersToAdd.length} users to company_members`);
    usersToAdd.forEach(user => {
      console.log(`   - Added: ${user.email}`);
    });

    return true;
  } catch (error) {
    console.error('💥 Error in migration:', error);
    return false;
  }
};

export const getConfirmedTeamMembers = async (companyId: string) => {
  try {
    console.log('🔍 Fetching confirmed team members from company_members...');
    
    const { data: members, error } = await supabase
      .from('company_members')
      .select(`
        *,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url,
          email_confirmed_at
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('profiles.email_confirmed_at', 'is', null)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    console.log(`Found ${members?.length || 0} confirmed team members`);
    
    return members?.map(member => ({
      id: member.profiles.id,
      email: member.profiles.email,
      full_name: member.profiles.full_name,
      avatar_url: member.profiles.avatar_url,
      role: member.role,
      status: member.status,
      created_at: member.joined_at,
      last_sign_in_at: null,
      email_confirmed_at: member.profiles.email_confirmed_at,
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
    console.log('🔍 Fetching truly pending invitations...');
    
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

    // Get all confirmed users
    const { data: confirmedUsers } = await supabase
      .from('profiles')
      .select('email')
      .not('email_confirmed_at', 'is', null);

    const confirmedEmails = new Set(confirmedUsers?.map(u => u.email.toLowerCase()) || []);
    
    // Filter out invitations for users who are already registered
    const trulyPending = invitations?.filter(invitation => 
      !confirmedEmails.has(invitation.email.toLowerCase())
    ) || [];

    console.log(`Found ${trulyPending.length} truly pending invitations (filtered from ${invitations?.length || 0} total)`);
    
    return trulyPending.map(invitation => ({
      ...invitation,
      company_name: invitation.companies?.name
    }));
  } catch (error) {
    console.error('💥 Error fetching pending invitations:', error);
    return [];
  }
};

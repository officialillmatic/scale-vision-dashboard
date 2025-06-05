
import { supabase } from "@/integrations/supabase/client";

export const migrateRegisteredUsers = async (companyId: string) => {
  try {
    console.log('🔄 Starting migration of registered users to company_members...');
    
    // Get all confirmed users (registered users) from auth.users via profiles
    const { data: confirmedUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        full_name,
        users!inner(email_confirmed_at)
      `)
      .not('users.email_confirmed_at', 'is', null);

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
    
    // First, try to get members with user_id JOIN
    const { data: membersWithUserId, error: joinError } = await supabase
      .from('company_members')
      .select(`
        *,
        profiles!inner(
          id, 
          email, 
          full_name, 
          avatar_url,
          users!inner(email_confirmed_at)
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .not('profiles.users.email_confirmed_at', 'is', null)
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
      console.log(`Processing ${membersWithEmail.length} email-only members...`);
      for (const member of membersWithEmail) {
        if (member.email) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              id, 
              email, 
              full_name, 
              avatar_url,
              users!inner(email_confirmed_at)
            `)
            .eq('email', member.email)
            .not('users.email_confirmed_at', 'is', null)
            .maybeSingle();
          
          if (profileError) {
            console.error(`Error fetching profile for ${member.email}:`, profileError);
            continue;
          }
          
          if (profile && profile.users && profile.users.length > 0) {
            emailOnlyResults.push({
              ...member,
              profiles: {
                ...profile,
                email_confirmed_at: profile.users[0].email_confirmed_at
              }
            });
            console.log(`   - Found profile for: ${member.email}`);
          } else {
            console.log(`   - No confirmed profile found for: ${member.email}`);
          }
        }
      }
    }

    // Combine both results
    const allMembers = [...(membersWithUserId || []), ...emailOnlyResults];
    
    console.log(`Found ${allMembers.length} confirmed team members total`);
    console.log(`- With user_id: ${membersWithUserId?.length || 0}`);
    console.log(`- Email-only: ${emailOnlyResults.length}`);
    
    return allMembers.map(member => ({
      id: member.profiles.id,
      email: member.profiles.email,
      full_name: member.profiles.full_name,
      avatar_url: member.profiles.avatar_url,
      role: member.role,
      status: member.status,
      created_at: member.joined_at || member.created_at,
      last_sign_in_at: null,
      email_confirmed_at: member.profiles.email_confirmed_at || (member.profiles.users?.[0]?.email_confirmed_at),
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

    // Get all confirmed users from users table (corrected)
    const { data: confirmedUsers } = await supabase
      .from('profiles')
      .select(`
        email,
        users!inner(email_confirmed_at)
      `)
      .not('users.email_confirmed_at', 'is', null);

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

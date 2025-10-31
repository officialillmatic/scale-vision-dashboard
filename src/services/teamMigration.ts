import { supabase } from "@/integrations/supabase/client";

export const migrateRegisteredUsers = async (companyId: string) => {
  try {
    console.log('🔄 Starting migration of registered users to company_members...');
    
    // Get all confirmed users from profiles (simplified)
    const { data: confirmedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

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

// FUNCIÓN CORREGIDA - Aplicando lógica de SuperAdminCredits para Super Admins
export const getConfirmedTeamMembers = async (companyId: string, isSuperAdmin?: boolean) => {
  try {
    console.log('🔍 Fetching confirmed team members...');
    console.log('🔍 Super Admin mode:', isSuperAdmin);
    console.log('🔍 Company ID:', companyId);
    
    // NUEVA LÓGICA: Para Super Admins, usar la misma lógica que SuperAdminCredits
    if (isSuperAdmin) {
      console.log('✅ [SUPER ADMIN] Using SuperCredits logic for all users');
      
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
        email_confirmed_at: profile.created_at,
        user_details: {
          name: profile.name || profile.email?.split('@')?.[0] || 'User',
          email: profile.email || 'No email'
        }
      })) || [];
    }

    // LÓGICA ORIGINAL: Para usuarios normales, mantener exactamente igual
    console.log('🔍 [REGULAR USER] Using original company_members logic');
    
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
      console.log(`Processing ${membersWithEmail.length} email-only members...`);
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
            console.log(`   - Found profile for: ${member.email}`);
          } else {
            console.log(`   - No profile found for: ${member.email}`);
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
    console.log('🔍 Fetching truly pending invitations (ENHANCED DEBUG)...');
    
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

    console.log('🔍 [DEBUG] All invitations:', invitations?.map(i => i.email));

    // Get all profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('email');

    console.log('🔍 [DEBUG] All profile emails:', allProfiles?.map(p => p.email));

    const profileEmails = new Set(allProfiles?.map(p => p.email?.toLowerCase()) || []);
    
    console.log('🔍 [DEBUG] Checking each invitation:');
    
    const trulyPending = invitations?.filter(invitation => {
      const hasProfile = profileEmails.has(invitation.email.toLowerCase());
      console.log(`  📧 ${invitation.email}: ${hasProfile ? '❌ HAS PROFILE (should be removed)' : '✅ NO PROFILE (truly pending)'}`);
      return !hasProfile;
    }) || [];

    console.log('🔍 [DEBUG] Final truly pending:', trulyPending.map(tp => tp.email));

    console.log(`🎯 RESULT: ${trulyPending.length} truly pending invitations (filtered from ${invitations?.length || 0} total)`);
    
    // Debug specific users
    const problemUsers = ['elbazardelasventas@gmail.com', 'familiajyn2024@gmail.com'];
    problemUsers.forEach(email => {
      const isInPending = trulyPending.some(inv => inv.email.toLowerCase() === email.toLowerCase());
      const hasProfile = profileEmails.has(email.toLowerCase());
      const wasInOriginal = invitations?.some(inv => inv.email.toLowerCase() === email.toLowerCase());
      console.log(`🔍 Problem user ${email}:`);
      console.log(`   - Was in original invitations: ${wasInOriginal}`);
      console.log(`   - Has profile: ${hasProfile}`);
      console.log(`   - In final pending list: ${isInPending}`);
      console.log(`   - Should be migrated: ${hasProfile && wasInOriginal && !isInPending}`);
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
    console.log('🚀 MANUAL MIGRATION: Starting...');
    
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
      console.log('❌ Could not fetch data for migration');
      return { success: false, message: 'Could not fetch data' };
    }
    
    const profileEmails = new Set(profiles.map(p => p.email?.toLowerCase()));
    const toMigrate = pending.filter(p => profileEmails.has(p.email.toLowerCase()));
    
    console.log('🔍 Users to migrate:', toMigrate.map(u => u.email));
    
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
    
    console.log(`✅ Successfully migrated ${memberInserts.length} users`);
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

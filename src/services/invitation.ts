import { supabase } from '@/integrations/supabase/client';

export const checkInvitation = async (token: string) => {
  try {
    console.log('🔍 Checking invitation with token:', token);
    
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();
    
    console.log('📊 Invitation data:', data);
    console.log('❌ Invitation error:', error);
    
    if (error || !data) {
      return { 
        valid: false, 
        error: 'Invitation not found or has been removed' 
      };
    }
    
    // Verificar si ya fue aceptada
    if (data.accepted_at) {
      return { 
        valid: false, 
        error: 'This invitation has already been accepted' 
      };
    }
    
    // Verificar si expiró
    if (new Date(data.expires_at) < new Date()) {
      return { 
        valid: false, 
        error: 'This invitation has expired' 
      };
    }
    
    return { 
      valid: true, 
      invitation: {
        id: data.id,
        email: data.email,
        role: data.role,
        company_id: data.company_id,
        company_name: data.company_id ? 'DrScale AI' : 'No Company',
        invitation_token: data.invitation_token,
        expires_at: data.expires_at,
        invited_by: data.invited_by,
        status: data.status,
        created_at: data.created_at
      }
    };
  } catch (error: any) {
    console.error('💥 Error checking invitation:', error);
    return { 
      valid: false, 
      error: 'Error verifying invitation: ' + error.message 
    };
  }
};

export const acceptInvitation = async (token: string, userId: string) => {
  try {
    console.log('🎯 [acceptInvitation] Starting invitation acceptance...');
    console.log('🔑 [acceptInvitation] Token:', token);
    console.log('👤 [acceptInvitation] User ID:', userId);

    // Primero, obtener los datos de la invitación
    const { data: invitationData, error: getError } = await supabase
      .from('team_invitations')
      .select('company_id, role, email')
      .eq('invitation_token', token)
      .single();

    if (getError || !invitationData) {
      console.error('❌ [acceptInvitation] Error getting invitation:', getError);
      return { success: false, error: 'Invitation not found' };
    }

    console.log('📊 [acceptInvitation] Invitation data:', invitationData);

    // 1. Actualizar team_invitations
    console.log('📝 [acceptInvitation] Updating invitation status...');
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId
      })
      .eq('invitation_token', token);

    if (updateError) {
      console.error('❌ [acceptInvitation] Error updating invitation:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ [acceptInvitation] Invitation status updated successfully');

    // 2. Crear registro en tabla users (si no existe)
    console.log('👤 [acceptInvitation] Checking if user exists in users table...');
    const { data: existingUserInUsers, error: usersCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUserInUsers && (!usersCheckError || usersCheckError.code === 'PGRST116')) {
      console.log('👤 [acceptInvitation] Creating user in users table...');
      const { error: usersInsertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: invitationData.email,
          name: invitationData.email,
          created_at: new Date().toISOString()
        });

      if (usersInsertError) {
        console.error('❌ [acceptInvitation] Error creating user in users table:', usersInsertError);
        return { success: false, error: usersInsertError.message };
      }
      console.log('✅ [acceptInvitation] User created in users table successfully');
    } else {
      console.log('ℹ️ [acceptInvitation] User already exists in users table');
    }

    // 3. Actualizar user_profiles con company_id
    console.log('👤 [acceptInvitation] Updating user_profiles with company_id...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        company_id: invitationData.company_id,
        role: invitationData.role
      })
      .eq('id', userId);

    if (profileError) {
      console.error('❌ [acceptInvitation] Error updating user_profiles:', profileError);
      return { success: false, error: profileError.message };
    }

    // 3. Actualizar user_profiles con company_id
    console.log('👤 [acceptInvitation] Updating user_profiles with company_id...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        company_id: invitationData.company_id,
        role: invitationData.role
      })
      .eq('id', userId);

    if (profileError) {
      console.error('❌ [acceptInvitation] Error updating user_profiles:', profileError);
      return { success: false, error: profileError.message };
    }

    console.log('✅ [acceptInvitation] User_profiles updated successfully');

    // 4. Verificar si el usuario ya existe en company_members (por si acaso)
    console.log('🔍 [acceptInvitation] Checking existing company_members record...');
    const { data: existingUser, error: checkError } = await supabase
      .from('company_members')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', invitationData.company_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [acceptInvitation] Error checking existing user:', checkError);
      // No fallar por esto, continuar
    }

    if (!existingUser) {
    // 4. Verificar si el usuario ya existe en company_members (por si acaso)
    console.log('🔍 [acceptInvitation] Checking existing company_members record...');
    const { data: existingUser, error: checkError } = await supabase
      .from('company_members')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', invitationData.company_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [acceptInvitation] Error checking existing user:', checkError);
      // No fallar por esto, continuar
    }

    if (!existingUser) {
      // 5. Crear registro en company_members también (para relación adicional)
      // 5. Crear registro en company_members también (para relación adicional)
      console.log('👥 [acceptInvitation] Creating company_members record...');
      const { error: insertError } = await supabase
        .from('company_members')
        .insert({
          user_id: userId,
          company_id: invitationData.company_id,
          role: invitationData.role,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ [acceptInvitation] Error creating company_members:', insertError);
        // No fallar por esto, el user_profiles ya está actualizado
      } else {
        console.log('✅ [acceptInvitation] Company_members record created successfully');
      }
    }
    console.log('🎉 [acceptInvitation] Invitation accepted successfully!');
    
    return { success: true };

  } catch (error: any) {
    console.error('💥 [acceptInvitation] Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

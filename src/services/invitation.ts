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

    // 2. Verificar si el usuario ya existe en company_users (por si acaso)
    console.log('🔍 [acceptInvitation] Checking existing company_users record...');
    const { data: existingUser, error: checkError } = await supabase
      .from('company_users')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', invitationData.company_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [acceptInvitation] Error checking existing user:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingUser) {
      console.log('⚠️ [acceptInvitation] User already exists in company, skipping insert');
      return { success: true };
    }

    // 3. Crear registro en company_users
    console.log('👥 [acceptInvitation] Creating company_users record...');
    console.log('📊 [acceptInvitation] Company ID:', invitationData.company_id);
    console.log('👤 [acceptInvitation] User ID:', userId);
    console.log('🏷️ [acceptInvitation] Role:', invitationData.role);
    
    const { error: insertError } = await supabase
      .from('company_users')
      .insert({
        user_id: userId,
        company_id: invitationData.company_id,
        role: invitationData.role,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ [acceptInvitation] Error creating company_users:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ [acceptInvitation] Company_users record created successfully');
    console.log('🎉 [acceptInvitation] Invitation accepted successfully!');
    
    return { success: true };

  } catch (error: any) {
    console.error('💥 [acceptInvitation] Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

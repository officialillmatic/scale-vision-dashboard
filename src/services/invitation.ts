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
    const { error } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId
      })
      .eq('invitation_token', token);

    if (error) {
      console.error('❌ Error accepting invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('💥 Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
};

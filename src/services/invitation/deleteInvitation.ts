import { supabase } from '@/integrations/supabase/client';

/**
 * Elimina completamente una invitación de la base de datos
 * (No solo cambia el status, sino que borra el registro)
 */
export async function deleteInvitationCompletely(invitationId: string) {
  console.log("🗑️ [deleteInvitation] Deleting invitation completely:", invitationId);
  
  try {
    // ✅ ELIMINAR de team_invitations
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error("❌ [deleteInvitation] Error deleting from team_invitations:", deleteError);
      throw new Error(`Failed to delete invitation: ${deleteError.message}`);
    }

    console.log("✅ [deleteInvitation] Invitation deleted successfully from team_invitations");

    // ✅ TAMBIÉN ELIMINAR de company_invitations si existe esa tabla
    try {
      const { error: companyDeleteError } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId);

      if (companyDeleteError && !companyDeleteError.message.includes('does not exist')) {
        console.warn("⚠️ [deleteInvitation] Error deleting from company_invitations:", companyDeleteError);
        // No hacer throw aquí porque no es crítico
      } else {
        console.log("✅ [deleteInvitation] Also deleted from company_invitations (if exists)");
      }
    } catch (companyError) {
      console.warn("⚠️ [deleteInvitation] Company invitations table might not exist:", companyError);
    }

    return { success: true, message: "Invitation deleted completely" };

  } catch (error: any) {
    console.error("💥 [deleteInvitation] Unexpected error:", error);
    throw new Error(`Failed to delete invitation: ${error.message}`);
  }
}

/**
 * Elimina múltiples invitaciones de una vez
 */
export async function deleteManyInvitations(invitationIds: string[]) {
  console.log("🗑️ [deleteManyInvitations] Deleting multiple invitations:", invitationIds.length);
  
  try {
    // ✅ ELIMINAR múltiples de team_invitations
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .in('id', invitationIds);

    if (deleteError) {
      console.error("❌ [deleteManyInvitations] Error deleting from team_invitations:", deleteError);
      throw new Error(`Failed to delete invitations: ${deleteError.message}`);
    }

    console.log("✅ [deleteManyInvitations] Invitations deleted successfully");

    // ✅ TAMBIÉN ELIMINAR de company_invitations si existe
    try {
      const { error: companyDeleteError } = await supabase
        .from('company_invitations')
        .delete()
        .in('id', invitationIds);

      if (companyDeleteError && !companyDeleteError.message.includes('does not exist')) {
        console.warn("⚠️ [deleteManyInvitations] Error deleting from company_invitations:", companyDeleteError);
      }
    } catch (companyError) {
      console.warn("⚠️ [deleteManyInvitations] Company invitations table might not exist:", companyError);
    }

    return { 
      success: true, 
      message: `${invitationIds.length} invitations deleted completely`,
      deletedCount: invitationIds.length 
    };

  } catch (error: any) {
    console.error("💥 [deleteManyInvitations] Unexpected error:", error);
    throw new Error(`Failed to delete invitations: ${error.message}`);
  }
}

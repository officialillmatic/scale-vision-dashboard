import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function sendInvitationEmail(invitation: any) {
  console.log("Sending invitation email using Supabase Auth...");
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Crear un usuario temporal con la invitación
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      invitation.email,
      {
        data: {
          company_id: invitation.company_id,
          role: invitation.role,
          invitation_token: invitation.token,
          invited_by: invitation.invited_by
        },
        redirectTo: `${Deno.env.get("SITE_URL") || "https://drscaleai.com"}/accept-invitation?token=${invitation.token}`
      }
    );

    if (error) {
      console.error("Error sending invitation email:", error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log("Invitation email sent successfully:", data);
    return data;

  } catch (error) {
    console.error("Error in sendInvitationEmail:", error);
    throw error;
  }
}
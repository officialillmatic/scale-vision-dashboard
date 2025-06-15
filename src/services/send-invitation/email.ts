import { supabase } from '@/integrations/supabase/client';

interface InvitationData {
  email: string;
  token: string;
  role: string;
  company_id?: string;
  company_name?: string;
  invited_by_email?: string;
}

export async function sendInvitationEmail(invitation: InvitationData) {
  console.log("🚀 [sendInvitationEmail] Starting real email send...");
  
  try {
    console.log("📧 [sendInvitationEmail] Recipient:", invitation.email);
    console.log("🏷️ [sendInvitationEmail] Role:", invitation.role);
    console.log("🔑 [sendInvitationEmail] Has token:", !!invitation.token);
    
    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: invitation.email,
        token: invitation.token,
        role: invitation.role,
        company_name: invitation.company_name || 'Dr. Scale AI',
        invited_by_email: invitation.invited_by_email
      }
    });
    
    if (error) {
      console.error("❌ [sendInvitationEmail] Supabase function error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    
    if (!data || !data.success) {
      console.error("❌ [sendInvitationEmail] Email sending failed:", data?.error);
      throw new Error(`Email sending failed: ${data?.error || 'Unknown error'}`);
    }
    
    console.log("✅ [sendInvitationEmail] Email sent successfully!");
    console.log("📨 [sendInvitationEmail] Email ID:", data.email_id);
    
    return { 
      success: true, 
      message: "Email sent successfully",
      email_id: data.email_id
    };
    
  } catch (error: any) {
    console.error("💥 [sendInvitationEmail] Error:", error);
    
    // Fallback: Log the invitation URL for manual sending
    const invitationUrl = `https://drscaleai.com/accept-invitation?token=${invitation.token}`;
    console.log("🔗 [sendInvitationEmail] FALLBACK - Invitation URL:", invitationUrl);
    
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
}

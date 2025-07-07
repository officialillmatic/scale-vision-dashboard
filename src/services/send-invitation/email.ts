import { supabase } from '@/integrations/supabase/client';

interface InvitationData {
  email: string;
  token: string;
  role: string;
  company_id?: string;
  company_name?: string;
  invited_by_email?: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: string;
  recipient?: string;
  role?: string;
  invitationUrl: string; // ✅ Siempre incluimos la URL
}

export async function sendInvitationEmail(invitation: InvitationData): Promise<EmailResponse> {
  console.log("🚀 [sendInvitationEmail] Starting invitation process...");
  
  // ✅ PASO 1: Generar URL de invitación (SIEMPRE se mantiene)
  const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
  console.log("🔗 [sendInvitationEmail] Invitation URL generated:", invitationUrl);
  
  try {
    console.log("📧 [sendInvitationEmail] Recipient:", invitation.email);
    console.log("🏷️ [sendInvitationEmail] Role:", invitation.role);
    console.log("🔑 [sendInvitationEmail] Has token:", !!invitation.token);
    console.log("🏢 [sendInvitationEmail] Company:", invitation.company_name || 'Dr. Scale AI');
    
    // ✅ PASO 2: Intentar enviar email automáticamente via Edge Functions
    console.log("📬 [sendInvitationEmail] Calling Supabase Edge Function...");
    
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        company_id: invitation.company_id || undefined
      }
    });
    
    // ✅ VERIFICAR si hay error en la llamada a Supabase
    if (error) {
      console.error("❌ [sendInvitationEmail] Supabase function error:", error);
      
      // ⚠️ Email falló, pero URL está disponible
      console.log("⚠️ [sendInvitationEmail] Email failed, but URL is ready for manual sharing");
      
      return {
        success: false,
        message: `Error sending email: ${error.message}. Use manual URL.`,
        invitationUrl,
        provider: 'manual'
      };
    }
    
    // ✅ VERIFICAR la respuesta de la función Edge Functions
    if (!data || !data.success) {
      console.error("❌ [sendInvitationEmail] Email sending failed:", data?.error || 'Unknown error');
      
      // ⚠️ Email falló, pero URL está disponible  
      console.log("⚠️ [sendInvitationEmail] Email failed, but URL is ready for manual sharing");
      
      return {
        success: false,
        message: `Email sending failed: ${data?.error || 'Unknown error'}. Use manual URL.`,
        invitationUrl,
        provider: 'manual'
      };
    }
    
    // ✅ SUCCESS: Email enviado correctamente Y URL disponible
    console.log("✅ [sendInvitationEmail] Email sent successfully!");
    console.log("📨 [sendInvitationEmail] Message ID:", data.messageId);
    console.log("🎯 [sendInvitationEmail] Provider:", data.provider);
    console.log("👤 [sendInvitationEmail] Recipient:", data.recipient);
    
    return { 
      success: true, 
      message: `Email sent successfully via ${data.provider || 'Brevo'}`,
      messageId: data.messageId,
      provider: data.provider || 'brevo',
      recipient: data.recipient || invitation.email,
      role: data.role || invitation.role,
      invitationUrl // ✅ URL también disponible para backup
    };
    
  } catch (error: any) {
    console.error("💥 [sendInvitationEmail] Unexpected error:", error);
    
    // ✅ FALLBACK: Siempre devolvemos la URL manual si algo sale mal
    console.log("🔗 [sendInvitationEmail] FALLBACK - Manual URL ready:", invitationUrl);
    
    return {
      success: false,
      message: `Failed to send invitation email: ${error.message}. Manual URL generated.`,
      invitationUrl,
      provider: 'manual'
    };
  }
}

// ✅ FUNCIÓN AUXILIAR: Para obtener solo la URL (si la necesitas en otro lugar)
export function generateInvitationUrl(token: string): string {
  return `${window.location.origin}/accept-invitation?token=${token}`;
}

// ✅ FUNCIÓN AUXILIAR: Para reenviar invitaciones (utilizada en TeamInvitations.tsx)
export async function resendInvitationEmail(invitation: InvitationData): Promise<EmailResponse> {
  console.log("🔄 [resendInvitationEmail] Resending invitation...");
  return await sendInvitationEmail(invitation);
}

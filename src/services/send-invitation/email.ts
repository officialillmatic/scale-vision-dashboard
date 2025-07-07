import { supabase } from '@/integrations/supabase/client';

// ✅ URL CORRECTA HARDCODEADA COMO FALLBACK
const CORRECT_SUPABASE_URL = 'https://jqkkhwoybcenxqpvodev.supabase.co';

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
  invitationUrl: string;
}

// ✅ FUNCIÓN PARA OBTENER TOKEN DE AUTENTICACIÓN
const getAuthToken = (): string | null => {
  try {
    // Buscar en localStorage con ambas posibles keys
    const authKeys = [
      'sb-jqkhwoyqcenxqpvodev-auth-token',  // key incorrecta
      'sb-jqkkhwoybcenxqpvodev-auth-token', // key correcta
    ];
    
    for (const key of authKeys) {
      const authData = localStorage.getItem(key);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.access_token) {
          console.log("🔑 [getAuthToken] Token found in:", key);
          return parsed.access_token;
        }
      }
    }
    
    console.warn("⚠️ [getAuthToken] No auth token found");
    return null;
    
  } catch (error) {
    console.error("❌ [getAuthToken] Error getting token:", error);
    return null;
  }
};

// ✅ FUNCIÓN PRINCIPAL DE ENVÍO DE EMAIL
export async function sendInvitationEmail(invitation: InvitationData): Promise<EmailResponse> {
  console.log("🚀 [sendInvitationEmail] Starting invitation process...");
  
  // ✅ PASO 1: Generar URL de invitación (SIEMPRE se mantiene)
  const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
  console.log("🔗 [sendInvitationEmail] Invitation URL generated:", invitationUrl);
  
  try {
    console.log("📧 [sendInvitationEmail] Recipient:", invitation.email);
    console.log("🏷️ [sendInvitationEmail] Role:", invitation.role);
    console.log("🔑 [sendInvitationEmail] Has token:", !!invitation.token);
    
    // ✅ MÉTODO 1: Intentar con supabase client (si está disponible)
    if (supabase && supabase.functions) {
      console.log("📡 [sendInvitationEmail] Trying Supabase client...");
      
      try {
        const { data, error } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            company_id: invitation.company_id || null
          }
        });
        
        if (!error && data && data.success) {
          console.log("✅ [sendInvitationEmail] Success with Supabase client!");
          return {
            success: true,
            message: `Email sent successfully via ${data.provider || 'Brevo'}`,
            messageId: data.messageId,
            provider: data.provider || 'brevo',
            recipient: data.recipient || invitation.email,
            role: data.role || invitation.role,
            invitationUrl
          };
        } else {
          console.warn("⚠️ [sendInvitationEmail] Supabase client failed, trying direct fetch...");
          console.warn("⚠️ Error:", error);
        }
        
      } catch (supabaseError) {
        console.warn("⚠️ [sendInvitationEmail] Supabase client error:", supabaseError);
      }
    }
    
    // ✅ MÉTODO 2: Usar fetch directo con URL correcta
    console.log("🌐 [sendInvitationEmail] Using direct fetch with correct URL...");
    
    const authToken = getAuthToken();
    const functionUrl = `${CORRECT_SUPABASE_URL}/functions/v1/send-invitation-email`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log("🔑 [sendInvitationEmail] Using auth token");
    } else {
      console.warn("⚠️ [sendInvitationEmail] No auth token available");
    }
    
    const requestBody = {
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      company_id: invitation.company_id || null
    };
    
    console.log("📤 [sendInvitationEmail] Sending to:", functionUrl);
    console.log("📤 [sendInvitationEmail] Body:", requestBody);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log("📥 [sendInvitationEmail] Response status:", response.status, response.statusText);
    
    const responseText = await response.text();
    console.log("📥 [sendInvitationEmail] Response body:", responseText);
    
    if (response.status === 200) {
      try {
        const jsonResponse = JSON.parse(responseText);
        
        if (jsonResponse.success) {
          console.log("✅ [sendInvitationEmail] SUCCESS with direct fetch!");
          return {
            success: true,
            message: `Email sent successfully via ${jsonResponse.provider || 'Brevo'}`,
            messageId: jsonResponse.messageId,
            provider: jsonResponse.provider || 'brevo',
            recipient: jsonResponse.recipient || invitation.email,
            role: jsonResponse.role || invitation.role,
            invitationUrl
          };
        } else {
          console.error("❌ [sendInvitationEmail] Function returned error:", jsonResponse.error);
          return {
            success: false,
            message: `Email function error: ${jsonResponse.error || 'Unknown error'}. Use manual URL.`,
            invitationUrl,
            provider: 'manual'
          };
        }
        
      } catch (parseError) {
        console.error("❌ [sendInvitationEmail] Error parsing JSON response:", parseError);
        return {
          success: false,
          message: `Response parsing error. Use manual URL.`,
          invitationUrl,
          provider: 'manual'
        };
      }
      
    } else if (response.status === 401 || response.status === 403) {
      console.error("🔐 [sendInvitationEmail] Authentication error");
      return {
        success: false,
        message: `Authentication error (${response.status}). Use manual URL.`,
        invitationUrl,
        provider: 'manual'
      };
      
    } else {
      console.error("❌ [sendInvitationEmail] HTTP error:", response.status, responseText);
      return {
        success: false,
        message: `HTTP error ${response.status}. Use manual URL.`,
        invitationUrl,
        provider: 'manual'
      };
    }
    
  } catch (error: any) {
    console.error("💥 [sendInvitationEmail] Unexpected error:", error);
    
    return {
      success: false,
      message: `Failed to send invitation email: ${error.message}. Manual URL generated.`,
      invitationUrl,
      provider: 'manual'
    };
  }
}

// ✅ FUNCIÓN AUXILIAR: Para obtener solo la URL
export function generateInvitationUrl(token: string): string {
  return `${window.location.origin}/accept-invitation?token=${token}`;
}

// ✅ FUNCIÓN AUXILIAR: Para reenviar invitaciones
export async function resendInvitationEmail(invitation: InvitationData): Promise<EmailResponse> {
  console.log("🔄 [resendInvitationEmail] Resending invitation...");
  return await sendInvitationEmail(invitation);
}

// ✅ FUNCIÓN DE TEST: Para verificar que todo funciona
export async function testEmailConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  console.log("🧪 [testEmailConnection] Testing email service...");
  
  try {
    const testInvitation: InvitationData = {
      email: 'test@example.com',
      token: 'test-token-' + Date.now(),
      role: 'user',
      company_name: 'Test Company'
    };
    
    const result = await sendInvitationEmail(testInvitation);
    
    return {
      success: result.success,
      message: result.message,
      details: {
        provider: result.provider,
        messageId: result.messageId,
        url: result.invitationUrl
      }
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

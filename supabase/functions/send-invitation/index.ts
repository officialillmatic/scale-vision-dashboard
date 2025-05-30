import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { getCurrentUserId } from "./auth.ts";
import { validateInvitationRequest } from "./validation.ts";
import { createInvitationRecord } from "./database.ts";
import { sendInvitationEmail } from "./email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, accept, accept-profile, content-profile',
  'Access-Control-Max-Age': '86400'
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  console.log(`[SEND-INVITATION] ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Get current user ID
    const currentUserId = await getCurrentUserId(req);
    if (!currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Parse and validate request
    const requestData = await req.json();
    console.log("Received invitation request:", requestData);
    
    const validationResult = validateInvitationRequest(requestData);
    if (!validationResult.isValid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const { companyId, email, role } = validationResult.data;

    // Create invitation in database
    const invitation = await createInvitationRecord(
      supabaseClient,
      companyId,
      email,
      role,
      currentUserId
    );

    // Send invitation email
    await sendInvitationEmail(invitation);

    console.log("Invitation sent successfully:", invitation.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationId: invitation.id,
        message: 'Invitation sent successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error: any) {
    console.error("Send invitation error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

interface InvitationRequest {
  companyId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

serve(async (req) => {
  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user info
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication error', details: userError }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse request body
    const { companyId, email, role } = await req.json() as InvitationRequest;

    // Validate inputs
    if (!companyId || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyId, email, or role' }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, member, or viewer' }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if the user is authorized to send invitations for this company (admin or owner)
    const { data: adminCheck, error: adminError } = await supabaseClient.rpc(
      'is_admin_of_company',
      { company_id: companyId }
    );

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ 
          error: 'You must be a company admin to send invitations',
          details: adminError
        }),
        { headers: { "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation, error: inviteCheckError } = await supabaseClient
      .from('company_invitations')
      .select('id, status, expires_at')
      .eq('company_id', companyId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (inviteCheckError && !inviteCheckError.message.includes('No rows found')) {
      return new Response(
        JSON.stringify({ error: 'Error checking existing invitations', details: inviteCheckError }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (existingInvitation) {
      // If there's an existing invitation and it hasn't expired yet, don't create a new one
      const expiryDate = new Date(existingInvitation.expires_at);
      if (expiryDate > new Date()) {
        return new Response(
          JSON.stringify({ message: 'Invitation already sent and is still valid' }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }

      // If the invitation expired, update it instead of creating a new one
      const expiryTimestamp = new Date();
      expiryTimestamp.setDate(expiryTimestamp.getDate() + 7); // Expire in 7 days
      
      const { error: updateError } = await supabaseClient
        .from('company_invitations')
        .update({
          role,
          token: crypto.randomUUID(),
          status: 'pending',
          expires_at: expiryTimestamp.toISOString()
        })
        .eq('id', existingInvitation.id);
        
      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update invitation', details: updateError }),
          { headers: { "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ message: 'Invitation updated and sent' }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create a new invitation
    const token = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Expire in 7 days

    const { error: insertError } = await supabaseClient
      .from('company_invitations')
      .insert({
        company_id: companyId,
        email,
        role,
        token,
        expires_at: expiryDate.toISOString()
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: insertError }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // TODO: Send email with invitation link
    // This would typically use a service like SendGrid, Mailgun, etc.
    // For now, we'll just return success

    return new Response(
      JSON.stringify({ 
        message: 'Invitation sent successfully', 
        email,
        token
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

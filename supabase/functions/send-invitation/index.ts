
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { Resend } from "https://esm.sh/resend@1.0.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 401 
        }
      );
    }

    // Parse the JWT
    const token = authHeader.replace("Bearer ", "");
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 401 
        }
      );
    }
    
    // Parse the request body
    const { companyId, email, role } = await req.json();
    
    if (!companyId || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      );
    }
    
    // Check if the user is an admin or owner of the company
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc(
      "is_admin_of_company",
      { company_id: companyId }
    );
    
    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check user permissions" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Check if the user is a company owner
    const { data: isOwner, error: ownerCheckError } = await supabaseClient.rpc(
      "is_company_owner",
      { company_id: companyId }
    );
    
    if (ownerCheckError) {
      console.error("Owner check error:", ownerCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check user permissions" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: "Not authorized to invite users to this company" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 403 
        }
      );
    }
    
    // Get the company details
    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
    
    if (companyError) {
      console.error("Company fetch error:", companyError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch company details" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Generate an invitation token
    const token_uuid = crypto.randomUUID();
    
    // Create an invitation that expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Insert the invitation
    const { data: invitation, error: invitationError } = await supabaseClient
      .from("company_invitations")
      .insert({
        company_id: companyId,
        email,
        role,
        token: token_uuid,
        expires_at: expiresAt.toISOString(),
        status: "pending"
      })
      .select()
      .single();
    
    if (invitationError) {
      console.error("Invitation creation error:", invitationError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Send the invitation email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    const resend = new Resend(resendApiKey);
    
    // Get frontend URL from environment
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/register?invitation=${token_uuid}`;
    
    // Send the email
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "EchoWave <no-reply@echowave.com>",
        to: email,
        subject: `You've been invited to join ${company.name} on EchoWave`,
        html: `
          <h1>You've been invited to join ${company.name}</h1>
          <p>You've been invited to join ${company.name} on EchoWave as a ${role}.</p>
          <p>Click the link below to accept the invitation and create your account:</p>
          <p><a href="${invitationUrl}">Accept invitation</a></p>
          <p>This invitation will expire in 7 days.</p>
        `
      });
      
      if (emailError) {
        console.error("Email sending error:", emailError);
        return new Response(
          JSON.stringify({ error: "Failed to send invitation email" }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 500 
          }
        );
      }
    } catch (error) {
      console.error("Email sending exception:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send invitation email" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Return success
    return new Response(
      JSON.stringify({ success: true, invitation }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Unexpected error occurred",
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { Resend } from "https://esm.sh/resend@1.0.0";
import { corsHeaders } from "../_shared/cors.ts";

// Request data interface
interface InvitationRequest {
  companyId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitationId?: string;
}

// Response data interface
interface InvitationResponse {
  success: boolean;
  invitation?: any;
  error?: string;
  details?: string;
}

// Get Supabase client with service role key
function getSupabaseClient(token?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
  });
}

// Check user permissions (admin or owner)
async function checkUserPermissions(supabase: any, companyId: string) {
  try {
    // Check if the user is an admin of the company
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      "is_admin_of_company",
      { company_id: companyId }
    );
    
    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError);
      throw new Error("Failed to check user admin permissions");
    }
    
    // Check if the user is a company owner
    const { data: isOwner, error: ownerCheckError } = await supabase.rpc(
      "is_company_owner",
      { company_id: companyId }
    );
    
    if (ownerCheckError) {
      console.error("Owner check error:", ownerCheckError);
      throw new Error("Failed to check user owner permissions");
    }
    
    return { isAdmin, isOwner };
  } catch (error) {
    console.error("Permission check error:", error);
    throw error;
  }
}

// Get company details
async function getCompanyDetails(supabase: any, companyId: string) {
  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
    
    if (companyError) {
      console.error("Company fetch error:", companyError);
      throw new Error("Failed to fetch company details");
    }
    
    return company;
  } catch (error) {
    console.error("Error fetching company:", error);
    throw error;
  }
}

// Create invitation record
async function createInvitation(supabase: any, data: InvitationRequest) {
  try {
    // Generate an invitation token
    const token_uuid = crypto.randomUUID();
    
    // Create an invitation that expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Insert the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("company_invitations")
      .insert({
        company_id: data.companyId,
        email: data.email,
        role: data.role,
        token: token_uuid,
        expires_at: expiresAt.toISOString(),
        status: "pending"
      })
      .select()
      .single();
    
    if (invitationError) {
      console.error("Invitation creation error:", invitationError);
      throw new Error("Failed to create invitation");
    }
    
    return { invitation, token: token_uuid };
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
}

// Send invitation email
async function sendInvitationEmail(email: string, companyName: string, token: string) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }
    
    const resend = new Resend(resendApiKey);
    
    // Get frontend URL from environment
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/register?invitation=${token}`;
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Dr. Scale <no-reply@drscale.com>",
      to: email,
      subject: `You've been invited to join ${companyName} on Dr. Scale`,
      html: `
        <h1>You've been invited to join ${companyName}</h1>
        <p>You've been invited to join ${companyName} on Dr. Scale as a ${email.role}.</p>
        <p>Click the link below to accept the invitation and create your account:</p>
        <p><a href="${invitationUrl}">Accept invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
      `
    });
    
    if (emailError) {
      console.error("Email sending error:", emailError);
      throw new Error("Failed to send invitation email");
    }
    
    return emailData;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Main handler function
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
    const supabase = getSupabaseClient(token);
    
    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    const requestData: InvitationRequest = await req.json();
    const { companyId, email, role } = requestData;
    
    if (!companyId || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      );
    }
    
    // Check user permissions
    try {
      const { isAdmin, isOwner } = await checkUserPermissions(supabase, companyId);
      
      if (!isAdmin && !isOwner) {
        return new Response(
          JSON.stringify({ error: "Not authorized to invite users to this company" }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 403 
          }
        );
      }
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Get company details
    let company;
    try {
      company = await getCompanyDetails(supabase, companyId);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Create invitation
    let invitation, token;
    try {
      const result = await createInvitation(supabase, requestData);
      invitation = result.invitation;
      token = result.token;
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Send the invitation email
    try {
      await sendInvitationEmail(email, company.name, token);
    } catch (error: any) {
      // Don't fail the entire request if email fails, just log it
      console.error("Email sending failed:", error.message);
      
      // Return success with warning about email
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation,
          warning: "Invitation created but email could not be sent. Please check your email configuration." 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 200 
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
  } catch (error: any) {
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

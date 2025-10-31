
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { createErrorResponse } from "./corsUtils.ts";

// Validate auth token and get user
export async function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: createErrorResponse('No authorization header', 401) };
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Create a Supabase client with the token
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: createErrorResponse('Missing Supabase configuration', 500) };
  }
  
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the JWT and get the user
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    return { error: createErrorResponse('Invalid token', 401) };
  }

  return { user, supabaseClient };
}

// Get company ID for the user
export async function getUserCompany(supabaseClient: any, userId: string) {
  // Try to get the user's company
  const { data: company, error: companyError } = await supabaseClient
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  
  if (company) {
    return { companyId: company.id, isOwner: true };
  } 

  // Check if user is a member of a company
  const { data: membership, error: membershipError } = await supabaseClient
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (membership) {
    return { 
      companyId: membership.company_id, 
      isOwner: false,
      role: membership.role 
    };
  }

  return { error: createErrorResponse('No company found for user', 400) };
}

// Check if the user has access to the company
export async function checkCompanyAccess(supabaseClient: any, companyId: string, userId: string) {
  const { data: hasAccess, error: accessError } = await supabaseClient.rpc(
    "is_company_member",
    { p_company_id: companyId, p_user_id: userId }
  );
  
  if (accessError || !hasAccess) {
    return { error: createErrorResponse('User does not have access to this company', 403) };
  }

  return { hasAccess: true };
}

// Check if user is admin for the company
export async function checkAdminAccess(supabaseClient: any, companyId: string, userId: string) {
  // First check if user is owner
  const { data: isOwner, error: ownerError } = await supabaseClient.rpc(
    "is_company_owner",
    { company_id: companyId }
  );
  
  if (isOwner) {
    return { hasAdminAccess: true, isOwner: true };
  }
  
  // Then check if user is admin
  const { data: isAdmin, error: adminError } = await supabaseClient.rpc(
    "is_admin_of_company",
    { company_id: companyId }
  );
  
  if (adminError) {
    return { error: createErrorResponse('Error checking admin status', 500) };
  }
  
  if (!isAdmin) {
    return { error: createErrorResponse('User does not have admin access to this company', 403) };
  }

  return { hasAdminAccess: true, isOwner: false };
}

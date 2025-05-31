import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createErrorResponse } from "../_shared/corsUtils.ts";

export async function getCompanyDetails(supabase: any, companyId: string) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, owner_id")
    .eq("id", companyId)
    .single();
    
  if (companyError || !company) {
    console.error("Company not found:", companyError);
    throw createErrorResponse("Company not found", 404);
  }
  
  return company;
}

export async function checkExistingInvitation(supabase: any, companyId: string, email: string) {
  const { data: existingInvites, error: checkError } = await supabase
    .from("company_invitations_raw")  // ← CAMBIADO a _raw
    .select("id")
    .eq("company_id", companyId)
    .eq("email", email)
    .eq("status", "pending");
    
  if (checkError) {
    console.error("Error checking existing invitations:", checkError);
  }
    
  if (existingInvites && existingInvites.length > 0) {
    throw createErrorResponse("An invitation for this email already exists", 409);
  }
}

export async function createInvitationRecord(
  supabase: any, 
  companyId: string, 
  email: string, 
  role: string, 
  currentUserId: string | null
) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  console.log("Creating invitation with data:", {
    company_id: companyId,
    email,
    role,
    token,
    expires_at: expiresAt.toISOString(),
    status: "pending",
    invited_by: currentUserId
  });

  const { data: newInvitation, error: createError } = await supabase
    .from("company_invitations_raw")
    .insert({
      company_id: companyId,
      email,
      role,
      token,
      expires_at: expiresAt.toISOString(),
      status: "pending",
      invited_by: currentUserId
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating invitation:", createError);
    
    if (createError.message && createError.message.includes("duplicate key")) {
      throw createErrorResponse("An invitation for this email already exists", 409);
    }
    
    throw createErrorResponse(`Failed to create invitation: ${createError.message}`, 500);
  }

  console.log("Successfully created invitation:", newInvitation);
  return newInvitation;
}

export async function updateInvitationExpiry(supabase: any, invitationId: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const { error: updateError } = await supabase
    .from("company_invitations_raw")  // ← CAMBIADO a _raw
    .update({
      expires_at: expiresAt.toISOString(),
      status: "pending"
    })
    .eq("id", invitationId);
    
  if (updateError) {
    console.error("Error updating invitation:", updateError);
    throw createErrorResponse("Failed to update invitation", 500);
  }
}

export async function getExistingInvitation(supabase: any, invitationId: string) {
  const { data: existingInvitation, error: invitationError } = await supabase
    .from("company_invitations_raw")  // ← CAMBIADO a _raw
    .select("*")
    .eq("id", invitationId)
    .single();
    
  if (invitationError) {
    console.error("Error fetching invitation:", invitationError);
    throw createErrorResponse("Invitation not found", 404);
  }
  
  return existingInvitation;
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  members?: CompanyMember[]; // Add the members property
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    email: string;
    name?: string;
  };
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: Date;
  expires_at: Date;
}

export const fetchCompany = async (): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching company:", error);
      return null;
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error in fetchCompany:", error);
    return null;
  }
};

export const createCompany = async (name: string): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company");
      return null;
    }

    toast.success("Company created successfully");
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error in createCompany:", error);
    toast.error("Failed to create company");
    return null;
  }
};

export const updateCompanyLogo = async (companyId: string, logoUrl: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl })
      .eq("id", companyId);

    if (error) {
      console.error("Error updating company logo:", error);
      toast.error("Failed to update company logo");
      return false;
    }

    toast.success("Company logo updated successfully");
    return true;
  } catch (error) {
    console.error("Error in updateCompanyLogo:", error);
    toast.error("Failed to update company logo");
    return false;
  }
};

export const uploadLogo = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recordings')  // Using the recordings bucket for now
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      toast.error("Failed to upload logo");
      return null;
    }

    const { data } = supabase.storage
      .from('recordings')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadLogo:", error);
    toast.error("Failed to upload logo");
    return null;
  }
};

export const fetchCompanyMembers = async (companyId: string): Promise<CompanyMember[]> => {
  try {
    const { data, error } = await supabase
      .from("company_members")
      .select(`
        id,
        company_id,
        user_id,
        role,
        status,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching company members:", error);
      return [];
    }

    // For each company member, fetch the user details
    const membersWithDetails = await Promise.all(data.map(async (member) => {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("id", member.user_id)
        .single();

      return {
        ...member,
        created_at: new Date(member.created_at),
        updated_at: new Date(member.updated_at),
        user_details: userError ? { email: "Unknown" } : { email: userData.email }
      };
    }));

    return membersWithDetails;
  } catch (error) {
    console.error("Error in fetchCompanyMembers:", error);
    return [];
  }
};

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching company invitations:", error);
      return [];
    }

    return data.map(invitation => ({
      ...invitation,
      created_at: new Date(invitation.created_at),
      expires_at: new Date(invitation.expires_at)
    }));
  } catch (error) {
    console.error("Error in fetchCompanyInvitations:", error);
    return [];
  }
};

export const inviteTeamMember = async (
  companyId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<boolean> => {
  try {
    // Get the company name for the email
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      toast.error("Failed to invite team member");
      return false;
    }

    // Get the current user's name if available
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name")
      .eq("id", user?.id || '')
      .maybeSingle();

    const inviterName = userData?.name || user?.email || "The company administrator";

    // Call the edge function to send the invitation
    const { error } = await supabase.functions.invoke("send-invitation", {
      body: {
        email,
        role,
        companyId,
        companyName: companyData.name,
        inviterName
      },
    });

    if (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
      return false;
    }

    toast.success(`Invitation sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error in inviteTeamMember:", error);
    toast.error("Failed to invite team member");
    return false;
  }
};

export const checkInvitation = async (token: string): Promise<{
  valid: boolean;
  invitation?: CompanyInvitation;
  company?: { id: string; name: string; };
}> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*, companies:company_id(id, name)")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !data) {
      return { valid: false };
    }

    // Check if invitation has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await supabase
        .from("company_invitations")
        .update({ status: "expired" })
        .eq("id", data.id);
        
      return { valid: false };
    }

    // Format the invitation data
    const invitation: CompanyInvitation = {
      id: data.id,
      company_id: data.company_id,
      email: data.email,
      role: data.role,
      token: data.token,
      status: data.status,
      created_at: new Date(data.created_at),
      expires_at: expiresAt
    };

    return {
      valid: true,
      invitation,
      company: data.companies
    };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
  }
};

export const acceptInvitation = async (token: string, userId: string): Promise<boolean> => {
  try {
    // Fetch the invitation
    const { data: invitationData, error: invitationError } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitationData) {
      console.error("Invitation not found or already used");
      return false;
    }

    // Start a transaction by using RPC
    const { error: acceptError } = await supabase.rpc("accept_invitation", {
      p_token: token,
      p_user_id: userId
    });

    if (acceptError) {
      console.error("Error accepting invitation:", acceptError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in acceptInvitation:", error);
    return false;
  }
};

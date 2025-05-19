
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
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

export const inviteTeamMember = async (
  companyId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<boolean> => {
  try {
    // In a real app, we'd send an email to the user with a sign-up link
    // For now, let's just add them to the company_members table with a status of 'pending'
    // This would require us to know the user_id, which we don't have yet if they're new
    // So for demo purposes, we'll create a placeholder for now

    // First, check if a user with this email exists in our auth system
    // We'd use a secure Supabase Edge Function for this in production
    // For now, we'll simulate this with a mock userId
    const mockUserId = `mock-${Date.now()}`;

    const { error } = await supabase
      .from("company_members")
      .insert([{
        company_id: companyId,
        user_id: mockUserId,
        role,
        status: 'pending'
      }]);

    if (error) {
      console.error("Error inviting team member:", error);
      toast.error("Failed to invite team member");
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


import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CompanyMember } from "./memberService";

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  members?: CompanyMember[];
}

export const fetchCompany = async (): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .maybeSingle(); // Use maybeSingle instead of single to handle null case

    if (error) {
      console.error("Error fetching company:", error);
      return null;
    }

    if (!data) {
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
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    const { error } = await supabase.storage
      .from('public')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading logo:', error);
    return null;
  }
};

// Re-export the required types from the other service files
export type { CompanyMember } from "./memberService";
export type { CompanyInvitation } from "./invitationService";

// Fix ambiguous export by excluding inviteTeamMember from invitationService
export { 
  fetchCompanyInvitations, 
  checkInvitation, 
  acceptInvitation 
} from "./invitationService";

export * from "./memberService";
export * from "./storageService";

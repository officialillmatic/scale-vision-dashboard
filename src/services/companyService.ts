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
    // First try to get a company where user is the owner
    const { data: ownedCompany, error: ownedCompanyError } = await supabase
      .from("companies")
      .select("*")
      .maybeSingle();
    
    if (ownedCompany) {
      return {
        ...ownedCompany,
        created_at: new Date(ownedCompany.created_at),
        updated_at: new Date(ownedCompany.updated_at)
      };
    }
    
    // If user is not a company owner, check if they're a member of any company
    const { data: membershipData, error: membershipError } = await supabase
      .from("company_members")
      .select(`
        company_id,
        role,
        companies:company_id (
          id,
          name,
          logo_url,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .maybeSingle();
      
    if (membershipData?.companies) {
      const companyDetails = membershipData.companies;
      return {
        id: companyDetails.id,
        name: companyDetails.name,
        logo_url: companyDetails.logo_url,
        owner_id: companyDetails.owner_id,
        created_at: new Date(companyDetails.created_at),
        updated_at: new Date(companyDetails.updated_at)
      };
    }

    // No company found - this is not an error, just return null
    return null;
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

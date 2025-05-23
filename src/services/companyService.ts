
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
    console.log("Fetching company data...");
    
    // First, check if the current user session is valid
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error("No valid session found:", sessionError);
      return null;
    }
    
    // First try to get a company where user is the owner
    const { data: ownedCompany, error: ownedCompanyError } = await supabase
      .from("companies")
      .select("*")
      .maybeSingle();
    
    if (ownedCompanyError) {
      console.error("Error fetching owned company:", ownedCompanyError);
    }
    
    if (ownedCompany) {
      console.log("Found company where user is owner:", ownedCompany);
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
      
    if (membershipError) {
      console.error("Error fetching company membership:", membershipError);
    }
      
    if (membershipData?.companies) {
      console.log("Found company where user is a member:", membershipData);
      // Handle the companies data which may be returned as an object or array
      const companyDetails = Array.isArray(membershipData.companies) 
        ? membershipData.companies[0] // Take the first item if it's an array
        : membershipData.companies;   // Use as is if it's already an object
      
      if (!companyDetails) {
        console.log("No company details found in membership data");
        return null;
      }
      
      return {
        id: companyDetails.id,
        name: companyDetails.name,
        logo_url: companyDetails.logo_url,
        owner_id: companyDetails.owner_id,
        created_at: new Date(companyDetails.created_at),
        updated_at: new Date(companyDetails.updated_at)
      };
    }

    console.log("No company found for user");
    // No company found - this is not an error, just return null
    return null;
  } catch (error) {
    console.error("Error in fetchCompany:", error);
    return null;
  }
};

export const createCompany = async (name: string): Promise<Company | null> => {
  try {
    // Validate the company name
    if (!name || name.trim() === '') {
      toast.error("Company name cannot be empty");
      return null;
    }

    // Get the current user ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in to create a company");
      return null;
    }

    // Create the company with owner_id set to the current user's ID
    const { data, error } = await supabase
      .from("companies")
      .insert([{ 
        name: name.trim(),
        owner_id: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating company:", error);
      toast.error(error.message || "Failed to create company");
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

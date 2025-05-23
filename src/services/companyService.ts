
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/auth";
import { handleError } from "@/lib/errorHandling";

export const fetchCompany = async (userId: string): Promise<Company | null> => {
  try {
    console.log("Fetching company data...");
    
    // First try to get a company where the user is the owner
    const { data: ownedCompany, error: ownedError } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 or 1 results

    if (ownedError) {
      console.error("Error fetching owned company:", ownedError);
      // Don't throw here, try member companies instead
    }

    if (ownedCompany) {
      console.log("Found owned company:", ownedCompany);
      return ownedCompany;
    }

    // If no owned company, check if user is a member of a company
    const { data: membership, error: memberError } = await supabase
      .from("company_members")
      .select(`
        company_id,
        companies!inner (
          id,
          name,
          owner_id,
          logo_url
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (memberError) {
      console.error("Error fetching member company:", memberError);
      return null;
    }

    if (membership && membership.companies) {
      console.log("Found member company:", membership.companies);
      return membership.companies as Company;
    }

    console.log("No company found for user");
    return null;
  } catch (error) {
    console.error("Error in fetchCompany:", error);
    handleError(error, {
      fallbackMessage: "Failed to fetch company data"
    });
    return null;
  }
};

export const createCompany = async (name: string, userId: string): Promise<Company | null> => {
  try {
    console.log("Creating company:", name);
    
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        owner_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log("Company created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating company:", error);
    handleError(error, {
      fallbackMessage: "Failed to create company"
    });
    return null;
  }
};

export const updateCompany = async (
  companyId: string,
  updates: Partial<Omit<Company, "id" | "owner_id">>
): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating company:", error);
    handleError(error, {
      fallbackMessage: "Failed to update company"
    });
    return null;
  }
};

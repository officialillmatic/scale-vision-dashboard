import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/auth";
import { handleError } from "@/lib/errorHandling";
import { User } from "@supabase/supabase-js";

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export async function loadCompany(user: User | null): Promise<Company | null> {
  if (!user) return null;

  const { data, error, status } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (status === 403 || status === 404) {
    return null; // break the retry loop
  }

  if (error) throw error;
  return data;
}

export const fetchCompany = async (userId: string): Promise<Company | null> => {
  try {
    console.log("[COMPANY_SERVICE] Fetching company data for user:", userId);
    
    // First try to get a company where the user is the owner
    const { data: ownedCompany, error: ownedError } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (ownedError && ownedError.code !== 'PGRST116') {
      console.error("[COMPANY_SERVICE] Error fetching owned company:", ownedError);
    }

    if (ownedCompany) {
      console.log("[COMPANY_SERVICE] Found owned company:", ownedCompany.id);
      return ownedCompany;
    }

    // If no owned company, check if user is a member of a company
    const { data: membership, error: memberError } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error("[COMPANY_SERVICE] Error fetching member company:", memberError);
    }

    if (membership?.company_id) {
      // Now fetch the actual company data
      const { data: memberCompany, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", membership.company_id)
        .single();

      if (companyError) {
        console.error("[COMPANY_SERVICE] Error fetching member company details:", companyError);
        return null;
      }

      console.log("[COMPANY_SERVICE] Found member company:", memberCompany.id);
      return memberCompany;
    }

    console.log("[COMPANY_SERVICE] No company found for user, creating default company");
    
    // Create a default company for the user
    const defaultCompanyName = `My Company`;
    const newCompany = await createCompany(defaultCompanyName, userId);
    
    if (newCompany) {
      console.log("[COMPANY_SERVICE] Created default company:", newCompany.id);
      return newCompany;
    }

    console.log("[COMPANY_SERVICE] Failed to create company, returning null");
    return null;
  } catch (error) {
    console.error("[COMPANY_SERVICE] Error in fetchCompany:", error);
    return null;
  }
};

export const createCompany = async (name: string, userId: string): Promise<Company | null> => {
  try {
    console.log("[COMPANY_SERVICE] Creating company:", name, "for user:", userId);
    
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        owner_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[COMPANY_SERVICE] Error creating company:", error);
      throw error;
    }

    console.log("[COMPANY_SERVICE] Company created successfully:", data.id);
    return data;
  } catch (error) {
    console.error("[COMPANY_SERVICE] Error creating company:", error);
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

export const updateCompanyLogo = async (
  companyId: string,
  logoUrl: string
): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating company logo:", error);
    handleError(error, {
      fallbackMessage: "Failed to update company logo"
    });
    return null;
  }
};


import { supabase } from "@/integrations/supabase/client";

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

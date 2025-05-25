
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyMember } from "@/types/auth";

export const useCompanyData = (user: User | null) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);

  const fetchCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
      return;
    }

    try {
      console.log("[COMPANY_DATA] Fetching company data for user:", user.id);
      
      // First, try to get company where user is owner
      const { data: ownedCompany, error: ownedError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedError && ownedError.code !== 'PGRST116') {
        console.error("[COMPANY_DATA] Error fetching owned company:", ownedError);
      }

      if (ownedCompany) {
        console.log("[COMPANY_DATA] Found owned company:", ownedCompany.id);
        setCompany(ownedCompany);
        setUserRole('owner');
        setIsCompanyOwner(true);
        await fetchCompanyMembers(ownedCompany.id);
        setIsCompanyLoading(false);
        return;
      }

      // If no owned company, check if user is a member of any company
      const { data: memberData, error: memberError } = await supabase
        .from('company_members')
        .select(`
          *,
          companies:company_id (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error("[COMPANY_DATA] Error fetching member data:", memberError);
      }

      if (memberData && memberData.companies) {
        console.log("[COMPANY_DATA] Found member company:", memberData.companies.id);
        setCompany(memberData.companies as Company);
        setUserRole(memberData.role);
        setIsCompanyOwner(false);
        await fetchCompanyMembers(memberData.companies.id);
      } else {
        console.log("[COMPANY_DATA] No company found for user");
        setCompany(null);
        setUserRole(null);
        setIsCompanyOwner(false);
        setCompanyMembers([]);
      }
    } catch (error) {
      console.error("[COMPANY_DATA] Unexpected error:", error);
      setCompany(null);
      setUserRole(null);
      setIsCompanyOwner(false);
      setCompanyMembers([]);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const fetchCompanyMembers = async (companyId: string) => {
    try {
      console.log("[COMPANY_DATA] Fetching members for company:", companyId);
      
      const { data: members, error } = await supabase
        .from('company_members')
        .select(`
          *,
          user_details:user_id (
            id,
            email,
            name,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (error) {
        console.error("[COMPANY_DATA] Error fetching company members:", error);
        return;
      }

      console.log("[COMPANY_DATA] Found members:", members?.length || 0);
      setCompanyMembers(members || []);
    } catch (error) {
      console.error("[COMPANY_DATA] Error in fetchCompanyMembers:", error);
      setCompanyMembers([]);
    }
  };

  const refreshCompany = async () => {
    console.log("[COMPANY_DATA] Refreshing company data");
    setIsCompanyLoading(true);
    await fetchCompanyData();
  };

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  return {
    company,
    isCompanyLoading,
    companyMembers,
    userRole,
    isCompanyOwner,
    refreshCompany
  };
};

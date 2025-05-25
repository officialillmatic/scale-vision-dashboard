
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyMember } from "@/types/auth";
import { fetchCompany } from "@/services/companyService";
import { useSuperAdmin } from "./useSuperAdmin";

export const useCompanyData = (user: User | null) => {
  const { isSuperAdmin } = useSuperAdmin();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);

  const refreshCompany = async () => {
    if (!user) {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
      return;
    }

    // Super admins don't need a company to function
    if (isSuperAdmin) {
      setIsCompanyOwner(false);
      setUserRole('admin'); // Super admins have admin-level permissions
      setIsCompanyLoading(false);
      return;
    }

    setIsCompanyLoading(true);
    try {
      console.log("[COMPANY_DATA] Fetching company data for user:", user.id);
      
      const companyData = await fetchCompany(user.id);
      setCompany(companyData);

      if (companyData) {
        // Check if user is the company owner
        const isOwner = companyData.owner_id === user.id;
        setIsCompanyOwner(isOwner);
        
        if (isOwner) {
          setUserRole('admin');
        } else {
          // Fetch user's role in the company
          const { data: memberData, error: memberError } = await supabase
            .from("company_members")
            .select("role")
            .eq("company_id", companyData.id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .single();

          if (memberError) {
            console.error("[COMPANY_DATA] Error fetching member role:", memberError);
            setUserRole('viewer'); // Default to most restrictive role
          } else {
            setUserRole(memberData.role as 'admin' | 'member' | 'viewer');
          }
        }

        // Fetch company members
        const { data: membersData, error: membersError } = await supabase
          .from("company_members")
          .select(`
            *,
            user_details:user_profiles(id, email, name, avatar_url)
          `)
          .eq("company_id", companyData.id)
          .eq("status", "active");

        if (membersError) {
          console.error("[COMPANY_DATA] Error fetching company members:", membersError);
        } else {
          setCompanyMembers(membersData || []);
        }
      } else {
        setIsCompanyOwner(false);
        setUserRole(null);
        setCompanyMembers([]);
      }
    } catch (error) {
      console.error("[COMPANY_DATA] Error in company data fetch:", error);
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  useEffect(() => {
    refreshCompany();
  }, [user, isSuperAdmin]);

  return {
    company,
    companyMembers,
    userRole,
    isCompanyOwner,
    isCompanyLoading,
    refreshCompany
  };
};

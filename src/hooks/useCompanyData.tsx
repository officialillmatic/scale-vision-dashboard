
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Company, CompanyMember } from "@/types/auth";
import { fetchCompany, createCompany } from "@/services/companyService";
import { supabase } from "@/integrations/supabase/client";

export const useCompanyData = (user: User | null) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);

  const loadCompanyData = async (userId: string) => {
    try {
      setIsCompanyLoading(true);
      console.log("User changed, loading company data...");
      
      let companyData = await fetchCompany(userId);
      
      // If no company exists, create a default one for the user
      if (!companyData && user?.email) {
        console.log("No company found, creating default company:", `${user.email.split('@')[0]}'s Organization`);
        const userName = user.email.split('@')[0];
        companyData = await createCompany(`${userName}'s Organization`, userId);
      }

      if (companyData) {
        setCompany(companyData);
        setIsCompanyOwner(companyData.owner_id === userId);
        
        // Load company members
        await loadCompanyMembers(companyData.id, userId);
      } else {
        setCompany(null);
        setIsCompanyOwner(false);
        setUserRole(null);
        setCompanyMembers([]);
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      setCompany(null);
      setIsCompanyOwner(false);
      setUserRole(null);
      setCompanyMembers([]);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const loadCompanyMembers = async (companyId: string, userId: string) => {
    try {
      // Load company members
      const { data: members, error: membersError } = await supabase
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
        .eq("company_id", companyId)
        .eq("status", "active");

      if (membersError) {
        console.error("Error loading company members:", membersError);
        return;
      }

      const membersWithDetails: CompanyMember[] = [];
      
      if (members) {
        // Get user details for each member
        for (const member of members) {
          const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("id, email, name, avatar_url")
            .eq("id", member.user_id)
            .maybeSingle();
          
          membersWithDetails.push({
            ...member,
            created_at: new Date(member.created_at),
            updated_at: new Date(member.updated_at),
            user_details: userProfile ? {
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name || '',
              avatar_url: userProfile.avatar_url || ''
            } : undefined
          });
          
          // Set user role if this is the current user
          if (member.user_id === userId) {
            setUserRole(member.role as 'admin' | 'member' | 'viewer');
          }
        }
      }

      setCompanyMembers(membersWithDetails);
    } catch (error) {
      console.error("Error loading company members:", error);
      setCompanyMembers([]);
    }
  };

  const refreshCompany = async () => {
    if (user?.id) {
      await loadCompanyData(user.id);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadCompanyData(user.id);
    } else {
      setCompany(null);
      setIsCompanyOwner(false);
      setUserRole(null);
      setCompanyMembers([]);
      setIsCompanyLoading(false);
    }
  }, [user?.id]);

  return {
    company,
    isCompanyLoading,
    companyMembers,
    userRole,
    isCompanyOwner,
    refreshCompany
  };
};

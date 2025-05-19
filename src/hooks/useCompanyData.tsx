
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Company, 
  fetchCompany,
  createCompany 
} from "@/services/companyService";
import { 
  fetchCompanyMembers, 
  CompanyMember 
} from "@/services/memberService";

export function useCompanyData(user: User | null) {
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);

  const loadCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
      return;
    }

    setIsCompanyLoading(true);
    try {
      // First check if user owns a company
      let companyData = await fetchCompany();
      
      // If no company found, check if user is a member of a company
      if (!companyData) {
        try {
          const { data: memberData, error: memberError } = await supabase
            .from('company_members')
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
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle instead of single to handle null case
            
          if (!memberError && memberData && memberData.companies) {
            // Type fix: memberData.companies is an object, not an array
            const companyDetails = memberData.companies as unknown as {
              id: string;
              name: string;
              logo_url: string | null;
              owner_id: string;
              created_at: string;
              updated_at: string;
            };
            
            companyData = {
              id: companyDetails.id,
              name: companyDetails.name,
              logo_url: companyDetails.logo_url,
              owner_id: companyDetails.owner_id,
              created_at: new Date(companyDetails.created_at),
              updated_at: new Date(companyDetails.updated_at)
            };
            
            // Set user role directly from the query result
            setUserRole(memberData.role as 'admin' | 'member' | 'viewer');
          }
        } catch (memberQueryError) {
          console.log("Error checking company membership:", memberQueryError);
          // Continue execution - we'll create a default company if needed
        }
      }
      
      setCompany(companyData);
      
      // Determine if user is company owner
      if (companyData) {
        setIsCompanyOwner(companyData.owner_id === user.id);
        
        // Fetch company members to determine user's role
        try {
          const members = await fetchCompanyMembers(companyData.id);
          
          setCompanyMembers(members || []);
          
          // Find the user's role if not already set
          if (!userRole) {
            const userMember = members?.find(member => member.user_id === user.id);
            if (userMember) {
              setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
            } else if (companyData.owner_id === user.id) {
              setUserRole('admin'); // Company owner is always admin
            }
          }
        } catch (membersError) {
          console.error("Error fetching company members:", membersError);
          // Gracefully handle the error - at least we have the company data
          if (companyData.owner_id === user.id) {
            setUserRole('admin'); // If members can't be fetched but user is owner
          }
        }
      } else if (user) {
        // No company found - create a default one for this user
        try {
          const defaultCompanyName = `${user.email?.split('@')[0]}'s Company` || "New Company";
          const newCompany = await createCompany(defaultCompanyName);
          if (newCompany) {
            setCompany(newCompany);
            setCompanyMembers([]);
            setUserRole('admin');
            setIsCompanyOwner(true);
          }
        } catch (createError) {
          console.error("Error creating default company:", createError);
          // Even if company creation fails, don't break the app
        }
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      // Don't show toast here - it's too disruptive for a default loading error
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (!user) return;
    
    setIsCompanyLoading(true);
    try {
      const companyData = await fetchCompany();
      setCompany(companyData);
      
      if (companyData) {
        setIsCompanyOwner(companyData.owner_id === user.id);
        
        // Refresh company members
        const members = await fetchCompanyMembers(companyData.id);
        
        setCompanyMembers(members || []);
        
        // Update user role
        const userMember = members?.find(member => member.user_id === user.id);
        if (userMember) {
          setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
        } else if (companyData.owner_id === user.id) {
          setUserRole('admin'); // Company owner is always admin
        }
      }
    } catch (error) {
      console.error("Error refreshing company data:", error);
      // Don't show error toast here
    } finally {
      setIsCompanyLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [user]);

  return {
    company,
    isCompanyLoading,
    companyMembers,
    userRole,
    isCompanyOwner,
    refreshCompany
  };
}

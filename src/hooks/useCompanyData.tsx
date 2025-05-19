
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
      // Fetch company data
      let companyData = await fetchCompany();
      
      // If company exists, set company data and determine user role
      if (companyData) {
        setCompany(companyData);
        setIsCompanyOwner(companyData.owner_id === user.id);
        
        try {
          const members = await fetchCompanyMembers(companyData.id);
          setCompanyMembers(members || []);
          
          // Determine user's role
          if (companyData.owner_id === user.id) {
            setUserRole('admin'); // Company owner is always admin
          } else {
            const userMember = members?.find(member => member.user_id === user.id);
            if (userMember) {
              setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
            } else {
              setUserRole(null);
            }
          }
        } catch (membersError) {
          console.error("Error fetching company members:", membersError);
          // Still set admin role for owner even if members fetch fails
          if (companyData.owner_id === user.id) {
            setUserRole('admin');
          }
        }
      } else {
        // No company found - create a default one
        try {
          const defaultCompanyName = `${user.email?.split('@')[0]}'s Company` || "New Company";
          const newCompany = await createCompany(defaultCompanyName);
          
          if (newCompany) {
            setCompany(newCompany);
            setCompanyMembers([]);
            setUserRole('admin');
            setIsCompanyOwner(true);
            toast.success(`Created company: ${defaultCompanyName}`);
          } else {
            // Company creation failed, but don't break the app
            console.error("Failed to create default company");
            toast.error("Could not create your company. Please try again later.");
          }
        } catch (createError: any) {
          console.error("Error creating default company:", createError);
          toast.error(createError.message || "Could not create your company");
        }
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      toast.error("Failed to load company data");
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
        if (companyData.owner_id === user.id) {
          setUserRole('admin');
        } else {
          const userMember = members?.find(member => member.user_id === user.id);
          if (userMember) {
            setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
          } else {
            setUserRole(null);
          }
        }
      } else {
        setCompanyMembers([]);
        setUserRole(null);
        setIsCompanyOwner(false);
      }
    } catch (error) {
      console.error("Error refreshing company data:", error);
      toast.error("Failed to refresh company data");
    } finally {
      setIsCompanyLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCompanyData();
    } else {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
    }
  }, [user?.id]); // Only reload when the user ID changes

  return {
    company,
    isCompanyLoading,
    companyMembers,
    userRole,
    isCompanyOwner,
    refreshCompany
  };
}

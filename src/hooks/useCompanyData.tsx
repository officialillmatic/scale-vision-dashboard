
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
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
      const companyData = await fetchCompany();
      
      if (companyData) {
        setCompany(companyData);
        setIsCompanyOwner(companyData.owner_id === user.id);
        
        try {
          // Always fetch company members to determine user role
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
          if (companyData.owner_id === user.id) {
            setUserRole('admin');
          } else {
            // If members fetch fails, don't assume any role
            setUserRole(null);
          }
        }
      } else {
        // No company found - create a default one
        try {
          // Generate a more professional company name
          const userName = user.user_metadata?.name || user.email?.split('@')[0] || "New User";
          const defaultCompanyName = `${userName}'s Organization`;
          
          const newCompany = await createCompany(defaultCompanyName);
          
          if (newCompany) {
            setCompany(newCompany);
            setCompanyMembers([]);
            setUserRole('admin');
            setIsCompanyOwner(true);
            toast.success(`Welcome to Dr. Scale! We've created ${defaultCompanyName} for you.`);
          } else {
            // Company creation failed but don't break the app
            console.error("Failed to create default company");
            toast.error("Could not create your company. Please try again later.");
            // Reset all state to ensure clean UI
            setCompany(null);
            setCompanyMembers([]);
            setUserRole(null);
            setIsCompanyOwner(false);
          }
        } catch (createError: any) {
          console.error("Error creating default company:", createError);
          toast.error(createError.message || "Could not create your company");
          // Reset all state
          setCompany(null);
          setCompanyMembers([]);
          setUserRole(null);
          setIsCompanyOwner(false);
        }
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      toast.error("Failed to load company data");
      // Reset all state on error
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (!user) return;
    
    setIsCompanyLoading(true);
    try {
      const companyData = await fetchCompany();
      
      if (companyData) {
        setCompany(companyData);
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
        // Company no longer exists, clear data
        setCompany(null);
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

  // Load company data whenever user changes
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

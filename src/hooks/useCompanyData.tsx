
import { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState<Error | null>(null);

  // Load company data with proper error handling and state management
  const loadCompanyData = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
      setError(null);
      return;
    }

    setIsCompanyLoading(true);
    setError(null);

    try {
      // Fetch company data
      const companyData = await fetchCompany();
      
      if (companyData) {
        console.log("Company data loaded:", companyData);
        
        // Set company data and check if user is owner
        setCompany(companyData);
        const isOwner = companyData.owner_id === user.id;
        setIsCompanyOwner(isOwner);
        
        try {
          // Fetch company members to determine user role
          const members = await fetchCompanyMembers(companyData.id);
          
          if (Array.isArray(members)) {
            console.log("Company members loaded:", members);
            setCompanyMembers(members || []);
            
            // Determine user's role with proper precedence
            if (isOwner) {
              setUserRole('admin'); // Company owner is always admin
              console.log("User is company owner, setting role to admin");
            } else {
              const userMember = members?.find(member => member.user_id === user.id);
              if (userMember) {
                console.log("Found user membership:", userMember);
                setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
              } else {
                console.log("User is not a company member");
                setUserRole(null);
              }
            }
          } else {
            console.error("Expected members to be an array but got:", members);
            setCompanyMembers([]);
            
            // Still set owner as admin even if member fetch fails
            if (isOwner) {
              setUserRole('admin');
            } else {
              setUserRole(null);
            }
          }
        } catch (membersError) {
          console.error("Error fetching company members:", membersError);
          // If members fetch fails but user is owner, still grant admin role
          if (isOwner) {
            setUserRole('admin');
          } else {
            // If members fetch fails, don't assume any role
            setUserRole(null);
          }
        }
      } else {
        // No company found - create a default one with better error handling
        try {
          // Generate a more professional company name
          const userName = user.user_metadata?.name || user.email?.split('@')[0] || "New User";
          const defaultCompanyName = `${userName}'s Organization`;
          
          console.log("No company found, creating default company:", defaultCompanyName);
          const newCompany = await createCompany(defaultCompanyName);
          
          if (newCompany) {
            setCompany(newCompany);
            setCompanyMembers([]);
            setUserRole('admin');
            setIsCompanyOwner(true);
            toast.success(`Welcome to Dr. Scale! We've created ${defaultCompanyName} for you.`);
          } else {
            throw new Error("Failed to create default company");
          }
        } catch (createError: any) {
          console.error("Error creating default company:", createError);
          toast.error(createError.message || "Could not create your company");
          // Reset all state
          setCompany(null);
          setCompanyMembers([]);
          setUserRole(null);
          setIsCompanyOwner(false);
          setError(createError);
        }
      }
    } catch (error: any) {
      console.error("Error loading company data:", error);
      toast.error("Failed to load company data");
      // Reset all state on error
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setError(error);
    } finally {
      setIsCompanyLoading(false);
    }
  }, [user]);

  // Better refresh function with proper error handling
  const refreshCompany = useCallback(async () => {
    if (!user) return;
    
    console.log("Refreshing company data...");
    setIsCompanyLoading(true);
    setError(null);
    
    try {
      const companyData = await fetchCompany();
      
      if (companyData) {
        setCompany(companyData);
        setIsCompanyOwner(companyData.owner_id === user.id);
        
        // Refresh company members
        const members = await fetchCompanyMembers(companyData.id);
        
        if (Array.isArray(members)) {
          setCompanyMembers(members || []);
          
          // Update user role with proper precedence
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
          console.error("Expected members to be an array but got:", members);
          // Handle as if no members were found
          if (companyData.owner_id === user.id) {
            setUserRole('admin');
          } else {
            setUserRole(null);
          }
          setCompanyMembers([]);
        }
      } else {
        // Company no longer exists, clear data
        setCompany(null);
        setCompanyMembers([]);
        setUserRole(null);
        setIsCompanyOwner(false);
      }
    } catch (error: any) {
      console.error("Error refreshing company data:", error);
      toast.error("Failed to refresh company data");
      setError(error);
    } finally {
      setIsCompanyLoading(false);
    }
  }, [user]);

  // Load company data whenever user changes
  useEffect(() => {
    if (user) {
      console.log("User changed, loading company data...");
      loadCompanyData();
    } else {
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      setIsCompanyLoading(false);
      setError(null);
    }
  }, [user?.id, loadCompanyData]);

  return {
    company,
    isCompanyLoading,
    companyMembers,
    userRole,
    isCompanyOwner,
    refreshCompany,
    error
  };
}

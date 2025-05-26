
import React, { createContext, useState, useEffect, useContext } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useAuthFunctions } from "@/hooks/useAuthFunctions";
import { AuthContextType, Company, CompanyMember } from "@/types/auth";

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  company: null,
  isLoading: true,
  isLoadingCompany: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateUserProfile: async () => {},
  isCompanyLoading: true,
  refreshCompany: async () => {},
  companyMembers: [],
  userRole: null,
  isCompanyOwner: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Import authentication functions
  const {
    isLoading: isAuthLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserProfile
  } = useAuthFunctions();
  
  // Use the external hook to manage company data
  const { 
    company, 
    isCompanyLoading, 
    companyMembers, 
    userRole, 
    isCompanyOwner, 
    refreshCompany 
  } = useCompanyData(user);

  useEffect(() => {
    console.log("[AUTH_CONTEXT] Setting up auth state listener");
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[AUTH_CONTEXT] Error getting session:", error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
          console.log("[AUTH_CONTEXT] Initial session loaded, user:", session?.user?.id || 'none');
        }
        setIsLoading(false);
      } catch (error) {
        console.error("[AUTH_CONTEXT] Unexpected error getting session:", error);
        setUser(null);
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH_CONTEXT] Auth state change:", event, session?.user?.id || 'none');
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setIsLoading(false);
      } else if (event === 'SIGNED_IN') {
        setIsLoading(false);
      }
    });

    return () => {
      console.log("[AUTH_CONTEXT] Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  // Combine local loading state with auth loading state
  const combinedIsLoading = isLoading || isAuthLoading;

  const contextValue: AuthContextType = {
    user,
    company,
    isLoading: combinedIsLoading,
    isLoadingCompany: isCompanyLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserProfile,
    isCompanyLoading,
    refreshCompany,
    companyMembers,
    userRole,
    isCompanyOwner,
  };

  console.log("[AUTH_CONTEXT] Providing context:", {
    user: user?.id || 'none',
    company: company?.id || 'none',
    isLoading: combinedIsLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

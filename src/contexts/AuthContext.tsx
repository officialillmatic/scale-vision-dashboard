
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
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getSession();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Combine local loading state with auth loading state
  const combinedIsLoading = isLoading || isAuthLoading;

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

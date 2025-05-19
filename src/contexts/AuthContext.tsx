
import React, { createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { Company } from "@/services/companyService";
import { CompanyMember } from "@/services/memberService";
import { useAuthState } from "@/hooks/useAuthState";
import { useCompanyData } from "@/hooks/useCompanyData";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  company: Company | null;
  isCompanyLoading: boolean;
  userRole: 'admin' | 'member' | 'viewer' | null;
  companyMembers: CompanyMember[];
  isCompanyOwner: boolean;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, user, isLoading, signOut } = useAuthState();
  const { 
    company, 
    isCompanyLoading, 
    companyMembers, 
    userRole, 
    isCompanyOwner, 
    refreshCompany 
  } = useCompanyData(user);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      isLoading, 
      company, 
      isCompanyLoading,
      userRole,
      companyMembers,
      isCompanyOwner,
      signOut,
      refreshCompany
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

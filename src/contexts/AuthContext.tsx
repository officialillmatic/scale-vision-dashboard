
import React, { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { Company } from '@/types/auth';
import { useAuthState } from '@/hooks/useAuthState';
import { useCompanyState } from '@/hooks/useCompanyState';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isCompanyLoading: boolean;
  userRole: string | null;
  isCompanyOwner: boolean;
  isSuperAdmin: boolean;
  companyMembers: CompanyMember[];
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, signOut } = useAuthState();
  const { 
    company, 
    isCompanyLoading, 
    userRole, 
    companyMembers, 
    isCompanyOwner, 
    refreshCompany 
  } = useCompanyState(user);
  const { updateUserProfile } = useUserProfile();
  const { isSuperAdmin } = useSuperAdmin();

  console.log("[AUTH_CONTEXT] Providing context:", {
    user: user ? user.id : 'none',
    company: company ? company.id : 'none',
    isLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner,
    isSuperAdmin
  });

  const value: AuthContextType = {
    user,
    company,
    isLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner,
    isSuperAdmin: isSuperAdmin || false,
    companyMembers,
    signOut,
    refreshCompany,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

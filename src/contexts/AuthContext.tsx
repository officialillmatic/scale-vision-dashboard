
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/auth';
import { fetchCompany } from '@/services/companyService';
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
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);

  const { isSuperAdmin } = useSuperAdmin();

  console.log("[AUTH_CONTEXT] Providing context:", {
    user: user ? user.id : 'none',
    company: company ? company.id : 'none',
    isLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner: company?.owner_id === user?.id,
    isSuperAdmin
  });

  const loadCompanyData = async (userId: string) => {
    console.log("[AUTH_CONTEXT] Loading company data for user:", userId);
    setIsCompanyLoading(true);
    
    try {
      const companyData = await fetchCompany(userId);
      console.log("[AUTH_CONTEXT] Company data loaded:", companyData);
      setCompany(companyData);
      
      if (companyData) {
        // Get user role in the company
        const { data: memberData } = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', userId)
          .eq('company_id', companyData.id)
          .eq('status', 'active')
          .single();
        
        if (memberData) {
          setUserRole(memberData.role);
        } else if (companyData.owner_id === userId) {
          setUserRole('admin');
        }

        // Load company members
        try {
          const { data: membersData } = await supabase
            .from('company_members')
            .select(`
              id,
              company_id,
              user_id,
              role,
              status,
              created_at,
              updated_at
            `)
            .eq('company_id', companyData.id)
            .eq('status', 'active');

          setCompanyMembers(membersData || []);
        } catch (error) {
          console.error("[AUTH_CONTEXT] Error loading company members:", error);
          setCompanyMembers([]);
        }
      }
    } catch (error) {
      console.error("[AUTH_CONTEXT] Error loading company:", error);
      setCompany(null);
      setUserRole(null);
      setCompanyMembers([]);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (user?.id) {
      await loadCompanyData(user.id);
    }
  };

  const updateUserProfile = async (data: { name?: string; avatar_url?: string }) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!userData.user) {
        throw new Error("No user logged in");
      }
      
      // Update user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: data.name,
          avatar_url: data.avatar_url
        })
        .eq('id', userData.user.id);
        
      if (error) {
        throw error;
      }
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("[AUTH_CONTEXT] Setting up auth state listener");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AUTH_CONTEXT] Error getting session:", error);
      }
      
      console.log("[AUTH_CONTEXT] Initial session loaded, user:", session?.user?.id || 'none');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user?.id) {
        loadCompanyData(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH_CONTEXT] Auth state change:", event, session?.user?.id || 'none');
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (session?.user?.id) {
          await loadCompanyData(session.user.id);
        } else {
          setCompany(null);
          setUserRole(null);
          setIsCompanyLoading(false);
          setCompanyMembers([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log("[AUTH_CONTEXT] Signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AUTH_CONTEXT] Sign out error:", error);
    }
    setUser(null);
    setCompany(null);
    setUserRole(null);
    setSession(null);
    setCompanyMembers([]);
  };

  const isCompanyOwner = company?.owner_id === user?.id;

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

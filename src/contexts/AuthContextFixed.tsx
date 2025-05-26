
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  company: Company | null;
  isLoading: boolean;
  isCompanyLoading: boolean;
  userRole: string | null;
  isCompanyOwner: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProviderFixed: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const logContext = (context: string, data: any) => {
    console.log(`[AUTH_CONTEXT_FIXED] ${context}:`, data);
  };

  // Enhanced company fetching with better error handling
  const fetchCompany = async (userId: string): Promise<Company | null> => {
    try {
      setIsCompanyLoading(true);
      logContext("Fetching company for user", userId);

      // First try to get user's own company
      const { data: ownedCompanies, error: ownedError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .limit(1);

      if (ownedError) {
        console.warn('[AUTH_CONTEXT_FIXED] Error fetching owned companies:', ownedError);
      } else if (ownedCompanies && ownedCompanies.length > 0) {
        const company = ownedCompanies[0];
        logContext("Found owned company", company);
        setIsCompanyOwner(true);
        return company;
      }

      // If no owned company, try to get company through membership
      const { data: memberships, error: memberError } = await supabase
        .from('company_members')
        .select(`
          *,
          companies (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      if (memberError) {
        console.warn('[AUTH_CONTEXT_FIXED] Error fetching company memberships:', memberError);
      } else if (memberships && memberships.length > 0 && memberships[0].companies) {
        const company = memberships[0].companies as any;
        logContext("Found company through membership", company);
        setIsCompanyOwner(false);
        return company;
      }

      logContext("No company found for user", userId);
      return null;

    } catch (error) {
      console.error('[AUTH_CONTEXT_FIXED] Error in fetchCompany:', error);
      return null;
    } finally {
      setIsCompanyLoading(false);
    }
  };

  // Enhanced super admin check
  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('is_super_admin_safe', { check_user_id: userId });

      if (error) {
        console.warn('[AUTH_CONTEXT_FIXED] Super admin check error:', error);
        return false;
      }

      return Boolean(data);
    } catch (error) {
      console.warn('[AUTH_CONTEXT_FIXED] Super admin check exception:', error);
      return false;
    }
  };

  // Get user role in company
  const fetchUserRole = async (userId: string, companyId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_company_role', { 
          p_user_id: userId, 
          p_company_id: companyId 
        });

      if (error) {
        console.warn('[AUTH_CONTEXT_FIXED] User role fetch error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('[AUTH_CONTEXT_FIXED] User role fetch exception:', error);
      return null;
    }
  };

  // Initialize user session and data
  const initializeUser = async (user: User) => {
    try {
      logContext("Initializing user", { id: user.id, email: user.email });

      // Fetch company
      const companyData = await fetchCompany(user.id);
      setCompany(companyData);

      // Check super admin status
      const superAdminStatus = await checkSuperAdmin(user.id);
      setIsSuperAdmin(superAdminStatus);

      // Get user role if company exists
      if (companyData) {
        const role = await fetchUserRole(user.id, companyData.id);
        setUserRole(role);
      }

      logContext("User initialization complete", {
        company: companyData?.name || 'none',
        isSuperAdmin: superAdminStatus,
        role: userRole
      });

    } catch (error) {
      console.error('[AUTH_CONTEXT_FIXED] Error initializing user:', error);
      toast.error('Error loading user data');
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      logContext("Auth state change", { event, hasSession: !!session });

      try {
        setIsLoading(true);
        setSession(session);

        if (session?.user) {
          setUser(session.user);
          await initializeUser(session.user);
        } else {
          // Clear all user-related state
          setUser(null);
          setCompany(null);
          setUserRole(null);
          setIsCompanyOwner(false);
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('[AUTH_CONTEXT_FIXED] Auth change error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AUTH_CONTEXT_FIXED] Get session error:', error);
      }
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  };

  const refreshCompany = async () => {
    if (user) {
      const companyData = await fetchCompany(user.id);
      setCompany(companyData);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    company,
    isLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner,
    isSuperAdmin,
    signIn,
    signUp,
    signOut,
    updatePassword,
    refreshCompany,
  };

  logContext("Providing context", {
    user: user ? user.email : 'none',
    company: company?.name || 'none',
    isLoading,
    isCompanyLoading,
    userRole,
    isCompanyOwner,
    isSuperAdmin
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

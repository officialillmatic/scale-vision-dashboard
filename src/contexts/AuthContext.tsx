import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  company: Company | null;
  userRole?: string | null;
  loading: boolean;
  isLoading: boolean;
  isCompanyLoading: boolean;
  isCompanyOwner: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Super admin configuration
const SUPER_ADMIN_ID = '53392e76-008c-4e46-8443-a6ebd6bd4504';
const SUPER_ADMIN_EMAIL = 'aiagentsdevelopers@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  // Check if user is super admin
  const isSuperAdmin = (currentUser: User | null): boolean => {
    if (!currentUser) return false;
    return currentUser.id === SUPER_ADMIN_ID || currentUser.email === SUPER_ADMIN_EMAIL;
  };

  // Create virtual company for super admin
  const createSuperAdminCompany = (userId: string): Company => {
    return {
      id: 'super-admin-virtual-company',
      name: 'Super Admin Global Access',
      owner_id: userId,
      logo_url: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔥 [AUTH] Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        if (isSuperAdmin(session.user)) {
          console.log('🔥 [AUTH] Super admin detected - setting virtual company');
          setUserRole('super_admin');
          setCompany(createSuperAdminCompany(session.user.id));
          setLoading(false); // Super admin ready immediately
        } else {
          console.log('🔥 [AUTH] Regular user, fetching real company...');
          fetchUserCompany(session.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔥 [AUTH] Auth state changed:', _event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        if (isSuperAdmin(session.user)) {
          console.log('🔥 [AUTH] Super admin login - setting virtual company');
          setUserRole('super_admin');
          setCompany(createSuperAdminCompany(session.user.id));
          setLoading(false); // Immediate access for super admin
        } else {
          console.log('🔥 [AUTH] Regular user login, fetching company...');
          fetchUserCompany(session.user.id);
        }
      } else {
        setCompany(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCompany = async (userId: string) => {
    try {
      setIsCompanyLoading(true);
      console.log('🔍 [AUTH] Fetching company for user:', userId);

      // First try to find company where user is owner
      let { data: ownerCompany, error: ownerError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      console.log('🔍 [AUTH] Owner company query result:', { ownerCompany, ownerError });

      if (ownerCompany) {
        console.log('✅ [AUTH] User is company owner');
        setCompany(ownerCompany);
        setUserRole('admin');
        return;
      }

      // If not owner, check if they're a member
      console.log('🔍 [AUTH] User is not owner, checking membership...');
      const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select(`
          role,
          company_id,
          companies (
            id,
            name,
            owner_id,
            logo_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      console.log('🔍 [AUTH] Membership query result:', { membership, memberError });

      if (membership && membership.companies) {
        const memberCompany = Array.isArray(membership.companies) 
          ? membership.companies[0] 
          : membership.companies;
        
        console.log('✅ [AUTH] User is company member, company:', memberCompany);
        setCompany(memberCompany as Company);
        setUserRole(membership.role || 'member');
        return;
      }

      // No crear empresa automáticamente - usuario puede unirse via invitaciones
console.log('⚠️ [AUTH] No company found - user can join via invitations');
setCompany(null);
setUserRole('member');

    } catch (error) {
      console.error('❌ [AUTH] Error fetching user company:', error);
      setCompany(null);
      setUserRole('member');
    } finally {
      setIsCompanyLoading(false);
      setLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (user?.id && !isSuperAdmin(user)) {
      await fetchUserCompany(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    setSession(session);
    setUser(session?.user ?? null);
  };

  const updateUserProfile = async (data: { name?: string; avatar_url?: string }) => {
    if (!user) throw new Error('No user logged in');
    
    const { error } = await supabase.auth.updateUser({
      data: data
    });
    
    if (error) throw error;
  };

  const isCompanyOwner = company?.owner_id === user?.id;

  const value = {
    user,
    session,
    company,
    userRole,
    loading,
    isLoading: loading,
    isCompanyLoading,
    isCompanyOwner,
    signOut,
    refreshSession,
    refreshCompany,
    updateUserProfile,
  };

  // Debug: Log del estado del AuthContext
  console.log('🎯 [AUTH] AuthContext state:', {
    user: user?.id,
    isSuperAdmin: isSuperAdmin(user),
    company: company?.id,
    companyName: company?.name,
    userRole,
    loading,
    isCompanyLoading,
    isCompanyOwner
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

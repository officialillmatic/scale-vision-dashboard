import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Centralized logger for debug messages. Only emits output when
// VITE_DEBUG_MODE=true. See src/utils/logger.ts for details.
import { log, warn, error } from '@/utils/logger';

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
//
// Rather than hard‑coding super‑admin identifiers directly in the client bundle,
// we read them from environment variables. This allows you to configure
// privileged users without changing code or leaking credentials. The variables
// `VITE_SUPER_ADMIN_IDS` and `VITE_SUPER_ADMIN_EMAILS` should contain
// comma‑separated lists of user IDs and emails respectively. See
// docs/ENVIRONMENT_SETUP.md for details.
const SUPER_ADMIN_IDS: string[] = (import.meta.env.VITE_SUPER_ADMIN_IDS || '')
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean);

const SUPER_ADMIN_EMAILS: string[] = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim())
  .filter(Boolean);

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
    const matchId = SUPER_ADMIN_IDS.includes(currentUser.id);
    const matchEmail = SUPER_ADMIN_EMAILS.includes(currentUser.email ?? '');
    return matchId || matchEmail;
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
      log('🔥 [AUTH] Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        if (isSuperAdmin(session.user)) {
          log('🔥 [AUTH] Super admin detected - setting virtual company');
          setUserRole('super_admin');
          setCompany(createSuperAdminCompany(session.user.id));
          setLoading(false); // Super admin ready immediately
        } else {
          log('🔥 [AUTH] Regular user, fetching real company...');
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
      log('🔥 [AUTH] Auth state changed:', _event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        if (isSuperAdmin(session.user)) {
          log('🔥 [AUTH] Super admin login - setting virtual company');
          setUserRole('super_admin');
          setCompany(createSuperAdminCompany(session.user.id));
          setLoading(false); // Immediate access for super admin
        } else {
          log('🔥 [AUTH] Regular user login, fetching company...');
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
      log('🔍 [AUTH] Fetching company for user:', userId);

      // First try to find company where user is owner
      let { data: ownerCompany, error: ownerError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      log('🔍 [AUTH] Owner company query result:', { ownerCompany, ownerError });

      if (ownerCompany) {
        log('✅ [AUTH] User is company owner');
        setCompany(ownerCompany);
        setUserRole('admin');
        return;
      }

      // If not owner, check if they're a member
      log('🔍 [AUTH] User is not owner, checking membership...');
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

      log('🔍 [AUTH] Membership query result:', { membership, memberError });

      if (membership && membership.companies) {
        const memberCompany = Array.isArray(membership.companies) 
          ? membership.companies[0] 
          : membership.companies;
        
        log('✅ [AUTH] User is company member, company:', memberCompany);
        setCompany(memberCompany as Company);
        setUserRole(membership.role || 'member');
        return;
      }

      // No crear empresa automáticamente - usuario puede unirse via invitaciones
      warn('⚠️ [AUTH] No company found - user can join via invitations');
setCompany(null);
setUserRole('member');

    } catch (error) {
      error('❌ [AUTH] Error fetching user company:', error);
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

  // Debug: log the current AuthContext state. Useful for development,
  // but will only emit output when VITE_DEBUG_MODE=true. Remove or
  // minimise this for production bundles.
  log('🎯 [AUTH] AuthContext state:', {
    user: user?.id,
    isSuperAdmin: isSuperAdmin(user),
    company: company?.id,
    companyName: company?.name,
    userRole,
    loading,
    isCompanyLoading,
    isCompanyOwner,
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

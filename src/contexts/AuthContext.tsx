
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      } else {
        setCompany(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCompany = async (userId: string) => {
    try {
      setIsCompanyLoading(true);
      // First try to find company where user is owner
      let { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User is not an owner, check if they're a member
        const { data: membership, error: memberError } = await supabase
          .from('company_members')
          .select('company_id, companies(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (!memberError && membership) {
          company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
        }
      }

      if (company) {
        setCompany(company);
      }
    } catch (error) {
      console.error('Error fetching user company:', error);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const refreshCompany = async () => {
    if (user?.id) {
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
    loading,
    isLoading: loading,
    isCompanyLoading,
    isCompanyOwner,
    signOut,
    refreshSession,
    refreshCompany,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

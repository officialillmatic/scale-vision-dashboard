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
      console.log('🔍 Fetching company for user:', userId);

      // First try to find company where user is owner
      let { data: ownerCompany, error: ownerError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle(); // ✅ Cambiar single() por maybeSingle()

      console.log('Owner company query result:', { ownerCompany, ownerError });

      if (ownerCompany) {
        console.log('✅ User is company owner');
        setCompany(ownerCompany);
        return;
      }

      // If not owner, check if they're a member
      console.log('🔍 User is not owner, checking membership...');
      const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select(`
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
        .maybeSingle(); // ✅ Cambiar single() por maybeSingle()

      console.log('Membership query result:', { membership, memberError });

      if (membership && membership.companies) {
        // ✅ Arreglar el acceso a companies
        const memberCompany = Array.isArray(membership.companies) 
          ? membership.companies[0] 
          : membership.companies;
        
        console.log('✅ User is company member, company:', memberCompany);
        setCompany(memberCompany as Company);
        return;
      }

      // ✅ Si no encuentra company como owner ni como member, crear una por defecto
      console.log('⚠️ No company found, checking if we need to create one...');
      
      // Verificar si existen companies en el sistema
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (!existingCompanies || existingCompanies.length === 0) {
        console.log('📝 No companies exist, creating default company...');
        
        // Crear una company por defecto
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: 'My Company',
            owner_id: userId
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default company:', createError);
        } else {
          console.log('✅ Default company created:', newCompany);
          setCompany(newCompany);
          return;
        }
      }

      console.log('❌ No company found and could not create one');
      setCompany(null);

    } catch (error) {
      console.error('Error fetching user company:', error);
      setCompany(null);
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

  // 🔍 DEBUG: Log del estado del AuthContext
  console.log('🎯 AuthContext state:', {
    user: user?.id,
    company: company?.id,
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
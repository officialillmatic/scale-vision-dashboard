import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, fetchCompany } from "@/services/companyService";
import { fetchCompanyMembers, CompanyMember } from "@/services/memberService";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  company: Company | null;
  isCompanyLoading: boolean;
  userRole: 'admin' | 'member' | 'viewer' | null;
  companyMembers: CompanyMember[];
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  isCompanyOwner: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'viewer' | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  
  // Handle auth state changes
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch company data when user changes
  useEffect(() => {
    const loadCompanyData = async () => {
      if (user) {
        setIsCompanyLoading(true);
        try {
          // First check if user owns a company
          let companyData = await fetchCompany();
          
          // If no company found, check if user is a member of a company
          if (!companyData) {
            const { data: memberData, error: memberError } = await supabase
              .from('company_members')
              .select(`
                company_id,
                role,
                companies:company_id (
                  id,
                  name,
                  logo_url,
                  owner_id,
                  created_at,
                  updated_at
                )
              `)
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (!memberError && memberData && memberData.companies) {
              // Format company data from the join
              companyData = {
                id: memberData.companies.id,
                name: memberData.companies.name,
                logo_url: memberData.companies.logo_url,
                owner_id: memberData.companies.owner_id,
                created_at: new Date(memberData.companies.created_at),
                updated_at: new Date(memberData.companies.updated_at)
              };
              
              // Set user role directly from the query result
              setUserRole(memberData.role as 'admin' | 'member' | 'viewer');
            }
          }
          
          setCompany(companyData);
          
          // Determine if user is company owner
          if (companyData) {
            setIsCompanyOwner(companyData.owner_id === user.id);
            
            // Fetch company members to determine user's role
            const members = await fetchCompanyMembers(companyData.id);
            
            setCompanyMembers(members || []);
            
            // Find the user's role if not already set
            if (!userRole) {
              const userMember = members?.find(member => member.user_id === user.id);
              if (userMember) {
                setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
              } else if (companyData.owner_id === user.id) {
                setUserRole('admin'); // Company owner is always admin
              }
            }
          }
        } catch (error) {
          console.error("Error loading company data:", error);
          toast.error("Failed to load company data");
        } finally {
          setIsCompanyLoading(false);
        }
      } else {
        setCompany(null);
        setCompanyMembers([]);
        setUserRole(null);
        setIsCompanyOwner(false);
        setIsCompanyLoading(false);
      }
    };

    loadCompanyData();
  }, [user]);

  const refreshCompany = async () => {
    if (user) {
      setIsCompanyLoading(true);
      try {
        const companyData = await fetchCompany();
        setCompany(companyData);
        
        if (companyData) {
          setIsCompanyOwner(companyData.owner_id === user.id);
          
          // Refresh company members
          const members = await fetchCompanyMembers(companyData.id);
          
          setCompanyMembers(members || []);
          
          // Update user role
          const userMember = members?.find(member => member.user_id === user.id);
          if (userMember) {
            setUserRole(userMember.role as 'admin' | 'member' | 'viewer');
          } else if (companyData.owner_id === user.id) {
            setUserRole('admin'); // Company owner is always admin
          }
        }
      } catch (error) {
        console.error("Error refreshing company data:", error);
        toast.error("Failed to refresh company data");
      } finally {
        setIsCompanyLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setCompany(null);
      setCompanyMembers([]);
      setUserRole(null);
      setIsCompanyOwner(false);
      toast.success("Successfully signed out");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

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

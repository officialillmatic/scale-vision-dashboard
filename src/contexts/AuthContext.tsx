
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company, fetchCompany } from "@/services/companyService";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  company: Company | null;
  isCompanyLoading: boolean;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);

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
          const companyData = await fetchCompany();
          setCompany(companyData);
        } catch (error) {
          console.error("Error loading company data:", error);
        } finally {
          setIsCompanyLoading(false);
        }
      } else {
        setCompany(null);
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

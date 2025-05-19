import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  owner_id: string;
}

export const AuthContext = createContext<{
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isLoadingCompany: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { metadata?: any }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (updatedPassword: string) => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}>({
  user: null,
  company: null,
  isLoading: true,
  isLoadingCompany: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateUserProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCompany(session.user.id);
      }
      setIsLoading(false);
    };

    getSession();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCompany(session.user.id);
      } else {
        setCompany(null);
      }
    });
  }, []);

  const fetchCompany = async (userId: string) => {
    setIsLoadingCompany(true);
    try {
      let { data: companies, error } = await supabase
        .from('companies')
        .select("*")
        .eq('owner_id', userId)
        .single()

      if (error) {
        throw error;
      }

      if (companies) {
        setCompany(companies);
      } else {
        // If no company is found for the owner, check if the user is a member of a company
        let { data: companyMember, error: memberError } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', userId)
          .single();

        if (memberError) {
          throw memberError;
        }

        if (companyMember) {
          // Fetch the company details using the company_id
          let { data: memberCompany, error: fetchError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyMember.company_id)
            .single();

          if (fetchError) {
            throw fetchError;
          }

          if (memberCompany) {
            setCompany(memberCompany);
          } else {
            setCompany(null);
          }
        } else {
          setCompany(null);
        }
      }
    } catch (error: any) {
      console.error("Error fetching company:", error);
      toast.error(error.message ?? "Failed to fetch company");
      setCompany(null);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Successfully signed in!');
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast.error(error.message ?? "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, options?: { metadata?: any }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...options?.metadata,
          }
        }
      });
      if (error) throw error;

      // Create a user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          { id: data.user?.id, email: data.user?.email, ...options?.metadata }
        ]);

      if (profileError) throw profileError;

      toast.success('Successfully signed up!');
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast.error(error.message ?? "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully signed out!');
      navigate("/login");
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(error.message ?? "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
    } catch (error: any) {
      console.error("Error sending reset password email:", error);
      toast.error(error.message ?? "Failed to send reset password email");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (updatedPassword: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: updatedPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully!');
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message ?? "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserProfile = async (data: { name?: string; avatar_url?: string }) => {
    try {
      if (!user) {
        throw new Error("No user logged in");
      }
      
      // Update user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: data.name,
          avatar_url: data.avatar_url
        })
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }
      
      // Refresh user data 
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        throw userError;
      }
      
      // Update local state
      // Note: We're not updating the user state directly as it comes from auth session
      // If needed, we would refresh the session or update a separate profile state
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        isLoadingCompany,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

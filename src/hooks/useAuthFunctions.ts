
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAuthFunctions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      
      // Refresh user data
      const { data: updatedUserData, error: updateError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
        
      if (updateError) {
        throw updateError;
      }
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
      throw error;
    }
  };

  return {
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserProfile
  };
};


import { useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH_STATE] Auth event:", event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED') {
          console.log("[AUTH_STATE] Token refreshed successfully");
        } else if (event === 'SIGNED_OUT') {
          console.log("[AUTH_STATE] User signed out");
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AUTH_STATE] Error getting session:", error);
        // If session is invalid, sign out
        if (error.message?.includes('refresh_token') || error.message?.includes('invalid')) {
          supabase.auth.signOut();
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out");
      } else {
        toast.success("Successfully signed out");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return {
    session,
    user,
    isLoading,
    signOut
  };
}

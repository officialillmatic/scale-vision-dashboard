
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("[AUTH_STATE] Setting up auth state listener");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AUTH_STATE] Error getting session:", error);
      }
      
      console.log("[AUTH_STATE] Initial session loaded, user:", session?.user?.id || 'none');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH_STATE] Auth state change:", event, session?.user?.id || 'none');
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log("[AUTH_STATE] Signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AUTH_STATE] Sign out error:", error);
    }
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    isLoading,
    signOut
  };
};

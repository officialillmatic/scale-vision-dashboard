
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Use the new secure function
        const { data, error } = await supabase.rpc('is_super_admin_safe');
        
        if (error) {
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data || false);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdminStatus();
  }, [user]);

  return { isSuperAdmin, isLoading };
};

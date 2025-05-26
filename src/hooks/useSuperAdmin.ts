
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        console.log("[SUPER_ADMIN] Checking status for current user");
        
        // Use the new secure function
        const { data, error } = await supabase.rpc('is_super_admin_safe');
        
        if (error) {
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          console.log("[SUPER_ADMIN] Result:", data);
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
  }, []);

  return { isSuperAdmin, isLoading };
};

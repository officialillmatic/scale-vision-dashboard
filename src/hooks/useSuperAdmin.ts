import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log("[SUPER_ADMIN] Checking status for user:", user.id);
        
        // Verificar en la tabla super_admins
        const { data, error } = await supabase
          .from('super_admins')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error checking super admin status:', error);
          setIsSuperAdmin(false);
        } else {
          const isAdmin = !!data;
          console.log("[SUPER_ADMIN] Is SuperAdmin:", isAdmin);
          setIsSuperAdmin(isAdmin);
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
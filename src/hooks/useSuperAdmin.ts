import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = () => {
      try {
        console.log("[SUPER_ADMIN] ===================");
console.log("[SUPER_ADMIN] User object:", user);
console.log("[SUPER_ADMIN] User ID:", user?.id);
console.log("[SUPER_ADMIN] User email:", user?.email);
console.log("[SUPER_ADMIN] Expected ID:", '53392e76-008c-4e46-8443-a6ebd6bd4504');
console.log("[SUPER_ADMIN] ===================");
        
        // SOLO TU ID ESPECÍFICO ES SUPERADMIN
        const SUPER_ADMIN_ID = '53392e76-008c-4e46-8443-a6ebd6bd4504';
        
        const isAdmin = user?.id === SUPER_ADMIN_ID;
        console.log("[SUPER_ADMIN] Is SuperAdmin:", isAdmin);
        setIsSuperAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkSuperAdminStatus();
    } else {
      setIsSuperAdmin(false);
      setIsLoading(false);
    }
  }, [user]);

  return { isSuperAdmin, isLoading };
};
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = () => {
      try {
        console.log("[SUPER_ADMIN] Checking status for current user");
        
        // Define superadmin por email
        const superAdminEmails = [
          'aiagentsdevelopers@gmail.com',  // Tu email de superadmin
        ];
        
        const isAdmin = user?.email && superAdminEmails.includes(user.email);
        console.log("[SUPER_ADMIN] User email:", user?.email);
        console.log("[SUPER_ADMIN] Is SuperAdmin:", isAdmin);
        setIsSuperAdmin(isAdmin || false);
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
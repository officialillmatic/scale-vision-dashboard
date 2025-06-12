import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = () => {
      try {
        console.log("[SUPER_ADMIN] FORCED TO TRUE FOR TESTING");
        console.log("[SUPER_ADMIN] User ID:", user?.id);
        
        // TEMPORAL: Forzar siempre true para testing
        setIsSuperAdmin(true);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Ejecutar inmediatamente sin esperar user
    checkSuperAdminStatus();
  }, []); // Sin dependencias para que se ejecute solo una vez

  return { isSuperAdmin, isLoading };
};
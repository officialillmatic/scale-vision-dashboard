import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdminStatus = () => {
  try {
    console.log("🔥 [SUPER_ADMIN] ===================");
    console.log("🔥 [SUPER_ADMIN] User object:", user);
    console.log("🔥 [SUPER_ADMIN] User ID:", user?.id);
    console.log("🔥 [SUPER_ADMIN] User email:", user?.email);
    console.log("🔥 [SUPER_ADMIN] User email length:", user?.email?.length);
    console.log("🔥 [SUPER_ADMIN] User email char by char:", user?.email?.split(''));
    console.log("🔥 [SUPER_ADMIN] Expected ID:", '53392e76-008c-4e46-8443-a6ebd6bd4504');
    console.log("🔥 [SUPER_ADMIN] Expected email:", 'aiagentsdevelopers@gmail.com');
    console.log("🔥 [SUPER_ADMIN] Expected email length:", 'aiagentsdevelopers@gmail.com'.length);
    console.log("🔥 [SUPER_ADMIN] Expected email char by char:", 'aiagentsdevelopers@gmail.com'.split(''));
    console.log("🔥 [SUPER_ADMIN] ===================");
    
    // TU ID Y EMAIL ESPECÍFICOS
    const SUPER_ADMIN_ID = '53392e76-008c-4e46-8443-a6ebd6bd4504';
    const SUPER_ADMIN_EMAIL = 'aiagentsdevelopers@gmail.com';
    
    // Verificar por ambos métodos
    const isAdminById = user?.id === SUPER_ADMIN_ID;
    const isAdminByEmail = user?.email === SUPER_ADMIN_EMAIL;
    
    // 🔍 DEBUGGING ADICIONAL - Verificar si hay caracteres ocultos
    console.log("🔥 [SUPER_ADMIN] Raw user email JSON:", JSON.stringify(user?.email));
    console.log("🔥 [SUPER_ADMIN] Raw expected email JSON:", JSON.stringify(SUPER_ADMIN_EMAIL));
    console.log("🔥 [SUPER_ADMIN] Email comparison (strict):", user?.email === SUPER_ADMIN_EMAIL);
    console.log("🔥 [SUPER_ADMIN] Email comparison (toLowerCase):", user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    console.log("🔥 [SUPER_ADMIN] Email comparison (trimmed):", user?.email?.trim() === SUPER_ADMIN_EMAIL.trim());
    
    // 🛠️ LISTA DE SUPER ADMINS VERIFICADOS
const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com',        // ⬅️ NUEVO SUPER ADMIN
  'drscalewebmaster@gmail.com'      // ⬅️ CONFIRMADO SUPER ADMIN
];
    
    const isAdminByEmailVariant = POSSIBLE_EMAILS.some(email => 
      user?.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );
    
    const isAdmin = isAdminById || isAdminByEmailVariant;
    
    console.log("🔥 [SUPER_ADMIN] ID Match:", user?.id, "===", SUPER_ADMIN_ID, "=>", isAdminById);
    console.log("🔥 [SUPER_ADMIN] Email Match (original):", user?.email, "===", SUPER_ADMIN_EMAIL, "=>", isAdminByEmail);
    console.log("🔥 [SUPER_ADMIN] Email Match (variants):", isAdminByEmailVariant);
    console.log("🔥 [SUPER_ADMIN] Final Result:", isAdmin);
    console.log("🔥 [SUPER_ADMIN] ===================");
    
    setIsSuperAdmin(isAdmin);
  } catch (error) {
    console.error('🔥 [SUPER_ADMIN] Error checking super admin status:', error);
    setIsSuperAdmin(false);
  } finally {
    setIsLoading(false);
  }
};

    // Agregar delay para asegurar que el usuario esté completamente cargado
    const timer = setTimeout(() => {
      if (user) {
        console.log("🔥 [SUPER_ADMIN] User found, checking status...");
        checkSuperAdminStatus();
      } else {
        console.log("🔥 [SUPER_ADMIN] No user found after timeout, setting as false");
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    }, 100); // 100ms delay

    return () => clearTimeout(timer);
  }, [user]);

  // Debug: Log current state
  console.log("🔥 [SUPER_ADMIN] Current state:", { isSuperAdmin, isLoading, hasUser: !!user });

  return { isSuperAdmin, isLoading };
};
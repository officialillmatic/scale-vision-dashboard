import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  // Safely get auth context
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error("[USE_ROLE] Auth context not available:", error);
    throw error;
  }
  
  const { company, user, userRole, isCompanyOwner, isCompanyLoading } = authContext;
  
  // Safely get super admin context
  let superAdminContext;
  try {
    superAdminContext = useSuperAdmin();
  } catch (error) {
    console.error("[USE_ROLE] SuperAdmin context not available:", error);
    superAdminContext = { isSuperAdmin: false, isLoading: false };
  }
  
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = superAdminContext;
  
  // 🚨 BYPASS TEMPORAL: Verificación específica para emails de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isEmailSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
  
  console.log("🔥 [USE_ROLE] BYPASS DEBUG:");
  console.log("🔥 [USE_ROLE] User email:", user?.email);
  console.log("🔥 [USE_ROLE] isSuperAdmin from hook:", isSuperAdmin);
  console.log("🔥 [USE_ROLE] isEmailSuperAdmin:", isEmailSuperAdmin);
  console.log("🔥 [USE_ROLE] isCompanyOwner:", isCompanyOwner);
  console.log("🔥 [USE_ROLE] company:", company);
  console.log("🔥 [USE_ROLE] userRole:", userRole);
  console.log("🔥 [USE_ROLE] isCompanyLoading:", isCompanyLoading);
  console.log("🔥 [USE_ROLE] isSuperAdminLoading:", isSuperAdminLoading);
  
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // 🚨 BYPASS: Super admins siempre tienen privilegios (verificación por email también)
    if (isSuperAdmin || isEmailSuperAdmin) {
      console.log("🔥 [USE_ROLE] checkRole - Super admin access granted");
      return true;
    }
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If data is still loading, don't make assumptions
    if (isCompanyLoading || isSuperAdminLoading) return false;
    
    // Regular users need a company and role (except super admins)
    if (!company && !isSuperAdmin && !isEmailSuperAdmin) return false;
    
    if (!userRole && !isSuperAdmin && !isEmailSuperAdmin) {
      console.log("No userRole found and not super admin, returning false");
      return false;
    }
    
    // Role hierarchy: admin > member > viewer
    switch (role) {
      case 'admin': return userRole === 'admin';
      case 'member': return userRole === 'admin' || userRole === 'member';
      case 'viewer': return true; // All roles can view
      default: return false;
    }
  };
  
  const can = useMemo(() => {
    console.log("🔥 [USE_ROLE] Computing permissions...");
    console.log("🔥 [USE_ROLE] isSuperAdmin:", isSuperAdmin);
    console.log("🔥 [USE_ROLE] isEmailSuperAdmin:", isEmailSuperAdmin);
    console.log("🔥 [USE_ROLE] isCompanyOwner:", isCompanyOwner);
    
    // 🚨 BYPASS: Super admins por email o hook obtienen acceso completo INMEDIATAMENTE
    if (isSuperAdmin || isEmailSuperAdmin) {
      console.log("🔥 [USE_ROLE] BYPASS - Super admin detected, granting FULL access");
      return {
        manageTeam: true,
        manageAgents: true,
        viewAgents: true,
        createAgents: true,
        assignAgents: true,
        deleteAgents: true,
        viewCalls: true,
        uploadCalls: true,
        manageBalances: true,
        viewBalance: true,
        accessBillingSettings: true,
        editSettings: true,
        uploadCompanyLogo: true,
        inviteUsers: true,
        removeUsers: true,
        sendInvitations: true,
        superAdminAccess: true
      };
    }
    
    // Early return for loading states (SOLO para usuarios normales)
    if ((isCompanyLoading || isSuperAdminLoading)) {
      console.log("🔥 [USE_ROLE] Still loading and not super admin, returning limited permissions");
      return {
        manageTeam: false,
        manageAgents: false,
        viewAgents: false,
        createAgents: false,
        assignAgents: false,
        deleteAgents: false,
        viewCalls: false,
        uploadCalls: false,
        manageBalances: false,
        viewBalance: false,
        accessBillingSettings: false,
        editSettings: false,
        uploadCompanyLogo: false,
        inviteUsers: false,
        removeUsers: false,
        sendInvitations: false,
        superAdminAccess: false
      };
    }
    
    console.log("🔥 [USE_ROLE] Not super admin, computing regular permissions");
    
    return {
      // Team and agent management
      manageTeam: isCompanyOwner,
      manageAgents: isCompanyOwner, 
      viewAgents: isCompanyOwner || checkRole('viewer'), 
      createAgents: isCompanyOwner,
      assignAgents: isCompanyOwner,
      deleteAgents: isCompanyOwner,
      
      // Call management
      viewCalls: isCompanyOwner || checkRole('viewer'),
      uploadCalls: isCompanyOwner,
      
      // Billing management
      manageBalances: isCompanyOwner,
      viewBalance: isCompanyOwner || checkRole('viewer'),
      accessBillingSettings: isCompanyOwner,
      
      // Settings
      editSettings: isCompanyOwner,
      uploadCompanyLogo: isCompanyOwner,
      inviteUsers: isCompanyOwner,
      removeUsers: isCompanyOwner,
      
      // Invitations
      sendInvitations: isCompanyOwner,
      
      // Super admin privileges
      superAdminAccess: false
    };
  }, [isSuperAdmin, isEmailSuperAdmin, isCompanyOwner, user, userRole, company, isCompanyLoading, isSuperAdminLoading, checkRole]);
  
  // Debug logging
  console.log("🔥 [USE_ROLE] Final state:", {
    isSuperAdmin,
    isEmailSuperAdmin,
    isCompanyOwner,
    superAdminAccess: can.superAdminAccess,
    manageTeam: can.manageTeam,
    company: company?.id,
    user: user?.email
  });
  
  return { 
    isSuperAdmin: isSuperAdmin || isEmailSuperAdmin, // 🚨 BYPASS: Combinar ambas verificaciones
    isCompanyOwner, 
    checkRole, 
    can 
  };
};

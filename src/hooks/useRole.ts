import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  // Get auth context - usar el AuthContext actual con currentTeam y teamRole
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error("[USE_ROLE] Auth context not available:", error);
    throw error;
  }
  
  const { currentTeam, user, teamRole, loading: isTeamLoading } = authContext;
  
  // Get super admin context
  let superAdminContext;
  try {
    superAdminContext = useSuperAdmin();
  } catch (error) {
    console.error("[USE_ROLE] SuperAdmin context not available:", error);
    superAdminContext = { isSuperAdmin: false, isLoading: false };
  }
  
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = superAdminContext;
  
  // 🚨 BYPASS: Verificación por email de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isEmailSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
  
  // Calcular si es owner del team actual
  const isTeamOwner = teamRole === 'owner';
  
  console.log("🔥 [USE_ROLE] BYPASS DEBUG:");
  console.log("🔥 [USE_ROLE] User email:", user?.email);
  console.log("🔥 [USE_ROLE] isSuperAdmin from hook:", isSuperAdmin);
  console.log("🔥 [USE_ROLE] isEmailSuperAdmin:", isEmailSuperAdmin);
  console.log("🔥 [USE_ROLE] isTeamOwner:", isTeamOwner);
  console.log("🔥 [USE_ROLE] currentTeam:", currentTeam);
  console.log("🔥 [USE_ROLE] teamRole:", teamRole);
  console.log("🔥 [USE_ROLE] isTeamLoading:", isTeamLoading);
  console.log("🔥 [USE_ROLE] isSuperAdminLoading:", isSuperAdminLoading);
  
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // 🚨 BYPASS: Super admins siempre tienen privilegios
    if (isSuperAdmin || isEmailSuperAdmin) {
      console.log("🔥 [USE_ROLE] checkRole - Super admin access granted");
      return true;
    }
    
    // Team owners always have admin privileges
    if (isTeamOwner) return true;
    
    // If data is still loading, don't make assumptions
    if (isTeamLoading || isSuperAdminLoading) return false;
    
    // Regular users need a team and role (except super admins)
    if (!currentTeam && !isSuperAdmin && !isEmailSuperAdmin) return false;
    
    if (!teamRole && !isSuperAdmin && !isEmailSuperAdmin) {
      console.log("No teamRole found and not super admin, returning false");
      return false;
    }
    
    // Role hierarchy: admin > member > viewer
    switch (role) {
      case 'admin': return teamRole === 'admin' || teamRole === 'owner';
      case 'member': return teamRole === 'admin' || teamRole === 'owner' || teamRole === 'member';
      case 'viewer': return true; // All roles can view
      default: return false;
    }
  };
  
  const can = useMemo(() => {
    console.log("🔥 [USE_ROLE] Computing permissions...");
    console.log("🔥 [USE_ROLE] isSuperAdmin:", isSuperAdmin);
    console.log("🔥 [USE_ROLE] isEmailSuperAdmin:", isEmailSuperAdmin);
    console.log("🔥 [USE_ROLE] isTeamOwner:", isTeamOwner);
    
    // 🚨 BYPASS: Super admins obtienen acceso completo INMEDIATAMENTE
    // NO esperar por loading states para super admins
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
    if (isTeamLoading || isSuperAdminLoading) {
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
      manageTeam: isTeamOwner,
      manageAgents: isTeamOwner, 
      viewAgents: isTeamOwner || checkRole('viewer'), 
      createAgents: isTeamOwner,
      assignAgents: isTeamOwner,
      deleteAgents: isTeamOwner,
      
      // Call management
      viewCalls: isTeamOwner || checkRole('viewer'),
      uploadCalls: isTeamOwner,
      
      // Billing management
      manageBalances: isTeamOwner,
      viewBalance: isTeamOwner || checkRole('viewer'),
      accessBillingSettings: isTeamOwner,
      
      // Settings
      editSettings: isTeamOwner,
      uploadCompanyLogo: isTeamOwner,
      inviteUsers: isTeamOwner,
      removeUsers: isTeamOwner,
      
      // Invitations
      sendInvitations: isTeamOwner,
      
      // Super admin privileges
      superAdminAccess: false
    };
  }, [isSuperAdmin, isEmailSuperAdmin, isTeamOwner, user, teamRole, currentTeam, isTeamLoading, isSuperAdminLoading]);
  
  // Debug logging
  console.log("🔥 [USE_ROLE] Final state:", {
    isSuperAdmin: isSuperAdmin || isEmailSuperAdmin,
    isEmailSuperAdmin,
    isTeamOwner,
    superAdminAccess: can.superAdminAccess,
    manageTeam: can.manageTeam,
    currentTeam: currentTeam?.id,
    user: user?.email
  });
  
  return { 
    isSuperAdmin: isSuperAdmin || isEmailSuperAdmin, // 🚨 BYPASS: Combinar ambas verificaciones
    isCompanyOwner: isTeamOwner, // Alias para compatibilidad
    isTeamOwner, 
    checkRole, 
    can 
  };
};

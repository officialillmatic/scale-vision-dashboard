import { debugLog } from "@/lib/debug";
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
    throw error; // Re-throw to let parent components handle
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
  
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Super admins always have all privileges
    if (isSuperAdmin) return true;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If data is still loading, don't make assumptions
    if (isCompanyLoading || isSuperAdminLoading) return false;
    
    // Regular users need a company and role (except super admins)
    if (!company && !isSuperAdmin) return false;
    
    if (!userRole && !isSuperAdmin) {
      debugLog("No userRole found and not super admin, returning false");
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
    debugLog("🔥 [USE_ROLE] Computing permissions...");
    debugLog("🔥 [USE_ROLE] isSuperAdmin:", isSuperAdmin);
    debugLog("🔥 [USE_ROLE] isCompanyOwner:", isCompanyOwner);
    debugLog("🔥 [USE_ROLE] isCompanyLoading:", isCompanyLoading);
    debugLog("🔥 [USE_ROLE] isSuperAdminLoading:", isSuperAdminLoading);
    
    // Early return for loading states (BUT NOT FOR SUPER ADMINS)
    if ((isCompanyLoading || isSuperAdminLoading) && !isSuperAdmin) {
      debugLog("🔥 [USE_ROLE] Still loading and not super admin, returning limited permissions");
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
    
    // SUPER ADMINS GET ACCESS EVEN WITHOUT COMPANY AND EVEN WHILE LOADING
    if (isSuperAdmin) {
      debugLog("🔥 [USE_ROLE] Super admin detected, granting full access");
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
        superAdminAccess: true // ← ESTO DEBE SER TRUE
      };
    }
    
    debugLog("🔥 [USE_ROLE] Not super admin, computing regular permissions");
    
    return {
      // Team and agent management - Super admins and company owners get full access
      manageTeam: isSuperAdmin || isCompanyOwner,
      manageAgents: isSuperAdmin || isCompanyOwner, 
      viewAgents: isSuperAdmin || isCompanyOwner || checkRole('viewer'), 
      createAgents: isSuperAdmin || isCompanyOwner,
      assignAgents: isSuperAdmin || isCompanyOwner,
      deleteAgents: isSuperAdmin || isCompanyOwner,
      
      // Call management - simplified permissions
      viewCalls: isSuperAdmin || isCompanyOwner || checkRole('viewer'),
      uploadCalls: isSuperAdmin || isCompanyOwner,
      
      // Billing management - Super admins and company owners get full access
      manageBalances: isSuperAdmin || isCompanyOwner,
      viewBalance: isSuperAdmin || isCompanyOwner || checkRole('viewer'),
      accessBillingSettings: isSuperAdmin || isCompanyOwner,
      
      // Settings - Company owners and super admins only
      editSettings: isSuperAdmin || isCompanyOwner,
      uploadCompanyLogo: isSuperAdmin || isCompanyOwner,
      inviteUsers: isSuperAdmin || isCompanyOwner,
      removeUsers: isSuperAdmin || isCompanyOwner,
      
      // Invitations
      sendInvitations: isSuperAdmin || isCompanyOwner,
      
      // Super admin privileges
      superAdminAccess: isSuperAdmin
    };
  }, [isSuperAdmin, isCompanyOwner, user, userRole, company, isCompanyLoading, isSuperAdminLoading, checkRole]);
  
  // Debug logging
  debugLog("🔥 [USE_ROLE] Final state:", {
    isSuperAdmin,
    isCompanyOwner,
    superAdminAccess: can.superAdminAccess,
    company: company?.id,
    user: user?.id
  });
  
  return { isSuperAdmin, isCompanyOwner, checkRole, can };
};
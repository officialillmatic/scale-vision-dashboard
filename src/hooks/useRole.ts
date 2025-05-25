
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner, isCompanyLoading } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();

  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Super admins always have all privileges
    if (isSuperAdmin) return true;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If data is still loading, don't make assumptions
    if (isCompanyLoading || isSuperAdminLoading) return false;
    
    // Regular users need a company and role (super admins bypass this)
    if (!company && !isSuperAdmin) return false;
    
    if (!userRole && !isSuperAdmin) {
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
    // Early return for loading states
    if (isCompanyLoading || isSuperAdminLoading) {
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

  return { isSuperAdmin, isCompanyOwner, checkRole, can };
};

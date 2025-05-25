
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner, isCompanyLoading } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Super admins always have all privileges
    if (isSuperAdmin) return true;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If company data is still loading, don't make assumptions
    if (isCompanyLoading) return false;
    
    // Super admins can operate without a company
    if (isSuperAdmin && !company) return true;
    
    // Regular users need a company and role
    if (!company && !isSuperAdmin) return false;
    
    if (!userRole) {
      console.log("No userRole found, returning false");
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

  const can = useMemo(() => ({
    // Team and agent management
    manageTeam: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    manageAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'), 
    viewAgents: true,
    createAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    assignAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    deleteAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Call management
    viewCalls: true,
    uploadCalls: isSuperAdmin || checkRole('member'),
    
    // Billing management
    manageBalances: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    viewBalance: true,
    accessBillingSettings: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Settings
    editSettings: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    uploadCompanyLogo: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    inviteUsers: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    removeUsers: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Invitations
    sendInvitations: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Super admin privileges
    superAdminAccess: isSuperAdmin
  }), [isSuperAdmin, isCompanyOwner, checkRole, user, userRole, isCompanyLoading]);

  return { isSuperAdmin, isCompanyOwner, checkRole, can };
};

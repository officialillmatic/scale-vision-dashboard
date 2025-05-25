
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner, isCompanyLoading } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();

  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Super admins always have all privileges - this should be checked first
    if (isSuperAdmin) return true;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If company data is still loading, don't make assumptions
    if (isCompanyLoading || isSuperAdminLoading) return false;
    
    // Super admins don't need a company context
    if (isSuperAdmin) return true;
    
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
    // Team and agent management - Super admins get full access
    manageTeam: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    manageAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'), 
    viewAgents: isSuperAdmin || true, // Super admins can view all agents
    createAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    assignAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    deleteAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Call management
    viewCalls: isSuperAdmin || true, // Super admins can view all calls
    uploadCalls: isSuperAdmin || checkRole('member'),
    
    // Billing management - Super admins get full access
    manageBalances: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    viewBalance: isSuperAdmin || true, // Super admins can view all balances
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
  }), [isSuperAdmin, isCompanyOwner, user, userRole, isCompanyLoading, isSuperAdminLoading]);

  return { isSuperAdmin, isCompanyOwner, checkRole, can };
};

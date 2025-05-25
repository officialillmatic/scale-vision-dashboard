
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from './useSuperAdmin';

export type Role = 'admin' | 'member' | 'viewer';

/**
 * Hook for checking user roles and permissions throughout the application
 * Provides consistent access control based on user role and company ownership
 */
export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner, isCompanyLoading } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  /**
   * Check if a user has a specific role or higher in the role hierarchy
   * @param role The role to check against
   * @returns boolean indicating if user has the specified role or higher
   */
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Super admins always have all privileges
    if (isSuperAdmin) return true;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // If company data is still loading, don't make any assumptions
    if (isCompanyLoading) return false;
    
    // If company data is loaded but no company exists, user doesn't have roles
    if (!company && !isCompanyLoading) {
      return false;
    }
    
    // Use the userRole from AuthContext 
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

  /**
   * Permission map defining what actions each user can perform
   * This is the central source of truth for all permissions in the app
   */
  const can = useMemo(() => ({
    // Team and agent management - Super admins can manage everything globally
    manageTeam: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    manageAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'), 
    viewAgents: true, // All authenticated users can view their assigned agents
    createAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    assignAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    deleteAgents: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    
    // Call management - Super admins can see all calls globally
    viewCalls: true, // Allow all authenticated users to view their own calls
    uploadCalls: isSuperAdmin || checkRole('member'), // Members and admins can upload calls
    
    // Billing management - Super admins can manage all balances
    manageBalances: isSuperAdmin || isCompanyOwner || checkRole('admin'),
    viewBalance: true, // All users can view their own balance
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

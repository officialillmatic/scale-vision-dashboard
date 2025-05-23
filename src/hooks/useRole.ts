
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Role = 'admin' | 'member' | 'viewer';

/**
 * Hook for checking user roles and permissions throughout the application
 * Provides consistent access control based on user role and company ownership
 */
export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner, isCompanyLoading } = useAuth();

  /**
   * Check if a user has a specific role or higher in the role hierarchy
   * @param role The role to check against
   * @returns boolean indicating if user has the specified role or higher
   */
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
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
    // Team and agent management - restricted to admins only
    manageTeam: isCompanyOwner || checkRole('admin'),
    manageAgents: isCompanyOwner || checkRole('admin'), 
    viewAgents: true, // All authenticated users can view their assigned agents
    createAgents: isCompanyOwner || checkRole('admin'),
    assignAgents: isCompanyOwner || checkRole('admin'),
    deleteAgents: isCompanyOwner || checkRole('admin'),
    
    // Call management
    viewCalls: true, // Allow all authenticated users to view their own calls
    uploadCalls: checkRole('member'), // Members and admins can upload calls
    
    // Billing management - restricted to admins only
    manageBalances: isCompanyOwner || checkRole('admin'),
    viewBalance: true, // All users can view their own balance
    accessBillingSettings: isCompanyOwner || checkRole('admin'),
    
    // Settings
    editSettings: isCompanyOwner || checkRole('admin'),
    uploadCompanyLogo: isCompanyOwner || checkRole('admin'),
    inviteUsers: isCompanyOwner || checkRole('admin'),
    removeUsers: isCompanyOwner || checkRole('admin'),
    
    // Invitations (simplified from the previous redundant definition)
    sendInvitations: isCompanyOwner || checkRole('admin')
  }), [isCompanyOwner, checkRole, user, userRole, isCompanyLoading]);

  return { isCompanyOwner, checkRole, can };
};


import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Role = 'admin' | 'member' | 'viewer';

/**
 * Hook for checking user roles and permissions throughout the application
 * Provides consistent access control based on user role and company ownership
 */
export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner } = useAuth();

  /**
   * Check if a user has a specific role or higher in the role hierarchy
   * @param role The role to check against
   * @returns boolean indicating if user has the specified role or higher
   */
  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // During development, assume viewer rights if no company data is loaded yet
    if (!company) {
      console.warn('No company data loaded, default access controls applied');
      return role === 'viewer'; // More restrictive default - only allow viewer access
    }
    
    // Use the userRole from AuthContext 
    if (!userRole) {
      console.warn('No user role determined, assuming viewer access only');
      return role === 'viewer'; // Allow viewer access by default
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
  }), [isCompanyOwner, checkRole, user, userRole]);

  return { isCompanyOwner, checkRole, can };
};

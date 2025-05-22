
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner } = useAuth();

  const checkRole = (role: Role): boolean => {
    if (!user) return false;
    
    // During development, assume viewer rights if no company data is loaded yet
    if (!company) {
      console.warn('No company data loaded, default access controls applied');
      return role === 'viewer'; // More restrictive default - only allow viewer access
    }
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // Use the userRole from AuthContext 
    if (!userRole) {
      console.warn('No user role determined, assuming viewer access only');
      return role === 'viewer'; // Allow viewer access by default
    }
    
    // Role hierarchy: admin > member > viewer
    if (role === 'admin') return userRole === 'admin';
    if (role === 'member') return userRole === 'admin' || userRole === 'member';
    if (role === 'viewer') return true; // All roles can view
    
    return false;
  };

  const can = useMemo(() => ({
    // Agent management - restricted to admins only
    manageTeam: isCompanyOwner || checkRole('admin'),
    manageAgents: isCompanyOwner || checkRole('admin'), // Only admins can manage agents
    viewAgents: true, // All authenticated users can view their assigned agents
    createAgents: isCompanyOwner || checkRole('admin'), // Only admins can create agents
    assignAgents: isCompanyOwner || checkRole('admin'), // Only admins can assign agents
    deleteAgents: isCompanyOwner || checkRole('admin'), // Only admins can delete agents
    
    // Call management
    viewCalls: true, // Allow all authenticated users to view their own calls
    uploadCalls: checkRole('member'), // Members and admins can upload calls
    
    // Billing management - restricted to admins only
    manageBalances: isCompanyOwner || checkRole('admin'), // Only admins can update balances
    viewBalance: true, // All users can view their own balance
    
    // Settings
    editSettings: isCompanyOwner || checkRole('admin'), // Only admins and owners can edit settings
    uploadCompanyLogo: isCompanyOwner || checkRole('admin'), // Only admins and owners can change the logo
    inviteUsers: isCompanyOwner || checkRole('admin'), // Only admins and owners can invite users
    removeUsers: isCompanyOwner || checkRole('admin'), // Only admins and owners can remove users
    // Make this explicit (it was already implied by manageTeam)
    sendInvitations: isCompanyOwner || checkRole('admin') // Only admins and owners can send invitations
  }), [isCompanyOwner, checkRole, user, userRole]);

  return { isCompanyOwner, checkRole, can };
};

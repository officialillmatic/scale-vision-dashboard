
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user, companyMembers, userRole, isCompanyOwner } = useAuth();

  const checkRole = (role: Role): boolean => {
    if (!company || !user) return false;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // Use the userRole from AuthContext 
    if (!userRole) return false;
    
    // Role hierarchy: admin > member > viewer
    if (role === 'admin') return userRole === 'admin';
    if (role === 'member') return userRole === 'admin' || userRole === 'member';
    if (role === 'viewer') return true; // All roles can view
    
    return false;
  };

  const can = useMemo(() => ({
    manageTeam: isCompanyOwner || checkRole('admin'),
    manageAgents: isCompanyOwner || checkRole('admin'),
    viewCalls: checkRole('viewer'),
    uploadCalls: checkRole('member'),
    editSettings: isCompanyOwner || checkRole('admin'),
    inviteUsers: isCompanyOwner || checkRole('admin'),
    removeUsers: isCompanyOwner || checkRole('admin')
  }), [isCompanyOwner, company, user, userRole]);

  return { isCompanyOwner, checkRole, can };
};

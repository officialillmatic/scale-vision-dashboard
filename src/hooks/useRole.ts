
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyMember } from '@/services/companyService';

export type Role = 'admin' | 'member' | 'viewer';

export const useRole = () => {
  const { company, user } = useAuth();

  const isCompanyOwner = useMemo(() => {
    if (!company || !user) return false;
    return company.owner_id === user.id;
  }, [company, user]);

  const checkRole = (role: Role): boolean => {
    if (!company || !user) return false;
    
    // Company owners always have admin privileges
    if (isCompanyOwner) return true;
    
    // For specific role checks, we'll need to get the user's role from company_members
    // This would typically come from the auth context, but we're simulating it here
    const userRole = company.members?.find((member: CompanyMember) => 
      member.user_id === user.id
    )?.role;
    
    if (!userRole) return false;
    
    // Role hierarchy: admin > member > viewer
    if (role === 'admin') return userRole === 'admin';
    if (role === 'member') return userRole === 'admin' || userRole === 'member';
    if (role === 'viewer') return true; // All roles can view
    
    return false;
  };

  const can = {
    manageTeam: isCompanyOwner || checkRole('admin'),
    manageAgents: isCompanyOwner || checkRole('admin'),
    viewCalls: checkRole('viewer'),
    uploadCalls: checkRole('member'),
    editSettings: isCompanyOwner || checkRole('admin'),
    inviteUsers: isCompanyOwner || checkRole('admin'),
    removeUsers: isCompanyOwner || checkRole('admin')
  };

  return { isCompanyOwner, checkRole, can };
};

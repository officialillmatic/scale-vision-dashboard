
import React from 'react';
import { useRole } from '@/hooks/useRole';
import { Role } from '@/hooks/useRole';

interface RoleCheckProps {
  children: React.ReactNode;
  role?: Role;
  allowedAction?: keyof ReturnType<typeof useRole>['can'];
  fallback?: React.ReactNode;
  adminOnly?: boolean; // Shorthand for company owner or admin role
}

export const RoleCheck: React.FC<RoleCheckProps> = ({ 
  children, 
  role, 
  allowedAction,
  fallback = null,
  adminOnly = false
}) => {
  const { checkRole, can, isCompanyOwner } = useRole();
  
  const hasPermission = () => {
    // Admin only check (shorthand for owner or admin)
    if (adminOnly) {
      return isCompanyOwner || checkRole('admin');
    }
    
    // Combined role & action check
    if (role && allowedAction) {
      return checkRole(role) && can[allowedAction];
    }
    
    // Individual checks
    if (role) {
      return checkRole(role);
    }
    
    if (allowedAction) {
      return can[allowedAction];
    }
    
    return true;
  };
  
  return hasPermission() ? <>{children}</> : <>{fallback}</>;
};

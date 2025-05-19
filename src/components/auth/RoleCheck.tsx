
import React from 'react';
import { useRole } from '@/hooks/useRole';
import { Role } from '@/hooks/useRole';

interface RoleCheckProps {
  children: React.ReactNode;
  role?: Role;
  allowedAction?: keyof ReturnType<typeof useRole>['can'];
  fallback?: React.ReactNode;
}

export const RoleCheck: React.FC<RoleCheckProps> = ({ 
  children, 
  role, 
  allowedAction,
  fallback = null
}) => {
  const { checkRole, can } = useRole();
  
  const hasPermission = () => {
    if (role && allowedAction) {
      return checkRole(role) && can[allowedAction];
    }
    
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

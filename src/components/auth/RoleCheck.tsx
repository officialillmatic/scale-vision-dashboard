
import React from 'react';
import { useRole } from '@/hooks/useRole';
import { Role } from '@/hooks/useRole';
import { useAuth } from "@/contexts/AuthContext";

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
  const { isCompanyLoading } = useAuth();
  
  // If company data is still loading, don't render anything
  if (isCompanyLoading) {
    return null;
  }
  
  const hasPermission = () => {
    // Company owner always has all permissions
    if (isCompanyOwner) {
      return true;
    }
    
    // Admin only check (shorthand for admin role)
    if (adminOnly) {
      return checkRole('admin');
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

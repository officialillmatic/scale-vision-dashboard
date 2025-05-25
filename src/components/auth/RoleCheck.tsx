
import React from 'react';
import { useRole } from '@/hooks/useRole';
import { Role } from '@/hooks/useRole';
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleCheckProps {
  children: React.ReactNode;
  role?: Role;
  allowedAction?: keyof ReturnType<typeof useRole>['can'];
  fallback?: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  showLoading?: boolean;
}

export const RoleCheck: React.FC<RoleCheckProps> = ({ 
  children, 
  role, 
  allowedAction,
  fallback = null,
  adminOnly = false,
  superAdminOnly = false,
  showLoading = false
}) => {
  const { checkRole, can, isCompanyOwner } = useRole();
  const { isCompanyLoading } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  
  // Show loading while checking permissions
  if (isCompanyLoading || isSuperAdminLoading) {
    if (showLoading) {
      return (
        <div className="space-y-2 animate-pulse">
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <Skeleton className="h-4 w-[180px] bg-muted" />
        </div>
      );
    }
    return null;
  }
  
  const hasPermission = () => {
    // Super admin always has all permissions except for super admin only checks
    if (isSuperAdmin && !superAdminOnly) {
      return true;
    }
    
    // Super admin only check - only super admin can access
    if (superAdminOnly) {
      return isSuperAdmin;
    }
    
    // Company owner always has admin permissions (except super admin only)
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

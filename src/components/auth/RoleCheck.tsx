
import React from 'react';
import { useRole } from '@/hooks/useRole';
import { Role } from '@/hooks/useRole';
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleCheckProps {
  children: React.ReactNode;
  role?: Role;
  allowedAction?: keyof ReturnType<typeof useRole>['can'];
  fallback?: React.ReactNode;
  adminOnly?: boolean; // Shorthand for company owner or admin role
  superAdminOnly?: boolean; // Shorthand for super admin only
  showLoading?: boolean; // Whether to show loading state or not
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
  const { checkRole, can, isCompanyOwner, isSuperAdmin } = useRole();
  const { isCompanyLoading } = useAuth();
  
  // If company data is still loading, show loading state or nothing
  if (isCompanyLoading) {
    if (showLoading) {
      return (
        <div className="space-y-2 animate-pulse">
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <Skeleton className="h-4 w-[180px] bg-muted" />
        </div>
      );
    }
    // Don't render anything until we know the permissions
    return null;
  }
  
  const hasPermission = () => {
    // Super admin always has all permissions
    if (isSuperAdmin) {
      return true;
    }
    
    // Super admin only check
    if (superAdminOnly) {
      return false; // Only super admin can access, regular users cannot
    }
    
    // Company owner always has all permissions (except super admin only)
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

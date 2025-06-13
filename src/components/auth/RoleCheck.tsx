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
  // Safely get auth context
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error("[ROLE_CHECK] Auth context not available:", error);
    return <>{fallback}</>;
  }
  
  const { isCompanyLoading } = authContext;
  
  // Safely get role context
  let roleContext;
  try {
    roleContext = useRole();
  } catch (error) {
    console.error("[ROLE_CHECK] Role context not available:", error);
    return <>{fallback}</>;
  }
  
  const { checkRole, can, isCompanyOwner } = roleContext;
  
  // Safely get super admin context
  let superAdminContext;
  try {
    superAdminContext = useSuperAdmin();
  } catch (error) {
    console.error("[ROLE_CHECK] SuperAdmin context not available:", error);
    superAdminContext = { isSuperAdmin: false, isLoading: false };
  }
  
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = superAdminContext;
  
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
    // 🚀 LÓGICA CORREGIDA: Super admin siempre tiene acceso a todo
    if (isSuperAdmin) {
      return true;
    }
    
    // Si no es super admin pero es superAdminOnly, denegar acceso
    if (superAdminOnly) {
      return false;
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
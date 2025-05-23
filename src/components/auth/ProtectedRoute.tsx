
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/hooks/useRole";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requiredAction?: keyof ReturnType<typeof useRole>['can'];
  adminOnly?: boolean; // Shorthand for requiring admin or owner status
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiredAction,
  adminOnly = false
}: ProtectedRouteProps) => {
  const { user, isLoading, isCompanyLoading } = useAuth();
  const location = useLocation();
  const { checkRole, can, isCompanyOwner } = useRole();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    // Only perform permission check when both auth and company data are loaded
    if (!isLoading && !isCompanyLoading) {
      let access = false;
      
      // If not authenticated, no access
      if (!user) {
        access = false;
      }
      // Company owner always has full access
      else if (isCompanyOwner) {
        access = true;
      }
      // Admin-only check
      else if (adminOnly) {
        access = checkRole('admin');
        if (!access) {
          toast.error("This area requires administrator permissions");
        }
      }
      // Role check
      else if (requiredRole && !checkRole(requiredRole)) {
        access = false;
        toast.error(`You need ${requiredRole} permissions to access this page`);
      }
      // Action check
      else if (requiredAction && !can[requiredAction]) {
        access = false;
        toast.error(`You don't have permission to ${requiredAction.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
      // Path-specific checks
      else if (location.pathname.includes('/team') && !can.manageTeam) {
        access = false;
        toast.error("You don't have permission to access team management");
      }
      else if (location.pathname.includes('/settings/billing') && !can.accessBillingSettings) {
        access = false;
        toast.error("You don't have permission to access billing settings");
      }
      else {
        access = true;
      }
      
      setHasAccess(access);
      setPermissionChecked(true);
    }
  }, [
    user, 
    isLoading, 
    isCompanyLoading, 
    isCompanyOwner, 
    checkRole, 
    can, 
    requiredRole, 
    requiredAction, 
    adminOnly,
    location.pathname
  ]);
  
  // Check if loading
  if (isLoading || isCompanyLoading || !permissionChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-brand-purple" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if user has access
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // User is authenticated and has required permissions - allow access
  return <>{children}</>;
};


import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/hooks/useRole";
import { toast } from "sonner";
import { useEffect } from "react";

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
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { checkRole, can, isCompanyOwner } = useRole();
  
  // Check if loading
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Admin-only check - this takes precedence
  if (adminOnly && !isCompanyOwner && !checkRole('admin')) {
    useEffect(() => {
      toast.error("This area requires administrator permissions");
    }, []);
    return <Navigate to="/dashboard" replace />;
  }
  
  // Check for required role if specified
  if (requiredRole && !checkRole(requiredRole)) {
    useEffect(() => {
      toast.error(`You need ${requiredRole} permissions to access this page`);
    }, [requiredRole]);
    return <Navigate to="/dashboard" replace />;
  }
  
  // Check for required action if specified
  if (requiredAction && !can[requiredAction]) {
    useEffect(() => {
      toast.error(`You don't have permission to ${requiredAction.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    }, [requiredAction]);
    return <Navigate to="/dashboard" replace />;
  }
  
  // Additional verification for sensitive areas
  if (location.pathname.includes('/team') && !can.manageTeam) {
    useEffect(() => {
      toast.error("You don't have permission to access team management");
    }, []);
    return <Navigate to="/dashboard" replace />;
  }
  
  if (location.pathname.includes('/settings/billing') && !can.accessBillingSettings) {
    useEffect(() => {
      toast.error("You don't have permission to access billing settings");
    }, []);
    return <Navigate to="/settings" replace />;
  }
  
  // User is authenticated and has required permissions - allow access
  return <>{children}</>;
};

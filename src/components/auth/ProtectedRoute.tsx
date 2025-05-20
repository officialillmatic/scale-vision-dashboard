
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/hooks/useRole";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requiredAction?: keyof ReturnType<typeof useRole>['can'];
}

export const ProtectedRoute = ({ children, requiredRole, requiredAction }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { checkRole, can } = useRole();
  
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
  
  // Check for required role if specified
  if (requiredRole && !checkRole(requiredRole)) {
    toast.error(`You need ${requiredRole} permissions to access this page`);
    return <Navigate to="/dashboard" replace />;
  }
  
  // Check for required action if specified
  if (requiredAction && !can[requiredAction]) {
    toast.error(`You don't have permission to ${requiredAction.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    return <Navigate to="/dashboard" replace />;
  }
  
  // User is authenticated and has required permissions - allow access
  return <>{children}</>;
};

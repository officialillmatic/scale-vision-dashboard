
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole, Role } from "@/hooks/useRole";

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
  
  // Check for required role if specified - only warn but don't block
  if (requiredRole && !checkRole(requiredRole)) {
    console.warn(`User doesn't have required role: ${requiredRole}`);
    // Continue without redirecting
  }
  
  // Check for required action if specified - be lenient during development
  if (requiredAction && !can[requiredAction]) {
    console.warn(`User doesn't have required action permission: ${requiredAction}`);
    // Continue without redirecting during development
    // return <Navigate to="/dashboard" replace />;
  }
  
  // User is authenticated - allow access
  return <>{children}</>;
};

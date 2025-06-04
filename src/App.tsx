
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import TeamNew from '@/pages/TeamNew';

const queryClient = new QueryClient();

function RoleCheck({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <div>Unauthorized</div>;
  }

  return children;
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <TeamNew />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/team-new" 
          element={
            <ProtectedRoute>
              <TeamNew />
            </ProtectedRoute>
          } 
        />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/reset-password" element={<PasswordResetForm />} />
        <Route path="/update-password" element={<UpdatePasswordForm />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

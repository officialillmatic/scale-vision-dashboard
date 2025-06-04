
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { useAuth } from "@/contexts/AuthContext";
import TeamNew from '@/pages/TeamNew';

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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<TeamNew />} />
          <Route path="/team-new" element={<TeamNew />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/reset-password" element={<PasswordResetForm />} />
          <Route path="/update-password" element={<UpdatePasswordForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

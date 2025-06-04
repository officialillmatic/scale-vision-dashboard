import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Dashboard } from "@/pages/Dashboard";
import { CallData } from "@/pages/CallData";
import { CallAnalysis } from "@/pages/CallAnalysis";
import { UserBalance } from "@/pages/UserBalance";
import { TeamMembers } from "@/pages/TeamMembers";
import { TeamAgents } from "@/pages/TeamAgents";
import { Settings } from "@/pages/Settings";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { AcceptInvitation } from "@/pages/AcceptInvitation";
import { AdminDashboard } from "@/pages/AdminDashboard";
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/calls" element={<CallData />} />
          <Route path="/calls/:callId" element={<CallData />} />
          <Route path="/analytics" element={<CallAnalysis />} />
          <Route path="/balance" element={<UserBalance />} />
          <Route path="/agents" element={<TeamAgents />} />
          <Route path="/team" element={<TeamMembers />} />
          <Route path="/team-new" element={<TeamNew />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/reset-password" element={<PasswordResetForm />} />
          <Route path="/update-password" element={<UpdatePasswordForm />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/admin" element={
            <RoleCheck allowedRoles={['super_admin']}>
              <AdminDashboard />
            </RoleCheck>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

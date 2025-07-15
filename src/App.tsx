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
import Index from '@/pages/Index';
import DashboardPage from '@/pages/DashboardPage';
import TeamNew from '@/pages/TeamNew';
import CallsSimple from '@/pages/CallsSimple';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import SuperAdminCreditPage from '@/pages/SuperAdminCreditPage';
import TeamPage from '@/pages/TeamPage';
import ProfilePage from '@/pages/ProfilePage';
import SupportPage from '@/pages/SupportPage';
import AcceptInvitationPage from '@/pages/AcceptInvitationPage';
import SuperAdminTeamNew from '@/pages/SuperAdminTeamNew';
import SuperAdminCreditsNew from '@/pages/SuperAdminCreditsNew';
import PricingPage from '@/pages/PricingPage'; // ✅ AGREGADO
import StripeAdminConfigPage from '@/pages/StripeAdminConfigPage';

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public landing page - shows for everyone */}
        <Route path="/" element={<Index />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/reset-password" element={<PasswordResetForm />} />
        <Route path="/update-password" element={<UpdatePasswordForm />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calls-simple" 
          element={
            <ProtectedRoute>
              <CallsSimple />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* ✅ NUEVA RUTA AGREGADA - Pricing Page */}
        <Route 
          path="/pricing" 
          element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          } 
        />
        {/* ✅ NUEVA RUTA PARA CONFIGURACIÓN STRIPE ADMIN */}
<Route 
  path="/admin/stripe-config" 
  element={
    <ProtectedRoute>
      <StripeAdminConfigPage />
    </ProtectedRoute>
  } 
/>
        
        {/* 🚨 SOLUCIÓN: Rutas super admin SIMPLIFICADAS - sin SuperAdminRoute wrapper */}
        <Route 
          path="/team" 
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/credits" 
          element={
            <ProtectedRoute>
              <SuperAdminCreditPage />
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
        
        {/* Super Admin Routes */}
        <Route 
          path="/super-admin/team" 
          element={
            <ProtectedRoute>
              <SuperAdminTeamNew />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/super-admin/credits" 
          element={
            <ProtectedRoute>
              <SuperAdminCreditsNew />
            </ProtectedRoute>
          } 
        />
        
        {/* Other protected routes */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/support" 
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          } 
        />
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

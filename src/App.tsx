
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CallsPage from "./pages/CallsPage";
import TeamPage from "./pages/TeamPage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SupportPage from "./pages/SupportPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { GlobalErrorBoundary } from "./components/common/GlobalErrorBoundary";
import { useEffect, useState } from "react";
import { initializeStorage } from "./services/storageService";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { UserPreferencesProvider } from "./hooks/useUserPreferences";
import { toast } from "sonner";

// Configure the query client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => {
  const [initializing, setInitializing] = useState(true);

  // Initialize storage buckets when the app starts with better error handling
  useEffect(() => {
    const init = async () => {
      try {
        await initializeStorage();
      } catch (e) {
        console.error("Failed to initialize storage buckets:", e);
        // Don't show toast on initial load - just log the error
      } finally {
        setInitializing(false);
      }
    };
    
    init();
  }, []);

  // Set the document title to the application name
  useEffect(() => {
    document.title = "Dr. Scale";
  }, []);

  // Listen for network status changes
  useEffect(() => {
    const handleOnline = () => {
      toast.success("Back online");
      // Refetch any stale queries
      queryClient.invalidateQueries();
    };
    
    const handleOffline = () => {
      toast.error("Network connection lost");
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPreferencesProvider>
            <ThemeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner position="bottom-right" closeButton />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  
                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/calls" element={
                    <ProtectedRoute requiredAction="viewCalls">
                      <CallsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/team" element={
                    <ProtectedRoute requiredAction="manageTeam">
                      <TeamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredAction="editSettings">
                      <SettingsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/support" element={
                    <ProtectedRoute>
                      <SupportPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;

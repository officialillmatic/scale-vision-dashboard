import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SuperAdminCreditPage() {
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Super admin emails
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  console.log("🚀 [DEBUG] Component loaded");
  console.log("🚀 [DEBUG] User:", user?.email);
  console.log("🚀 [DEBUG] Is Super Admin:", isSuperAdmin);

  useEffect(() => {
    if (user) {
      testConnection();
    }
  }, [user]);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🧪 [DEBUG] Starting connection test...");

      const testResults: any = {
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        is_super_admin: isSuperAdmin
      };

      // Test 1: Verificar conexión básica a Supabase
      console.log("🧪 [DEBUG] Test 1: Basic Supabase connection");
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        testResults.auth_test = { success: !authError, user_id: authData?.user?.id, error: authError?.message };
        console.log("✅ [DEBUG] Auth test result:", testResults.auth_test);
      } catch (e: any) {
        testResults.auth_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] Auth test failed:", e);
      }

      // Test 2: Verificar tabla user_credits
      console.log("🧪 [DEBUG] Test 2: user_credits table");
      try {
        const { data: creditsData, error: creditsError } = await supabase
          .from('user_credits')
          .select('*')
          .limit(5);
        
        testResults.user_credits_test = { 
          success: !creditsError, 
          count: creditsData?.length || 0, 
          sample: creditsData?.[0] || null,
          error: creditsError?.message 
        };
        console.log("✅ [DEBUG] user_credits test result:", testResults.user_credits_test);
      } catch (e: any) {
        testResults.user_credits_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] user_credits test failed:", e);
      }

      // Test 3: Verificar tabla user_profiles
      console.log("🧪 [DEBUG] Test 3: user_profiles table");
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(5);
        
        testResults.user_profiles_test = { 
          success: !profilesError, 
          count: profilesData?.length || 0, 
          sample: profilesData?.[0] || null,
          error: profilesError?.message 
        };
        console.log("✅ [DEBUG] user_profiles test result:", testResults.user_profiles_test);
      } catch (e: any) {
        testResults.user_profiles_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] user_profiles test failed:", e);
      }

      // Test 4: Verificar tabla users (fallback)
      console.log("🧪 [DEBUG] Test 4: users table");
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .limit(5);
        
        testResults.users_test = { 
          success: !usersError, 
          count: usersData?.length || 0, 
          sample: usersData?.[0] || null,
          error: usersError?.message 
        };
        console.log("✅ [DEBUG] users test result:", testResults.users_test);
      } catch (e: any) {
        testResults.users_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] users test failed:", e);
      }

      // Test 5: Verificar tabla calls
      console.log("🧪 [DEBUG] Test 5: calls table");
      try {
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .limit(5);
        
        testResults.calls_test = { 
          success: !callsError, 
          count: callsData?.length || 0, 
          sample: callsData?.[0] || null,
          error: callsError?.message 
        };
        console.log("✅ [DEBUG] calls test result:", testResults.calls_test);
      } catch (e: any) {
        testResults.calls_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] calls test failed:", e);
      }

      // Test 6: Verificar vista admin_user_credits_view
      console.log("🧪 [DEBUG] Test 6: admin_user_credits_view");
      try {
        const { data: viewData, error: viewError } = await supabase
          .from('admin_user_credits_view')
          .select('*')
          .limit(5);
        
        testResults.admin_view_test = { 
          success: !viewError, 
          count: viewData?.length || 0, 
          sample: viewData?.[0] || null,
          error: viewError?.message 
        };
        console.log("✅ [DEBUG] admin_view test result:", testResults.admin_view_test);
      } catch (e: any) {
        testResults.admin_view_test = { success: false, error: e.message };
        console.error("❌ [DEBUG] admin_view test failed:", e);
      }

      console.log("🎯 [DEBUG] All tests completed:", testResults);
      setDebugInfo(testResults);

      // Verificar si hay datos utilizables
      const hasCredits = testResults.user_credits_test?.success && testResults.user_credits_test?.count > 0;
      const hasProfiles = (testResults.user_profiles_test?.success && testResults.user_profiles_test?.count > 0) ||
                         (testResults.users_test?.success && testResults.users_test?.count > 0);
      
      if (!hasCredits) {
        setError("No hay datos en la tabla user_credits");
      } else if (!hasProfiles) {
        setError("No hay datos de perfiles de usuario");
      } else {
        toast.success("Conexión exitosa - Datos disponibles");
      }

    } catch (error: any) {
      console.error("❌ [DEBUG] Test connection failed:", error);
      setError(`Error de conexión: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
            <p className="text-muted-foreground mb-4">
              Se requieren privilegios de super administrador para acceder a este panel.
            </p>
            <p className="text-xs text-gray-400">
              Usuario actual: {user?.email || 'No autenticado'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">Panel de Gestión de Créditos - DEBUG</h1>
            <div className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              Super Admin
            </div>
          </div>
          <Button onClick={testConnection} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Probar Conexión
          </Button>
        </div>

        {/* Status */}
        {loading && (
          <Card>
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Probando conexión a base de datos...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Error detectado</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {Object.keys(debugInfo).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados de Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p><strong>Usuario:</strong> {debugInfo.user_email}</p>
                  <p><strong>Es Super Admin:</strong> {debugInfo.is_super_admin ? 'Sí' : 'No'}</p>
                  <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Auth Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">🔐 Autenticación</h4>
                    <p className={`text-sm ${debugInfo.auth_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.auth_test?.success ? '✅ Exitoso' : '❌ Error'}
                    </p>
                    {debugInfo.auth_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.auth_test.error}</p>
                    )}
                  </div>

                  {/* User Credits Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">💰 user_credits</h4>
                    <p className={`text-sm ${debugInfo.user_credits_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.user_credits_test?.success ? `✅ ${debugInfo.user_credits_test.count} registros` : '❌ Error'}
                    </p>
                    {debugInfo.user_credits_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.user_credits_test.error}</p>
                    )}
                  </div>

                  {/* User Profiles Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">👤 user_profiles</h4>
                    <p className={`text-sm ${debugInfo.user_profiles_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.user_profiles_test?.success ? `✅ ${debugInfo.user_profiles_test.count} registros` : '❌ Error'}
                    </p>
                    {debugInfo.user_profiles_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.user_profiles_test.error}</p>
                    )}
                  </div>

                  {/* Users Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">👥 users</h4>
                    <p className={`text-sm ${debugInfo.users_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.users_test?.success ? `✅ ${debugInfo.users_test.count} registros` : '❌ Error'}
                    </p>
                    {debugInfo.users_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.users_test.error}</p>
                    )}
                  </div>

                  {/* Calls Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">📞 calls</h4>
                    <p className={`text-sm ${debugInfo.calls_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.calls_test?.success ? `✅ ${debugInfo.calls_test.count} registros` : '❌ Error'}
                    </p>
                    {debugInfo.calls_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.calls_test.error}</p>
                    )}
                  </div>

                  {/* Admin View Test */}
                  <div className="p-3 border rounded">
                    <h4 className="font-medium mb-2">📊 admin_user_credits_view</h4>
                    <p className={`text-sm ${debugInfo.admin_view_test?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {debugInfo.admin_view_test?.success ? `✅ ${debugInfo.admin_view_test.count} registros` : '❌ Error'}
                    </p>
                    {debugInfo.admin_view_test?.error && (
                      <p className="text-xs text-red-500">{debugInfo.admin_view_test.error}</p>
                    )}
                  </div>
                </div>

                {/* Raw Data Preview */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">Ver datos raw de debug</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

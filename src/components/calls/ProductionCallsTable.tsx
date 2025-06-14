import { debugLog } from "@/lib/debug";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSecureCallData } from "@/hooks/useSecureCallData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RoleCheck } from "@/components/auth/RoleCheck";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { RefreshCw, Phone, Clock, DollarSign, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProductionCallsTable = () => {
  debugLog("🚨 COMPONENTE INICIADO - ProductionCallsTable");
  
  debugLog("🔥 COMPONENT RENDERIZADO - ProductionCallsTable");
  
  const { calls, isLoading, error, syncCallsSecurely } = useSecureCallData();
  
  debugLog("🔍 PASO 1: Después de obtener datos del hook", {
    calls: calls?.length || 0,
    isLoading,
    error: error?.message || null,
    callsArray: calls
  });
  
  debugLog("🔥 DATOS COMPLETOS DEL HOOK:", { 
    calls, 
    callsLength: calls?.length, 
    isLoading, 
    error,
    firstCall: calls?.[0]
  });

  if (calls && calls.length > 0) {
    calls.forEach((call, index) => {
      debugLog(`🔥 LLAMADA ${index + 1}:`, call);
    });
  } else {
    debugLog("🔥 NO HAY LLAMADAS - calls es:", calls);
  }

  debugLog("🔥 DATOS DEL HOOK:", { 
    calls: calls?.length, 
    isLoading, 
    error: error?.message,
    callsData: calls 
  });

  // Si hay datos, mostrar los primeros para debug
  if (calls && calls.length > 0) {
    debugLog("🔥 PRIMERA LLAMADA:", calls[0]);
  }
  
  debugLog("[COMPONENT] ProductionCallsTable renderizando");
  debugLog("[COMPONENT] Hook result:", { calls: calls.length, isLoading, error });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await syncCallsSecurely();
    } finally {
      setIsSyncing(false);
    }
  };

  const runWebhookDiagnostics = async () => {
    setIsDiagnosing(true);
    debugLog("🔧 INICIANDO DIAGNÓSTICO DE WEBHOOK");
    
    try {
      // Test 1: Verificar edge function básico
      debugLog("🔧 Test 1: Verificando edge function...");
      try {
        const response = await fetch('https://jqkkhwoybcenxqpvodev.supabase.co/functions/v1/retell-webhook', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8'}`
          }
        });
        debugLog("🔧 Edge function response:", response.status, response.statusText);
        toast.success(`Edge function responded: ${response.status}`);
      } catch (error) {
        debugLog("🔧 Edge function error:", error);
        toast.error(`Edge function failed: ${error.message}`);
      }
      
      // Test 2: Verificar webhook registration function
      debugLog("🔧 Test 2: Verificando webhook registration...");
      try {
        const { data, error } = await supabase.functions.invoke('register-retell-webhook', {
          body: { test: true },
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (error) {
          debugLog("🔧 Webhook registration error:", error);
          toast.error(`Webhook registration failed: ${error.message}`);
        } else {
          debugLog("🔧 Webhook registration success:", data);
          toast.success(`Webhook registration OK: ${data?.webhook_url || 'No URL'}`);
        }
      } catch (error) {
        debugLog("🔧 Webhook registration exception:", error);
        toast.error(`Webhook registration exception: ${error.message}`);
      }
      
      // Test 3: Verificar logs recientes de webhook
      debugLog("🔧 Test 3: Verificando logs de webhook...");
      try {
        const { data: logs, error: logsError } = await supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (logsError) {
          debugLog("🔧 Webhook logs error:", logsError);
          toast.error(`Cannot access webhook logs: ${logsError.message}`);
        } else {
          debugLog("🔧 Webhook logs:", logs);
          toast.info(`Found ${logs?.length || 0} recent webhook logs`);
        }
      } catch (error) {
        debugLog("🔧 Webhook logs exception:", error);
        toast.error(`Webhook logs exception: ${error.message}`);
      }
      
      // Test 4: Verificar llamadas recientes
      debugLog("🔧 Test 4: Verificando llamadas recientes...");
      try {
        const { data: recentCalls, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(3);
          
        if (callsError) {
          debugLog("🔧 Recent calls error:", callsError);
          toast.error(`Cannot access calls: ${callsError.message}`);
        } else {
          debugLog("🔧 Recent calls:", recentCalls);
          toast.info(`Found ${recentCalls?.length || 0} calls in database`);
        }
      } catch (error) {
        debugLog("🔧 Recent calls exception:", error);
        toast.error(`Recent calls exception: ${error.message}`);
      }
      
      // Test 5: Hacer un POST de prueba al webhook
      debugLog("🔧 Test 5: Haciendo POST de prueba al webhook...");
      try {
        const testPayload = {
          event: "test_diagnostic",
          data: {
            call_id: "test-call-diagnostic-123",
            agent_id: "test-agent-123",
            timestamp: Date.now() / 1000
          }
        };
        
        const response = await fetch('https://jqkkhwoybcenxqpvodev.supabase.co/functions/v1/retell-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8'}`
          },
          body: JSON.stringify(testPayload)
        });
        
        const responseText = await response.text();
        debugLog("🔧 Test POST response:", response.status, responseText);
        
        if (response.ok) {
          toast.success(`Test POST successful: ${response.status}`);
        } else {
          toast.error(`Test POST failed: ${response.status} - ${responseText}`);
        }
      } catch (error) {
        debugLog("🔧 Test POST exception:", error);
        toast.error(`Test POST exception: ${error.message}`);
      }
      
      debugLog("🔧 DIAGNÓSTICO COMPLETADO");
      toast.success("Webhook diagnostics completed! Check console for details.");
      
    } catch (error) {
      console.error("🔧 Error general en diagnóstico:", error);
      toast.error(`Diagnostic failed: ${error.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  debugLog("🔍 PASO 2: Después de definir handleRefresh", {
    isLoading,
    error: !!error,
    callsLength: calls?.length
  });

  if (isLoading) {
    debugLog("🔥 ESTADO: Cargando datos...");
    debugLog("🔍 RETURN TEMPRANO: isLoading = true, retornando LoadingSpinner");
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  debugLog("🔍 PASO 3: Pasó la condición isLoading");

  if (error) {
    debugLog("🔥 ERROR DETECTADO:", error);
    debugLog("🔍 RETURN TEMPRANO: error existe, retornando ErrorCard");
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <p className="text-gray-600">Unable to load call data</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="bg-white hover:bg-gray-50"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  debugLog("🔍 PASO 4: Pasó la condición error");

  debugLog("🔍 PASO 5: Antes de calcular totales");

  const totalCalls = calls.length;
  const totalCost = calls.reduce((sum, call) => sum + (call.cost_usd || call.cost || 0), 0);
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration_sec || call.duration || 0), 0);

  debugLog("🔍 PASO 6: Después de calcular totales", {
    totalCalls,
    totalCost,
    totalDuration,
    firstCallStructure: calls[0]
  });

  debugLog("🔥 CÁLCULOS DE TOTALES:", {
    totalCalls,
    totalCost,
    totalDuration,
    firstCallStructure: calls[0]
  });

  debugLog("🔥 ESTADÍSTICAS CALCULADAS:", {
    totalCalls,
    totalCost,
    totalDuration,
    callsArray: calls
  });

  // Debug log just before rendering calls
  debugLog("🔥 RENDER DE LLAMADAS:", {
    callsLength: calls.length,
    calls: calls,
    shouldShowCalls: calls.length > 0,
    firstCall: calls[0]
  });

  debugLog("🔍 PASO 7: Antes del JSX return");

  // LOG FINAL ANTES DEL RETURN PRINCIPAL
  debugLog("🔥 ANTES DEL RETURN PRINCIPAL:", {
    calls: calls.length,
    isLoading,
    error,
    "llegando al render": true
  });

  debugLog("🔍 PASO 8: Iniciando construcción del JSX");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {/* ... keep existing code (all the summary cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Call Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">Recent Calls</CardTitle>
            <RoleCheck adminOnly fallback={null}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isSyncing}
                className="bg-white hover:bg-gray-50"
              >
                {isSyncing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </RoleCheck>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No calls yet</p>
              <p className="text-sm">Your call history will appear here once you start making calls.</p>
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  🔥 DEBUG: No calls found. Check console logs for data details.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.slice(0, 10).map((call) => (
                <div
                  key={call.id}
                  className="p-6 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {call.fromNumber} → {call.toNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(call.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">{formatDuration(call.duration_sec)}</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{formatCurrency(call.cost_usd)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {call.summary && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {call.summary}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      {call.sentiment && (
                        <Badge 
                          variant="outline"
                          className={`${
                            call.sentiment === 'positive' ? 'border-green-200 text-green-700 bg-green-50' :
                            call.sentiment === 'negative' ? 'border-red-200 text-red-700 bg-red-50' :
                            'border-yellow-200 text-yellow-700 bg-yellow-50'
                          }`}
                        >
                          {call.sentiment}
                        </Badge>
                      )}
                      
                      {call.agent && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{call.agent.name}</div>
                        </div>
                      )}
                      
                      <div className="flex gap-1">
                        {call.hasRecording && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Audio
                          </Badge>
                        )}
                        {call.hasTranscript && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Transcript
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón temporal de diagnóstico */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                🔧 Diagnóstico de Webhook (Temporal)
              </h3>
              <p className="text-sm text-blue-700">
                Ejecuta diagnósticos completos del sistema de webhooks para identificar problemas
              </p>
            </div>
            <Button 
              onClick={runWebhookDiagnostics}
              disabled={isDiagnosing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isDiagnosing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Bug className="w-4 h-4" />
              )}
              {isDiagnosing ? 'Diagnosticando...' : '🔧 Run Webhook Diagnostics'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

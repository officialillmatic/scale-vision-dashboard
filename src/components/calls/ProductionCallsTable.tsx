
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSecureCallData } from "@/hooks/useSecureCallData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RoleCheck } from "@/components/auth/RoleCheck";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { RefreshCw, Phone, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ProductionCallsTable = () => {
  console.log("🔥 COMPONENT RENDERIZADO - ProductionCallsTable");
  
  const { calls, isLoading, error, syncCallsSecurely } = useSecureCallData();
  
  console.log("🔥 DATOS COMPLETOS DEL HOOK:", { 
    calls, 
    callsLength: calls?.length, 
    isLoading, 
    error,
    firstCall: calls?.[0]
  });

  if (calls && calls.length > 0) {
    calls.forEach((call, index) => {
      console.log(`🔥 LLAMADA ${index + 1}:`, call);
    });
  } else {
    console.log("🔥 NO HAY LLAMADAS - calls es:", calls);
  }

  console.log("🔥 DATOS DEL HOOK:", { 
    calls: calls?.length, 
    isLoading, 
    error: error?.message,
    callsData: calls 
  });

  // Si hay datos, mostrar los primeros para debug
  if (calls && calls.length > 0) {
    console.log("🔥 PRIMERA LLAMADA:", calls[0]);
  }
  
  console.log("[COMPONENT] ProductionCallsTable renderizando");
  console.log("[COMPONENT] Hook result:", { calls: calls.length, isLoading, error });
  
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await syncCallsSecurely();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    console.log("🔥 ESTADO: Cargando datos...");
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log("🔥 ERROR DETECTADO:", error);
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

  const totalCalls = calls.length;
  const totalCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);

  console.log("🔥 CÁLCULOS DE TOTALES:", {
    totalCalls,
    totalCost,
    totalDuration,
    firstCallStructure: calls[0]
  });

  console.log("🔥 ESTADÍSTICAS CALCULADAS:", {
    totalCalls,
    totalCost,
    totalDuration,
    callsArray: calls
  });

  // Debug log just before rendering calls
  console.log("🔥 RENDER DE LLAMADAS:", {
    callsLength: calls.length,
    calls: calls,
    shouldShowCalls: calls.length > 0,
    firstCall: calls[0]
  });

  // LOG FINAL ANTES DEL RETURN PRINCIPAL
  console.log("🔥 ANTES DEL RETURN PRINCIPAL:", {
    calls: calls.length,
    isLoading,
    error,
    "llegando al render": true
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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
                            <span className="font-medium">{formatDuration(call.duration)}</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{formatCurrency(call.cost)}</span>
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
    </div>
  );
};

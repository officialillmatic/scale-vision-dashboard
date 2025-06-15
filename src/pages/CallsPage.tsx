import React, { useState } from "react";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, BarChart3, Settings, Activity, Bug } from "lucide-react";
import { ProductionCallsTable } from "@/components/calls/ProductionCallsTable";
import { RetellCallDataTable } from "@/components/calls/RetellCallDataTable";
import { CallTableSyncButton } from "@/components/calls/CallTableSyncButton";
import { CallTableErrorAlert } from "@/components/calls/CallTableErrorAlert";
import { SyncDebugPanel } from "@/components/calls/SyncDebugPanel";
import { SyncTestPanel } from "@/components/calls/SyncTestPanel";
import { CallSyncDebugPanel } from "@/components/calls/CallSyncDebugPanel";
import { CallDataDebugPanel } from "@/components/debug/CallDataDebugPanel";
import { WebhookDiagnostics } from "@/components/calls/WebhookDiagnostics";
// ✅ CAMBIO: Usar useSecureCallData en lugar de useRetellCalls
import { useSecureCallData } from "@/hooks/useSecureCallData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function CallsPage() {
  console.log("🔥 CALLS PAGE RENDERIZADA - USANDO SECURE HOOK");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  // ✅ CAMBIO: Usar useSecureCallData como fuente principal
  const { calls: secureCalls, isLoading: secureLoading, error: secureError } = useSecureCallData();
  
  // ✅ FUNCIÓN PARA REDONDEAR A 2 DECIMALES
  const roundToTwoDecimals = (value: number): number => {
    return Math.round((value || 0) * 100) / 100;
  };

  // ✅ FUNCIÓN formatCurrency CORREGIDA con 2 decimales máximo
  const formatCurrency = (amount: number) => {
    // Redondear a 2 decimales para evitar problemas de precisión flotante
    const roundedAmount = roundToTwoDecimals(amount);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2, // ✅ AGREGADO: Limitar a máximo 2 decimales
    }).format(roundedAmount);
  };
  
  // ✅ MAPEAR secureCalls al formato esperado por RetellCallDataTable CON REDONDEO
  const retellCalls = secureCalls.map(call => ({
    id: call.id,
    call_id: call.call_id,
    user_id: call.user_id,
    agent_id: call.agent_id,
    company_id: call.company_id,
    start_timestamp: call.timestamp || call.start_time,
    end_timestamp: call.start_time,
    duration_sec: call.duration_sec || 0,
    cost_usd: roundToTwoDecimals(call.cost_usd), // ✅ REDONDEAR A 2 DECIMALES
    revenue_amount: roundToTwoDecimals(call.revenue_amount), // ✅ REDONDEAR A 2 DECIMALES
    call_status: call.call_status || 'unknown',
    from_number: call.from_number,
    to_number: call.to_number,
    transcript: call.transcript,
    recording_url: call.audio_url,
    call_summary: call.call_summary,
    sentiment: call.sentiment,
    disposition: call.disposition,
    latency_ms: call.latency_ms,
    agent: null // Será mapeado si es necesario
  }));

  console.log("🔥 CALLS PAGE - SECURE HOOK DATA:", {
    secureCalls: secureCalls?.length || 0,
    secureLoading,
    secureError: secureError?.message,
    mappedRetellCalls: retellCalls?.length || 0
  });

  const handleSyncComplete = () => {
    console.log('[CALLS_PAGE] Sync completed, refreshing call data...');
    // El useSecureCallData debería refrescar automáticamente
  };

  const totalCalls = retellCalls.length;
  const activeCalls = retellCalls.filter(call => call.call_status === 'completed').length;
  const totalDuration = retellCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  // ✅ CALCULAR totalCost con redondeo a 2 decimales
  const totalCost = roundToTwoDecimals(
    retellCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0)
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug handler para cambios de pestaña
  const handleTabChange = (value: string) => {
    console.log("🔍 PESTAÑA SELECCIONADA:", value);
    console.log("🔍 TIMESTAMP:", new Date().toISOString());
  };

  return (
    <ProductionDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
            <p className="text-gray-600">Monitor and manage your AI call interactions</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <CallTableSyncButton onSyncComplete={handleSyncComplete} />
          </div>
        </div>

        {/* Show error alert if there's an error */}
        <CallTableErrorAlert error={secureError} />

        {/* Debug Info Card - ACTUALIZADO */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-green-800 mb-2">✅ DEBUG INFO - USANDO SECURE HOOK</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Secure Calls (Fuente Principal):</strong> {secureCalls?.length || 0} | Loading: {secureLoading ? 'Yes' : 'No'} | Error: {secureError?.message || 'None'}</p>
              <p><strong>Mapped Retell Calls:</strong> {retellCalls?.length || 0}</p>
              <p><strong>Hook Usado:</strong> useSecureCallData ✅</p>
              <p><strong>Total Cost (2 decimales):</strong> {formatCurrency(totalCost)} ✅</p>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCalls}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
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
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                  {/* ✅ USAR formatCurrency corregida */}
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="calls" onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="production-calls">Production Table</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
            <TabsTrigger value="test">Test Suite</TabsTrigger>
            <TabsTrigger value="sync-debug" className="text-red-600">
              <Bug className="w-3 h-3 mr-1" />
              Sync Debug
            </TabsTrigger>
            <TabsTrigger value="data-debug" className="text-orange-600">
              <Bug className="w-3 h-3 mr-1" />
              Data Debug
            </TabsTrigger>
            <TabsTrigger value="webhook-debug" className="text-purple-600">
              <Bug className="w-3 h-3 mr-1" />
              Webhook Debug
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calls">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: calls (Call History) - CON SECURE HOOK");
              return (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold text-gray-900">Recent Calls (Secure Hook ✅)</CardTitle>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search calls..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-md text-sm"
                        />
                        <input
                          type="date"
                          value={selectedDate?.toISOString().split('T')[0] || ''}
                          onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                          className="px-3 py-2 border border-gray-200 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {secureLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : (
                      <RetellCallDataTable
                        calls={retellCalls}
                        isLoading={secureLoading}
                        searchTerm={searchTerm}
                        date={selectedDate}
                        onSelectCall={(call) => console.log('Selected call:', call)}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="production-calls">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: production-calls");
              console.log("🔍 A PUNTO DE RENDERIZAR ProductionCallsTable");
              console.log("🔍 COMPONENTE ProductionCallsTable:", ProductionCallsTable);
              return (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-xl font-semibold text-gray-900">Production Calls Table (Secure Hook)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 bg-blue-50 border border-blue-200 mb-4">
                      <p className="text-blue-800 font-medium">🔍 DEBUG: About to render ProductionCallsTable</p>
                      <p className="text-blue-700 text-sm">If you see this but no ProductionCallsTable logs, there's an import or component issue.</p>
                    </div>
                    <ProductionCallsTable />
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="analytics">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: analytics");
              return (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-center py-12 text-gray-500">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Analytics Dashboard</p>
                      <p className="text-sm">Call analytics and insights will be displayed here.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="debug">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: debug");
              return <SyncDebugPanel />;
            })()}
          </TabsContent>

          <TabsContent value="test">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: test");
              return <SyncTestPanel />;
            })()}
          </TabsContent>

          <TabsContent value="sync-debug">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: sync-debug");
              return <CallSyncDebugPanel />;
            })()}
          </TabsContent>

          <TabsContent value="data-debug">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: data-debug");
              return <CallDataDebugPanel />;
            })()}
          </TabsContent>

          <TabsContent value="webhook-debug">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: webhook-debug");
              return <WebhookDiagnostics />;
            })()}
          </TabsContent>

          <TabsContent value="settings">
            {(() => {
              console.log("🔍 RENDERIZANDO TAB: settings");
              return (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-center py-12 text-gray-500">
                      <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Call Settings</p>
                      <p className="text-sm">Configuration options for call management.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </ProductionDashboardLayout>
  );
}

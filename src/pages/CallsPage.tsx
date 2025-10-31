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
import { useSecureCallData } from "@/hooks/useSecureCallData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function CallsPage() {
  console.log("🔥 CALLS PAGE RENDERIZADA - USANDO SECURE HOOK");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  // Usar useSecureCallData como fuente principal
  const { calls: secureCalls, isLoading: secureLoading, error: secureError } = useSecureCallData();
  
  // ✅ FUNCIÓN PARA REDONDEAR A 2 DECIMALES
  const roundToTwoDecimals = (value: number): number => {
    return Math.round((value || 0) * 100) / 100;
  };

  // ✅ FUNCIÓN formatCurrency CORREGIDA
  const formatCurrency = (amount: number) => {
    const roundedAmount = roundToTwoDecimals(amount);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedAmount);
  };
  
  // ✅ MAPEAR secureCalls al formato esperado por RetellCallDataTable
  const retellCalls = secureCalls.map(call => ({
    id: call.id,
    call_id: call.call_id,
    user_id: call.user_id,
    agent_id: call.agent_id,
    company_id: call.company_id,
    start_timestamp: call.timestamp || call.start_time,
    end_timestamp: call.start_time,
    duration_sec: call.duration_sec || 0,
    cost_usd: roundToTwoDecimals(call.cost_usd),
    revenue_amount: roundToTwoDecimals(call.revenue_amount),
    call_status: call.call_status || 'unknown',
    from_number: call.from_number,
    to_number: call.to_number,
    transcript: call.transcript,
    recording_url: call.audio_url,
    call_summary: call.call_summary,
    sentiment: call.sentiment,
    disposition: call.disposition,
    latency_ms: call.latency_ms,
    agent: null
  }));

  console.log("🔥 CALLS PAGE - SECURE HOOK DATA:", {
    secureCalls: secureCalls?.length || 0,
    secureLoading,
    secureError: secureError?.message,
    mappedRetellCalls: retellCalls?.length || 0
  });

  const handleSyncComplete = () => {
    console.log('[CALLS_PAGE] Sync completed, refreshing call data...');
  };

  // ✅ CÁLCULOS DE ESTADÍSTICAS
  const totalCalls = retellCalls.length;
  const activeCalls = retellCalls.filter(call => call.call_status === 'completed').length;
  const totalDuration = retellCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const totalCost = roundToTwoDecimals(
    retellCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0)
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTabChange = (value: string) => {
    console.log("🔍 PESTAÑA SELECCIONADA:", value);
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900">Recent Calls</CardTitle>
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
          </TabsContent>

          <TabsContent value="production-calls">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-xl font-semibold text-gray-900">Production Calls Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ProductionCallsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Analytics Dashboard</p>
                  <p className="text-sm">Call analytics and insights will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <SyncDebugPanel />
          </TabsContent>

          <TabsContent value="test">
            <SyncTestPanel />
          </TabsContent>

          <TabsContent value="sync-debug">
            <CallSyncDebugPanel />
          </TabsContent>

          <TabsContent value="data-debug">
            <CallDataDebugPanel />
          </TabsContent>

          <TabsContent value="webhook-debug">
            <WebhookDiagnostics />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Call Settings</p>
                  <p className="text-sm">Configuration options for call management.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProductionDashboardLayout>
  );
}

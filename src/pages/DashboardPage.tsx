
import React, { useState } from "react";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { DashboardSyncHeader } from "@/components/dashboard/DashboardSyncHeader";
import { DashboardSyncAlerts } from "@/components/dashboard/DashboardSyncAlerts";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { retellAgentSyncService } from "@/services/retell/retellAgentSync";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { isSuperAdmin } = useSuperAdmin();
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const runSyncTest = async () => {
    setIsTestRunning(true);
    setTestResults(null);
    
    try {
      console.log('[DASHBOARD_TEST] Starting sync test...');
      toast.info('Starting agent synchronization test...');
      
      const syncResult = await retellAgentSyncService.forceSync();
      
      console.log('[DASHBOARD_TEST] Sync test completed:', syncResult);
      setTestResults({
        success: true,
        data: syncResult,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`Sync test completed successfully!`);
    } catch (error: any) {
      console.error('[DASHBOARD_TEST] Sync test failed:', error);
      setTestResults({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      toast.error(`Sync test failed: ${error.message}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  const renderTestResults = () => {
    if (!testResults) return null;

    const { success, data, error, timestamp } = testResults;

    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <CardTitle className="text-lg">
              Sync Test Results
            </CardTitle>
            <Badge variant={success ? "outline" : "destructive"}>
              {success ? "Success" : "Failed"}
            </Badge>
          </div>
          <CardDescription>
            Test completed at {new Date(timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.total_agents_fetched || 0}
                  </div>
                  <div className="text-sm text-blue-700">Agents Fetched</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {data.agents_created || 0}
                  </div>
                  <div className="text-sm text-green-700">Created</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.agents_updated || 0}
                  </div>
                  <div className="text-sm text-yellow-700">Updated</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {data.agents_deactivated || 0}
                  </div>
                  <div className="text-sm text-red-700">Deactivated</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Sync Status: {data.sync_status} | 
                  Started: {data.sync_started_at && new Date(data.sync_started_at).toLocaleTimeString()} | 
                  Completed: {data.sync_completed_at && new Date(data.sync_completed_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 font-medium">Sync Failed</div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isSuperAdmin) {
    return (
      <ProductionDashboardLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
            <p className="text-gray-600">Manage your AI calling platform and monitor system health.</p>
          </div>
          <SuperAdminDashboard />
        </div>
      </ProductionDashboardLayout>
    );
  }

  return (
    <ProductionDashboardLayout>
      <div className="space-y-8">
        <DashboardSyncHeader />
        <DashboardSyncAlerts />
        
        {/* Test Sync Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Agent Synchronization Test
            </CardTitle>
            <CardDescription>
              Test the connection to Retell AI and sync agents to verify the integration is working properly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runSyncTest}
              disabled={isTestRunning}
              size="lg"
              className="flex items-center gap-2"
            >
              {isTestRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Sync Test...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Test Sync
                </>
              )}
            </Button>
            
            {renderTestResults()}
          </CardContent>
        </Card>
        
        <DashboardMetrics />
        <DashboardCharts />
      </div>
    </ProductionDashboardLayout>
  );
}

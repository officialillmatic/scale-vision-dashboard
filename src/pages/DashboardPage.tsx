
import React, { useState } from "react";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { UserAgentDashboard } from "@/components/dashboard/UserAgentDashboard";
import { DashboardSyncHeader } from "@/components/dashboard/DashboardSyncHeader";
import { DashboardSyncAlerts } from "@/components/dashboard/DashboardSyncAlerts";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AgentStatusOverview } from "@/components/dashboard/AgentStatusOverview";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserAgents } from "@/hooks/useCurrentUserAgents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { retellAgentSyncService } from "@/services/retell/retellAgentSync";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { isCompanyOwner, can } = useRole();
  const { data: userAgents } = useCurrentUserAgents();
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  console.log('🔍 [DashboardPage] Current user:', user?.id);
  console.log('🔍 [DashboardPage] isSuperAdmin:', isSuperAdmin);
  console.log('🔍 [DashboardPage] isCompanyOwner:', isCompanyOwner);
  console.log('🔍 [DashboardPage] can.manageTeam:', can.manageTeam);

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
            </div>
          ) : (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Super admin gets the special super admin dashboard
  if (isSuperAdmin) {
    return (
      <ProductionDashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">System-wide insights and management tools</p>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>

          <DashboardSyncHeader />
          <DashboardSyncAlerts />
          
          {/* Sync Test Section for Super Admins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Agent Synchronization Test
              </CardTitle>
              <CardDescription>
                Test the agent synchronization system and view detailed results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runSyncTest}
                disabled={isTestRunning}
                className="mb-4"
              >
                {isTestRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Sync Test...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Sync Test
                  </>
                )}
              </Button>
              
              {renderTestResults()}
            </CardContent>
          </Card>
          
          <SuperAdminDashboard />
        </div>
      </ProductionDashboardLayout>
    );
  }

  // Company owners and team managers get the comprehensive business dashboard
  if (isCompanyOwner || can.manageTeam) {
    return (
      <ProductionDashboardLayout>
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
              <p className="text-gray-600">Key metrics, insights, and performance analytics for your organization</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <BarChart3 className="w-3 h-3 mr-1" />
                Business View
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <DashboardKPICards />

          {/* Main Dashboard Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Recent Activity Feed */}
            <div className="lg:col-span-2">
              <RecentActivityFeed />
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Agent Status Overview */}
            <div className="lg:col-span-2">
              <AgentStatusOverview />
            </div>

            {/* Alerts & Notifications */}
            <DashboardAlerts />
          </div>

          {/* Performance Charts Section */}
          <DashboardCharts />
        </div>
      </ProductionDashboardLayout>
    );
  }

  // All other authenticated users get the simplified user dashboard
  return (
    <ProductionDashboardLayout>
      <div className="space-y-6">
        {/* User Dashboard Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600">Your personal AI assistant overview and recent activity</p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            User View
          </Badge>
        </div>

        {/* User-specific KPIs */}
        <DashboardKPICards />

        {/* User Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User's Recent Activity */}
          <RecentActivityFeed />
          
          {/* User's Quick Actions */}
          <QuickActions />
          
          {/* User's Agent Status */}
          <AgentStatusOverview />
          
          {/* User's Alerts */}
          <DashboardAlerts />
        </div>

        {/* Fallback to UserAgentDashboard for detailed user info */}
        <UserAgentDashboard />
      </div>
    </ProductionDashboardLayout>
  );
}

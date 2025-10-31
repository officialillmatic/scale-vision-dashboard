
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useRetellCalls } from '@/hooks/useRetellCalls';
import { useCurrentUserCalls } from '@/hooks/useCurrentUserCalls';
import { useCurrentUserAgents } from '@/hooks/useCurrentUserAgents';
import { UserContextDebug } from './UserContextDebug';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Bug, Database } from 'lucide-react';

export function CallDataDebugPanel() {
  const { user } = useAuth();
  const { retellCalls, isLoading: isLoadingRetell, refetch: refetchRetell } = useRetellCalls();
  const { userCalls, isLoading: isLoadingUser, refetch: refetchUser } = useCurrentUserCalls();
  const { data: userAgents, isLoading: isLoadingAgents, refetch: refetchAgents } = useCurrentUserAgents();

  const [rawData, setRawData] = React.useState<any>({});

  const runRawQueries = async () => {
    if (!user?.id) return;

    console.log('🔍 [CallDataDebugPanel] Running raw database queries...');
    
    try {
      // Query 1: User agent assignments
      const { data: assignments } = await supabase
        .from('user_agent_assignments')
        .select('*')
        .eq('user_id', user.id);

      // Query 2: All retell_calls
      const { data: allCalls } = await supabase
        .from('retell_calls')
        .select('*')
        .order('start_timestamp', { ascending: false })
        .limit(20);

      // Query 3: Retell agents
      const { data: agents } = await supabase
        .from('retell_agents')
        .select('*');

      // Query 4: User's specific calls
      const agentIds = assignments?.map(a => a.agent_id) || [];
      const { data: userSpecificCalls } = await supabase
        .from('retell_calls')
        .select('*')
        .in('agent_id', agentIds);

      setRawData({
        assignments,
        allCalls,
        agents,
        userSpecificCalls,
        agentIds,
        queryTime: new Date().toISOString()
      });

      console.log('🔍 [CallDataDebugPanel] Raw query results:', {
        assignments: assignments?.length,
        allCalls: allCalls?.length,
        agents: agents?.length,
        userSpecificCalls: userSpecificCalls?.length,
        agentIds
      });
    } catch (error) {
      console.error('❌ [CallDataDebugPanel] Error running raw queries:', error);
    }
  };

  const refreshAll = () => {
    console.log('🔄 [CallDataDebugPanel] Refreshing all data...');
    refetchRetell();
    refetchUser();
    refetchAgents();
    runRawQueries();
  };

  React.useEffect(() => {
    if (user?.id) {
      runRawQueries();
    }
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* User-specific debug panel */}
      <UserContextDebug />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Call Data Debug Panel
            </CardTitle>
            <Button onClick={refreshAll} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Context */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">User Context</h3>
            <div className="text-sm space-y-1">
              <div><strong>User ID:</strong> {user?.id || 'Not available'}</div>
              <div><strong>Email:</strong> {user?.email || 'Not available'}</div>
              <div><strong>Authenticated:</strong> {user ? '✅' : '❌'}</div>
            </div>
          </div>

          {/* Hook States */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">useRetellCalls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <Badge variant={isLoadingRetell ? "secondary" : "outline"}>
                    {isLoadingRetell ? "Loading..." : "Loaded"}
                  </Badge>
                  <div><strong>Count:</strong> {retellCalls?.length || 0}</div>
                  <div><strong>Sample:</strong> {retellCalls?.[0]?.call_id || 'None'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">useCurrentUserCalls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <Badge variant={isLoadingUser ? "secondary" : "outline"}>
                    {isLoadingUser ? "Loading..." : "Loaded"}
                  </Badge>
                  <div><strong>Count:</strong> {userCalls?.length || 0}</div>
                  <div><strong>Sample:</strong> {userCalls?.[0]?.call_id || 'None'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">useCurrentUserAgents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <Badge variant={isLoadingAgents ? "secondary" : "outline"}>
                    {isLoadingAgents ? "Loading..." : "Loaded"}
                  </Badge>
                  <div><strong>Count:</strong> {userAgents?.length || 0}</div>
                  <div><strong>Primary:</strong> {userAgents?.find(a => a.is_primary)?.agent_details?.name || 'None'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Raw Database Queries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Raw Database Queries
              </h3>
              <Button onClick={runRawQueries} variant="outline" size="sm">
                Run Queries
              </Button>
            </div>

            {rawData.queryTime && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">User Agent Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1">
                      <div><strong>Count:</strong> {rawData.assignments?.length || 0}</div>
                      <div><strong>Agent IDs:</strong> {rawData.agentIds?.join(', ') || 'None'}</div>
                      {rawData.assignments?.slice(0, 2).map((assignment: any, i: number) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                          ID: {assignment.id}, Agent: {assignment.agent_id}, Primary: {assignment.is_primary ? '✅' : '❌'}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">All Retell Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1">
                      <div><strong>Total Count:</strong> {rawData.allCalls?.length || 0}</div>
                      <div><strong>User's Calls:</strong> {rawData.userSpecificCalls?.length || 0}</div>
                      {rawData.allCalls?.slice(0, 2).map((call: any, i: number) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                          {call.call_id} | Agent: {call.agent_id} | Status: {call.call_status}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Retell Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1">
                      <div><strong>Count:</strong> {rawData.agents?.length || 0}</div>
                      {rawData.agents?.slice(0, 3).map((agent: any, i: number) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                          {agent.name} | ID: {agent.id} | Active: {agent.is_active ? '✅' : '❌'}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Query Timestamp</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs">
                      <div>{rawData.queryTime}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

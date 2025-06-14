import { debugLog } from "@/lib/debug";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Database, AlertCircle } from 'lucide-react';

export function UserContextDebug() {
  const { user, company } = useAuth();
  const [debugInfo, setDebugInfo] = React.useState<any>({});

  const runSpecificUserQueries = async () => {
    if (!user?.id) return;

    debugLog('🔍 [UserContextDebug] Running queries for alexbuenhombre2012@gmail.com...');

    try {
      // Get this specific user's profile
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', 'alexbuenhombre2012@gmail.com')
        .single();

      debugLog('🔍 User profile for alexbuenhombre2012@gmail.com:', userProfile);

      if (userProfile) {
        // Get agent assignments for this user
        const { data: assignments } = await supabase
          .from('user_agent_assignments')
          .select(`
            *,
            retell_agents!inner(*)
          `)
          .eq('user_id', userProfile.id);

        // Get calls for the agents assigned to this user
        const agentIds = assignments?.map(a => a.agent_id) || [];
        const { data: userCalls } = await supabase
          .from('retell_calls')
          .select('*')
          .in('agent_id', agentIds);

        // Get all retell_calls to see what's there
        const { data: allCalls } = await supabase
          .from('retell_calls')
          .select('call_id, agent_id, call_status, start_timestamp')
          .order('start_timestamp', { ascending: false })
          .limit(10);

        // Get all agents
        const { data: allAgents } = await supabase
          .from('retell_agents')
          .select('*')
          .ilike('name', '%solar%');

        setDebugInfo({
          userProfile,
          assignments,
          userCalls,
          allCalls,
          allAgents,
          agentIds,
          timestamp: new Date().toISOString()
        });

        debugLog('🔍 [UserContextDebug] Complete debug info:', {
          userProfile,
          assignments: assignments?.length,
          userCalls: userCalls?.length,
          allCalls: allCalls?.length,
          allAgents: allAgents?.length,
          agentIds
        });
      }
    } catch (error) {
      console.error('❌ [UserContextDebug] Error:', error);
      setDebugInfo({ error: error.message });
    }
  };

  React.useEffect(() => {
    runSpecificUserQueries();
  }, [user?.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Context Debug (alexbuenhombre2012@gmail.com)
          </CardTitle>
          <Button onClick={runSpecificUserQueries} variant="outline" size="sm">
            <Database className="h-4 w-4 mr-2" />
            Run Queries
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Auth Context */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Current Auth Context</h3>
          <div className="text-sm space-y-1">
            <div><strong>Current User ID:</strong> {user?.id}</div>
            <div><strong>Current Email:</strong> {user?.email}</div>
            <div><strong>Company ID:</strong> {company?.id}</div>
            <div><strong>Is Target User:</strong> {user?.email === 'alexbuenhombre2012@gmail.com' ? '✅' : '❌'}</div>
          </div>
        </div>

        {debugInfo.error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <strong>Error:</strong> {debugInfo.error}
            </div>
          </div>
        )}

        {debugInfo.userProfile && (
          <div className="space-y-4">
            {/* User Profile */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Target User Profile</h3>
              <div className="text-sm space-y-1">
                <div><strong>ID:</strong> {debugInfo.userProfile.id}</div>
                <div><strong>Email:</strong> {debugInfo.userProfile.email}</div>
                <div><strong>Name:</strong> {debugInfo.userProfile.name}</div>
              </div>
            </div>

            {/* Agent Assignments */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Agent Assignments ({debugInfo.assignments?.length || 0})</h3>
              <div className="space-y-2">
                {debugInfo.assignments?.map((assignment: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded text-sm">
                    <div><strong>Agent:</strong> {assignment.retell_agents?.name || 'Unknown'}</div>
                    <div><strong>Agent ID:</strong> {assignment.agent_id}</div>
                    <div><strong>Primary:</strong> {assignment.is_primary ? '✅' : '❌'}</div>
                  </div>
                )) || <div className="text-sm text-purple-700">No assignments found</div>}
              </div>
            </div>

            {/* User's Calls */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">User's Calls ({debugInfo.userCalls?.length || 0})</h3>
              <div className="space-y-2">
                {debugInfo.userCalls?.slice(0, 5).map((call: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded text-sm">
                    <div><strong>Call ID:</strong> {call.call_id}</div>
                    <div><strong>Agent ID:</strong> {call.agent_id}</div>
                    <div><strong>Status:</strong> {call.call_status}</div>
                    <div><strong>Date:</strong> {new Date(call.start_timestamp).toLocaleDateString()}</div>
                  </div>
                )) || <div className="text-sm text-orange-700">No calls found for assigned agents</div>}
              </div>
            </div>

            {/* Recent All Calls */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Recent Calls in System ({debugInfo.allCalls?.length || 0})</h3>
              <div className="space-y-2">
                {debugInfo.allCalls?.slice(0, 5).map((call: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded text-sm">
                    <div><strong>Call ID:</strong> {call.call_id}</div>
                    <div><strong>Agent ID:</strong> {call.agent_id}</div>
                    <div><strong>Status:</strong> {call.call_status}</div>
                  </div>
                )) || <div className="text-sm text-gray-700">No calls found in system</div>}
              </div>
            </div>

            {/* Solar Agents */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Solar Agents ({debugInfo.allAgents?.length || 0})</h3>
              <div className="space-y-2">
                {debugInfo.allAgents?.map((agent: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded text-sm">
                    <div><strong>Name:</strong> {agent.name}</div>
                    <div><strong>ID:</strong> {agent.id}</div>
                    <div><strong>Active:</strong> {agent.is_active ? '✅' : '❌'}</div>
                  </div>
                )) || <div className="text-sm text-yellow-700">No solar agents found</div>}
              </div>
            </div>

            {debugInfo.timestamp && (
              <div className="text-xs text-gray-500">
                Last updated: {debugInfo.timestamp}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

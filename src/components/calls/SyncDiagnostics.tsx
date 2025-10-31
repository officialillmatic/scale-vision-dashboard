
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Activity, Database, Network } from 'lucide-react';

export function SyncDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Check Supabase connection
      try {
        const { data, error } = await supabase.from('agents').select('count').limit(1);
        results.tests.push({
          name: 'Supabase Connection',
          status: error ? 'failed' : 'passed',
          message: error ? `Error: ${error.message}` : 'Successfully connected to Supabase',
          icon: 'database'
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Supabase Connection',
          status: 'failed',
          message: `Connection failed: ${error.message}`,
          icon: 'database'
        });
      }

      // Test 2: Check retell_calls table
      try {
        const { data, error } = await supabase.from('retell_calls').select('count').limit(1);
        results.tests.push({
          name: 'Retell Calls Table',
          status: error ? 'failed' : 'passed',
          message: error ? `Table error: ${error.message}` : 'Retell calls table is accessible',
          icon: 'database'
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Retell Calls Table',
          status: 'failed',
          message: `Table check failed: ${error.message}`,
          icon: 'database'
        });
      }

      // Test 3: Test sync-calls edge function connectivity
      try {
        const { data, error } = await supabase.functions.invoke('sync-calls', {
          body: { test: true },
          headers: { 'Content-Type': 'application/json' }
        });

        results.tests.push({
          name: 'Sync Function Test',
          status: error ? 'failed' : 'passed',
          message: error ? `Function error: ${error.message}` : `Test successful - found ${data?.callsFound || 0} calls`,
          icon: 'network',
          details: data
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Sync Function Test',
          status: 'failed',
          message: `Function test failed: ${error.message}`,
          icon: 'network'
        });
      }

      // Test 4: Check agents with retell_agent_id
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, retell_agent_id')
          .not('retell_agent_id', 'is', null);

        results.tests.push({
          name: 'Retell Agents Check',
          status: error ? 'failed' : 'passed',
          message: error ? `Agents query error: ${error.message}` : `Found ${data?.length || 0} agents with Retell integration`,
          icon: 'activity',
          details: { agentCount: data?.length || 0 }
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Retell Agents Check',
          status: 'failed',
          message: `Agents check failed: ${error.message}`,
          icon: 'activity'
        });
      }

    } catch (error: any) {
      results.tests.push({
        name: 'General Error',
        status: 'failed',
        message: `Diagnostics failed: ${error.message}`,
        icon: 'activity'
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const getIcon = (iconName: string, status: string) => {
    const iconClass = `h-4 w-4 ${status === 'passed' ? 'text-green-600' : 'text-red-600'}`;
    
    switch (iconName) {
      case 'database':
        return <Database className={iconClass} />;
      case 'network':
        return <Network className={iconClass} />;
      case 'activity':
        return <Activity className={iconClass} />;
      default:
        return status === 'passed' ? 
          <CheckCircle className={iconClass} /> : 
          <AlertCircle className={iconClass} />;
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sync Diagnostics</CardTitle>
          <Button 
            onClick={runDiagnostics}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!diagnostics && !isRunning && (
          <p className="text-gray-500 text-center py-4">
            Click "Run Diagnostics" to test the sync functionality
          </p>
        )}
        
        {isRunning && (
          <div className="text-center py-4">
            <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Running diagnostics...</p>
          </div>
        )}
        
        {diagnostics && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500 border-b pb-2">
              <span>Test Results</span>
              <span>{diagnostics.timestamp}</span>
            </div>
            
            {diagnostics.tests.map((test: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(test.icon, test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-gray-600">{test.message}</div>
                    {test.details && (
                      <div className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(test.details)}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={test.status === 'passed' ? 'default' : 'destructive'}>
                  {test.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

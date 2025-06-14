import { debugLog } from "@/lib/debug";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, Database, Cloud, Zap } from "lucide-react";

export function SyncTestPanel() {
  const [testing, setTesting] = useState<{
    database: boolean;
    api: boolean;
    edgeFunction: boolean;
  }>({
    database: false,
    api: false,
    edgeFunction: false,
  });

  const [results, setResults] = useState<{
    database: 'idle' | 'success' | 'error';
    api: 'idle' | 'success' | 'error';
    edgeFunction: 'idle' | 'success' | 'error';
  }>({
    database: 'idle',
    api: 'idle',
    edgeFunction: 'idle',
  });

  const [testData, setTestData] = useState<any>(null);

  // Test 1: Direct database insertion
  const testDatabaseInsertion = async () => {
    setTesting(prev => ({ ...prev, database: true }));
    setResults(prev => ({ ...prev, database: 'idle' }));

    try {
      const testCall = {
        call_id: `test_call_${Date.now()}`,
        user_id: null,
        company_id: null,
        agent_id: null,
        retell_agent_id: 'test_agent_123',
        start_timestamp: new Date().toISOString(),
        end_timestamp: null,
        duration_sec: 30,
        duration: 30,
        cost_usd: 0.05,
        revenue_amount: 0.51,
        revenue: 0.51,
        billing_duration_sec: 30,
        rate_per_minute: 1.02,
        call_status: 'completed',
        status: 'completed',
        from_number: '+1234567890',
        to_number: '+0987654321',
        disconnection_reason: null,
        recording_url: null,
        transcript: 'Test call transcript',
        transcript_url: null,
        sentiment: 'positive',
        sentiment_score: null,
        result_sentiment: null,
        disposition: null,
        latency_ms: null,
        call_summary: 'Test call for debugging',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      debugLog('[TEST_PANEL] Attempting database insertion with data:', testCall);

      const { data, error } = await supabase
        .from('retell_calls')
        .insert(testCall)
        .select();

      if (error) {
        console.error('[TEST_PANEL] Database insertion failed:', error);
        setResults(prev => ({ ...prev, database: 'error' }));
        toast.error(`Database test failed: ${error.message}`);
        setTestData({ error: error.message, details: error });
      } else {
        debugLog('[TEST_PANEL] Database insertion successful:', data);
        setResults(prev => ({ ...prev, database: 'success' }));
        toast.success('Database insertion test passed!');
        setTestData({ success: true, insertedRecord: data[0] });
      }
    } catch (error: any) {
      console.error('[TEST_PANEL] Database test exception:', error);
      setResults(prev => ({ ...prev, database: 'error' }));
      toast.error(`Database test failed: ${error.message}`);
      setTestData({ error: error.message });
    } finally {
      setTesting(prev => ({ ...prev, database: false }));
    }
  };

  // Test 2: Direct Retell API call from frontend
  const testRetellAPI = async () => {
    setTesting(prev => ({ ...prev, api: true }));
    setResults(prev => ({ ...prev, api: 'idle' }));

    try {
      debugLog('[TEST_PANEL] Testing direct Retell API call...');
      
      // Note: This will fail due to CORS, but we can see the network request
      const response = await fetch('https://api.retellai.com/v2/list-calls', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY_HERE', // This won't work from frontend
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        debugLog('[TEST_PANEL] Direct API call successful:', data);
        setResults(prev => ({ ...prev, api: 'success' }));
        toast.success('Direct API call successful!');
        setTestData({ apiResponse: data });
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (error: any) {
      debugLog('[TEST_PANEL] Direct API call failed (expected due to CORS):', error);
      setResults(prev => ({ ...prev, api: 'error' }));
      toast.info('Direct API call failed (CORS expected) - this confirms we need the edge function');
      setTestData({ error: 'CORS error - edge function required', details: error.message });
    } finally {
      setTesting(prev => ({ ...prev, api: false }));
    }
  };

  // Test 3: Edge function debug call
  const testEdgeFunction = async () => {
    setTesting(prev => ({ ...prev, edgeFunction: true }));
    setResults(prev => ({ ...prev, edgeFunction: 'idle' }));

    try {
      debugLog('[TEST_PANEL] Testing edge function with debug mode...');
      
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { 
          test: true,
          debug: true,
          bypass_validation: true 
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (error) {
        console.error('[TEST_PANEL] Edge function test failed:', error);
        setResults(prev => ({ ...prev, edgeFunction: 'error' }));
        toast.error(`Edge function test failed: ${error.message}`);
        setTestData({ error: error.message, details: error });
      } else {
        debugLog('[TEST_PANEL] Edge function test successful:', data);
        setResults(prev => ({ ...prev, edgeFunction: 'success' }));
        toast.success('Edge function test passed!');
        setTestData({ edgeFunctionResponse: data });
      }
    } catch (error: any) {
      console.error('[TEST_PANEL] Edge function test exception:', error);
      setResults(prev => ({ ...prev, edgeFunction: 'error' }));
      toast.error(`Edge function test failed: ${error.message}`);
      setTestData({ error: error.message });
    } finally {
      setTesting(prev => ({ ...prev, edgeFunction: false }));
    }
  };

  const getStatusIcon = (status: 'idle' | 'success' | 'error', isLoading: boolean) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getStatusBadge = (status: 'idle' | 'success' | 'error') => {
    if (status === 'success') return <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>;
    if (status === 'error') return <Badge variant="destructive">Fail</Badge>;
    return <Badge variant="secondary">Not Tested</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sync Debugging Panel
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test each component of the sync process individually to identify the root cause
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Database Test */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Database Insertion Test</h3>
                <p className="text-sm text-gray-600">Insert a test call directly into retell_calls table</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(results.database)}
              <Button
                onClick={testDatabaseInsertion}
                disabled={testing.database}
                size="sm"
                className="flex items-center gap-2"
              >
                {getStatusIcon(results.database, testing.database)}
                {testing.database ? 'Testing...' : 'Test DB'}
              </Button>
            </div>
          </div>

          {/* API Test */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="font-medium">Retell API Test</h3>
                <p className="text-sm text-gray-600">Test direct API connection (will show CORS error)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(results.api)}
              <Button
                onClick={testRetellAPI}
                disabled={testing.api}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {getStatusIcon(results.api, testing.api)}
                {testing.api ? 'Testing...' : 'Test API'}
              </Button>
            </div>
          </div>

          {/* Edge Function Test */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium">Edge Function Test</h3>
                <p className="text-sm text-gray-600">Test the sync-calls edge function with debug mode</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(results.edgeFunction)}
              <Button
                onClick={testEdgeFunction}
                disabled={testing.edgeFunction}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {getStatusIcon(results.edgeFunction, testing.edgeFunction)}
                {testing.edgeFunction ? 'Testing...' : 'Test Function'}
              </Button>
            </div>
          </div>

          {/* Run All Tests */}
          <Separator />
          <div className="flex justify-center">
            <Button
              onClick={async () => {
                await testDatabaseInsertion();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await testRetellAPI();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await testEdgeFunction();
              }}
              disabled={Object.values(testing).some(t => t)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Run All Tests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testData && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

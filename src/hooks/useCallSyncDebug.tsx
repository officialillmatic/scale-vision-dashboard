
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DebugResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface LoadingStates {
  directApi: boolean;
  database: boolean;
  edgeFunction: boolean;
  apiConnectivity: boolean;
}

export const useCallSyncDebug = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    directApi: false,
    database: false,
    edgeFunction: false,
    apiConnectivity: false
  });

  const [debugResults, setDebugResults] = useState<{
    apiTest?: DebugResult;
    dbTest?: DebugResult;
    directApiTest?: DebugResult;
    edgeFunctionTest?: DebugResult;
  }>({});

  const isAnyTestRunning = Object.values(loadingStates).some(state => state);

  const setLoading = (testType: keyof LoadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [testType]: isLoading
    }));
  };

  const logResult = (testType: string, result: DebugResult) => {
    setDebugResults(prev => ({
      ...prev,
      [testType]: result
    }));
  };

  // Test 1: Direct Retell API call from frontend
  const testDirectRetellAPI = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isAnyTestRunning) {
      toast.warning("Another test is already running. Please wait.");
      return;
    }

    console.log("[DEBUG] Testing direct Retell API call from frontend...");
    setLoading('directApi', true);
    
    try {
      const response = await fetch('https://api.retellai.com/v2/list-calls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_RETELL_API_KEY || 'key_not_found'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 5 })
      });

      console.log("[DEBUG] Direct API Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DEBUG] Direct API Error:", errorText);
        
        const result = {
          success: false,
          error: `API Error ${response.status}: ${errorText}`,
          timestamp: new Date().toISOString()
        };
        
        logResult('directApiTest', result);
        toast.error(`Direct API test failed: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log("[DEBUG] Direct API Raw Response:", JSON.stringify(data, null, 2));
      
      const result = {
        success: true,
        data: {
          callsFound: data.calls?.length || 0,
          hasMore: data.has_more,
          firstCall: data.calls?.[0] || null
        },
        timestamp: new Date().toISOString()
      };
      
      logResult('directApiTest', result);
      toast.success(`Direct API test successful! Found ${data.calls?.length || 0} calls`);

    } catch (error) {
      console.error("[DEBUG] Direct API Error:", error);
      
      const result = {
        success: false,
        error: `Network Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      logResult('directApiTest', result);
      toast.error(`Direct API test failed: ${error.message}`);
    } finally {
      setLoading('directApi', false);
    }
  };

  // Test 2: Force insert a test call record
  const testDatabaseInsertion = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isAnyTestRunning) {
      toast.warning("Another test is already running. Please wait.");
      return;
    }

    console.log("[DEBUG] Testing database insertion...");
    setLoading('database', true);
    
    try {
      const testCall = {
        call_id: `debug_test_${Date.now()}`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        company_id: await getCompanyId(),
        start_timestamp: new Date().toISOString(),
        duration_sec: 120,
        cost_usd: 2.50,
        revenue_amount: 3.40,
        call_status: 'completed',
        status: 'completed',
        from_number: '+1234567890',
        to_number: '+0987654321',
        retell_agent_id: 'test_agent_123',
        rate_per_minute: 0.17,
        billing_duration_sec: 120,
        duration: 120,
        revenue: 3.40
      };

      console.log("[DEBUG] Test call data:", JSON.stringify(testCall, null, 2));

      const { data, error } = await supabase
        .from('retell_calls')
        .insert(testCall)
        .select();

      if (error) {
        console.error("[DEBUG] Database insertion error:", error);
        
        const result = {
          success: false,
          error: `Database Error: ${error.message} (Code: ${error.code})`,
          data: { testCall, errorDetails: error },
          timestamp: new Date().toISOString()
        };
        
        logResult('dbTest', result);
        toast.error(`Database test failed: ${error.message}`);
        return;
      }

      console.log("[DEBUG] Database insertion successful:", data);
      
      const result = {
        success: true,
        data: { insertedCall: data[0], testCall },
        timestamp: new Date().toISOString()
      };
      
      logResult('dbTest', result);
      toast.success("Database insertion test successful!");

    } catch (error) {
      console.error("[DEBUG] Database test error:", error);
      
      const result = {
        success: false,
        error: `Test Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      logResult('dbTest', result);
      toast.error(`Database test failed: ${error.message}`);
    } finally {
      setLoading('database', false);
    }
  };

  // Test 3: Edge function with detailed logging
  const testEdgeFunction = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isAnyTestRunning) {
      toast.warning("Another test is already running. Please wait.");
      return;
    }

    console.log("[DEBUG] Testing edge function with bypass validation...");
    setLoading('edgeFunction', true);
    
    try {
      console.log("[DEBUG] Calling supabase.functions.invoke('sync-calls')...");
      
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { 
          bypass_validation: true,
          debug_mode: true
        },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("[DEBUG] Edge function response:", { data, error });

      if (error) {
        console.error("[DEBUG] Edge function error:", error);
        
        const result = {
          success: false,
          error: `Edge Function Error: ${error.message}`,
          data: { errorDetails: error },
          timestamp: new Date().toISOString()
        };
        
        logResult('edgeFunctionTest', result);
        toast.error(`Edge function test failed: ${error.message}`);
        return;
      }

      console.log("[DEBUG] Edge function success:", data);
      
      const result = {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      logResult('edgeFunctionTest', result);
      toast.success("Edge function test completed successfully!");

    } catch (error) {
      console.error("[DEBUG] Edge function test error:", error);
      
      const result = {
        success: false,
        error: `Test Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      logResult('edgeFunctionTest', result);
      toast.error(`Edge function test failed: ${error.message}`);
    } finally {
      setLoading('edgeFunction', false);
    }
  };

  // Test 4: API connectivity test through edge function
  const testAPIConnectivity = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isAnyTestRunning) {
      toast.warning("Another test is already running. Please wait.");
      return;
    }

    console.log("[DEBUG] Testing API connectivity through edge function...");
    setLoading('apiConnectivity', true);
    
    try {
      console.log("[DEBUG] Calling edge function with test=true...");
      
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("[DEBUG] API connectivity response:", { data, error });

      if (error) {
        console.error("[DEBUG] API connectivity error:", error);
        
        const result = {
          success: false,
          error: `API Test Error: ${error.message}`,
          data: { errorDetails: error },
          timestamp: new Date().toISOString()
        };
        
        logResult('apiTest', result);
        toast.error(`API connectivity test failed: ${error.message}`);
        return;
      }

      console.log("[DEBUG] API connectivity success:", data);
      
      const result = {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      logResult('apiTest', result);
      toast.success("API connectivity test successful!");

    } catch (error) {
      console.error("[DEBUG] API connectivity test error:", error);
      
      const result = {
        success: false,
        error: `Test Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      logResult('apiTest', result);
      toast.error(`API connectivity test failed: ${error.message}`);
    } finally {
      setLoading('apiConnectivity', false);
    }
  };

  const getCompanyId = async () => {
    const { data } = await supabase.rpc('get_user_company_id_simple');
    return data;
  };

  const clearResults = () => {
    setDebugResults({});
    toast.info("Debug results cleared");
  };

  return {
    loadingStates,
    isAnyTestRunning,
    debugResults,
    testDirectRetellAPI,
    testDatabaseInsertion,
    testEdgeFunction,
    testAPIConnectivity,
    clearResults
  };
};

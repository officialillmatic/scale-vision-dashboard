import { debugLog } from "@/lib/debug";

import { toast } from 'sonner';

export interface ApiTestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  apiKeyFormat?: string;
  response?: any;
  endpoint?: string;
}

export interface EndpointTestResult {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
  response?: any;
}

export class RetellApiDebugger {
  private readonly possibleBaseUrls = [
    'https://api.retellai.com',
    'https://api.retellai.com/v1',
    'https://api.retellai.com/v2'
  ];
  
  private readonly possibleEndpoints = [
    '/agent',
    '/agents', 
    '/v1/agents',
    '/list-agents',
    '/agent/list'
  ];
  
  private readonly apiKey: string;

  constructor() {
    this.apiKey = import.meta.env?.VITE_RETELL_API_KEY || '';
  }

  /**
   * Verify API key format and environment setup
   */
  verifyEnvironment(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    debugLog('[RETELL_API_DEBUG] Checking environment variables...');
    debugLog('[RETELL_API_DEBUG] VITE_RETELL_API_KEY exists:', !!this.apiKey);
    debugLog('[RETELL_API_DEBUG] API key length:', this.apiKey?.length || 0);
    
    if (!this.apiKey) {
      issues.push('VITE_RETELL_API_KEY environment variable is not set');
    } else {
      // Check API key format
      const keyPrefix = this.apiKey.substring(0, 4);
      debugLog('[RETELL_API_DEBUG] API key prefix:', keyPrefix);
      
      if (!this.apiKey.startsWith('key_') && !this.apiKey.startsWith('re_')) {
        issues.push(`API key format appears invalid. Expected to start with 'key_' or 're_', but starts with '${keyPrefix}'`);
      }
      
      if (this.apiKey.length < 20) {
        issues.push('API key appears too short (expected at least 20 characters)');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Test a specific endpoint
   */
  async testSpecificEndpoint(baseUrl: string, endpoint: string): Promise<EndpointTestResult> {
    const fullUrl = `${baseUrl}${endpoint}`;
    debugLog(`[RETELL_API_DEBUG] Testing endpoint: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      debugLog(`[RETELL_API_DEBUG] ${fullUrl} - Status: ${response.status}`);

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { raw_response: responseText };
      }

      return {
        endpoint: fullUrl,
        success: response.ok,
        status: response.status,
        error: response.ok ? undefined : responseText,
        response: responseData
      };

    } catch (error: any) {
      console.error(`[RETELL_API_DEBUG] ${fullUrl} - Network error:`, error);
      return {
        endpoint: fullUrl,
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Test all possible endpoint combinations
   */
  async testAllEndpoints(): Promise<ApiTestResult> {
    debugLog('[RETELL_API_DEBUG] Testing all possible endpoint combinations...');
    
    const envCheck = this.verifyEnvironment();
    if (!envCheck.isValid) {
      console.error('[RETELL_API_DEBUG] Environment check failed:', envCheck.issues);
      return {
        success: false,
        error: `Environment issues: ${envCheck.issues.join(', ')}`
      };
    }

    const testResults: EndpointTestResult[] = [];
    let workingEndpoint: EndpointTestResult | null = null;

    // Test all combinations of base URLs and endpoints
    for (const baseUrl of this.possibleBaseUrls) {
      for (const endpoint of this.possibleEndpoints) {
        const result = await this.testSpecificEndpoint(baseUrl, endpoint);
        testResults.push(result);
        
        if (result.success && !workingEndpoint) {
          workingEndpoint = result;
          debugLog(`[RETELL_API_DEBUG] ✅ Found working endpoint: ${result.endpoint}`);
        }
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Log all test results
    debugLog('[RETELL_API_DEBUG] All endpoint test results:');
    testResults.forEach(result => {
      debugLog(`[RETELL_API_DEBUG] ${result.endpoint}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${result.status || 'no response'})`);
      if (result.error) {
        debugLog(`[RETELL_API_DEBUG] Error: ${result.error}`);
      }
    });

    if (workingEndpoint) {
      return {
        success: true,
        status: workingEndpoint.status,
        statusText: 'OK',
        response: workingEndpoint.response,
        endpoint: workingEndpoint.endpoint,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };
    } else {
      // Find the most promising failed result (e.g., 401 vs 404)
      const authErrors = testResults.filter(r => r.status === 401);
      const notFoundErrors = testResults.filter(r => r.status === 404);
      
      let bestError = testResults[0];
      if (authErrors.length > 0) {
        bestError = authErrors[0]; // 401 means endpoint exists but auth failed
      } else if (notFoundErrors.length > 0) {
        bestError = notFoundErrors[0]; // 404 means endpoint doesn't exist
      }

      return {
        success: false,
        status: bestError.status,
        error: `No working endpoint found. Tested ${testResults.length} combinations. Best result: ${bestError.endpoint} returned ${bestError.status} - ${bestError.error}`,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };
    }
  }

  /**
   * Test agents endpoint (legacy method for backward compatibility)
   */
  async testAgentsEndpoint(): Promise<ApiTestResult> {
    debugLog('[RETELL_API_DEBUG] Running comprehensive endpoint discovery...');
    return await this.testAllEndpoints();
  }

  /**
   * Test API connection using comprehensive endpoint discovery
   */
  async testApiConnection(): Promise<ApiTestResult> {
    debugLog('[RETELL_API_DEBUG] Testing API connection with endpoint discovery...');
    return await this.testAllEndpoints();
  }

  /**
   * Test API connection and display results
   */
  async testAndDisplayResults(): Promise<ApiTestResult> {
    debugLog('[RETELL_API_DEBUG] Starting comprehensive API endpoint discovery...');
    
    const result = await this.testApiConnection();
    
    if (result.success) {
      toast.success(`✅ Found working API endpoint! ${result.endpoint} - Status: ${result.status}`);
      debugLog('[RETELL_API_DEBUG] ✅ API endpoint discovery succeeded');
      
      // Log response details
      if (result.response) {
        const agentCount = Array.isArray(result.response) ? result.response.length : 
                          result.response?.agents?.length || 
                          result.response?.data?.length || 0;
        
        if (agentCount > 0) {
          toast.success(`Found ${agentCount} agents via ${result.endpoint}`);
        }
      }
    } else {
      toast.error(`❌ No working API endpoint found: ${result.error}`);
      console.error('[RETELL_API_DEBUG] ❌ API endpoint discovery failed:', result);
      
      // Provide specific guidance based on error type
      if (result.status === 401) {
        toast.error('API key is invalid or expired. Please check your VITE_RETELL_API_KEY.');
      } else if (result.status === 403) {
        toast.error('API key does not have sufficient permissions.');
      } else if (result.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (result.status === 404) {
        toast.error('All tested endpoints returned 404. The API structure may have changed.');
      } else if (!result.status) {
        toast.error('Network error. Check your internet connection.');
      }
    }
    
    return result;
  }

  /**
   * Test agents endpoint and display results with detailed info
   */
  async testAgentsAndDisplayResults(): Promise<ApiTestResult> {
    debugLog('[RETELL_API_DEBUG] Starting comprehensive agents endpoint discovery...');
    
    const result = await this.testAllEndpoints();
    
    if (result.success) {
      const agentCount = Array.isArray(result.response) ? result.response.length : 
                        result.response?.agents?.length || 
                        result.response?.data?.length || 0;
      
      toast.success(`✅ Agents API discovery successful! Found working endpoint: ${result.endpoint}`);
      
      if (agentCount > 0) {
        toast.success(`Found ${agentCount} agents.`);
      }
      
      debugLog('[RETELL_API_DEBUG] ✅ Agents API endpoint discovery passed');
      debugLog('[RETELL_API_DEBUG] Working endpoint:', result.endpoint);
      debugLog('[RETELL_API_DEBUG] Full response:', JSON.stringify(result.response, null, 2));
    } else {
      toast.error(`❌ Agents API endpoint discovery failed: ${result.error}`);
      console.error('[RETELL_API_DEBUG] ❌ Agents API endpoint discovery failed:', result);
      
      // Provide specific guidance based on error type
      if (result.status === 401) {
        toast.error('API key is invalid or expired. Please check your VITE_RETELL_API_KEY.');
      } else if (result.status === 403) {
        toast.error('API key does not have sufficient permissions.');
      } else if (result.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (result.status === 404) {
        toast.error('All agent endpoints returned 404. Check Retell AI documentation for current API structure.');
      } else if (!result.status) {
        toast.error('Network error. Check your internet connection.');
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const retellApiDebugger = new RetellApiDebugger();

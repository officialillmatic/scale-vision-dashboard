import { toast } from 'sonner';

export interface ApiTestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  apiKeyFormat?: string;
  response?: any;
}

export class RetellApiDebugger {
  private readonly baseUrl = 'https://api.retellai.com';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = import.meta.env?.VITE_RETELL_API_KEY || '';
  }

  /**
   * Verify API key format and environment setup
   */
  verifyEnvironment(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    console.log('[RETELL_API_DEBUG] Checking environment variables...');
    console.log('[RETELL_API_DEBUG] VITE_RETELL_API_KEY exists:', !!this.apiKey);
    console.log('[RETELL_API_DEBUG] API key length:', this.apiKey?.length || 0);
    
    if (!this.apiKey) {
      issues.push('VITE_RETELL_API_KEY environment variable is not set');
    } else {
      // Check API key format
      const keyPrefix = this.apiKey.substring(0, 4);
      console.log('[RETELL_API_DEBUG] API key prefix:', keyPrefix);
      
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
   * Test direct API call to /agents endpoint
   */
  async testAgentsEndpoint(): Promise<ApiTestResult> {
    console.log('[RETELL_API_DEBUG] Testing /agents endpoint...');
    
    const envCheck = this.verifyEnvironment();
    if (!envCheck.isValid) {
      console.error('[RETELL_API_DEBUG] Environment check failed:', envCheck.issues);
      return {
        success: false,
        error: `Environment issues: ${envCheck.issues.join(', ')}`
      };
    }

    try {
      const endpoint = `${this.baseUrl}/agents`;
      console.log('[RETELL_API_DEBUG] Making request to:', endpoint);
      console.log('[RETELL_API_DEBUG] Using API key prefix:', this.apiKey.substring(0, 8) + '...');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[RETELL_API_DEBUG] Response status:', response.status);
      console.log('[RETELL_API_DEBUG] Response status text:', response.statusText);
      console.log('[RETELL_API_DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('[RETELL_API_DEBUG] Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[RETELL_API_DEBUG] Failed to parse JSON response:', parseError);
        responseData = { raw_response: responseText };
      }

      if (!response.ok) {
        console.error('[RETELL_API_DEBUG] API error response:', responseData);
        
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: responseText || 'Unknown API error',
          apiKeyFormat: this.apiKey.substring(0, 8) + '...',
          response: responseData
        };
      }

      console.log('[RETELL_API_DEBUG] API success response:', responseData);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };

    } catch (error: any) {
      console.error('[RETELL_API_DEBUG] Network/fetch error:', error);
      
      return {
        success: false,
        error: `Network error: ${error.message}`,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };
    }
  }

  /**
   * Test API connection and display results
   */
  async testApiConnection(): Promise<ApiTestResult> {
    console.log('[RETELL_API_DEBUG] Testing API connection...');
    
    const envCheck = this.verifyEnvironment();
    if (!envCheck.isValid) {
      console.error('[RETELL_API_DEBUG] Environment check failed:', envCheck.issues);
      return {
        success: false,
        error: `Environment issues: ${envCheck.issues.join(', ')}`
      };
    }

    try {
      console.log('[RETELL_API_DEBUG] Making test request to:', `${this.baseUrl}/list-agents`);
      console.log('[RETELL_API_DEBUG] Using API key prefix:', this.apiKey.substring(0, 8) + '...');

      const response = await fetch(`${this.baseUrl}/list-agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 1 })
      });

      console.log('[RETELL_API_DEBUG] Response status:', response.status);
      console.log('[RETELL_API_DEBUG] Response status text:', response.statusText);
      console.log('[RETELL_API_DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RETELL_API_DEBUG] API error response:', errorText);
        
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: errorText || 'Unknown API error',
          apiKeyFormat: this.apiKey.substring(0, 8) + '...'
        };
      }

      const data = await response.json();
      console.log('[RETELL_API_DEBUG] API success response:', data);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        response: data,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };

    } catch (error: any) {
      console.error('[RETELL_API_DEBUG] Network/fetch error:', error);
      
      return {
        success: false,
        error: `Network error: ${error.message}`,
        apiKeyFormat: this.apiKey.substring(0, 8) + '...'
      };
    }
  }

  /**
   * Test API connection and display results
   */
  async testAndDisplayResults(): Promise<ApiTestResult> {
    console.log('[RETELL_API_DEBUG] Starting comprehensive API test...');
    
    const result = await this.testApiConnection();
    
    if (result.success) {
      toast.success(`API connection successful! Status: ${result.status}`);
      console.log('[RETELL_API_DEBUG] ✅ API test passed');
    } else {
      toast.error(`API connection failed: ${result.error}`);
      console.error('[RETELL_API_DEBUG] ❌ API test failed:', result);
      
      // Provide specific guidance based on error type
      if (result.status === 401) {
        toast.error('API key is invalid or expired. Please check your VITE_RETELL_API_KEY.');
      } else if (result.status === 403) {
        toast.error('API key does not have sufficient permissions.');
      } else if (result.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
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
    console.log('[RETELL_API_DEBUG] Starting agents endpoint test...');
    
    const result = await this.testAgentsEndpoint();
    
    if (result.success) {
      const agentCount = Array.isArray(result.response) ? result.response.length : 
                        result.response?.agents?.length || 0;
      toast.success(`✅ Agents API test successful! Found ${agentCount} agents.`);
      console.log('[RETELL_API_DEBUG] ✅ Agents API test passed');
      console.log('[RETELL_API_DEBUG] Full response:', JSON.stringify(result.response, null, 2));
    } else {
      toast.error(`❌ Agents API test failed: ${result.error}`);
      console.error('[RETELL_API_DEBUG] ❌ Agents API test failed:', result);
      
      // Provide specific guidance based on error type
      if (result.status === 401) {
        toast.error('API key is invalid or expired. Please check your VITE_RETELL_API_KEY.');
      } else if (result.status === 403) {
        toast.error('API key does not have sufficient permissions.');
      } else if (result.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (!result.status) {
        toast.error('Network error. Check your internet connection.');
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const retellApiDebugger = new RetellApiDebugger();

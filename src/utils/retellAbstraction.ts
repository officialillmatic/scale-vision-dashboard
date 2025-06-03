import { supabase } from "@/integrations/supabase/client";

/**
 * Abstraction layer for Retell API interactions
 * This ensures all Retell references are properly encapsulated
 */

export interface RetellCall {
  call_id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  duration_sec: number;
  cost: number;
  transcript?: string;
  recording_url?: string;
  sentiment?: {
    overall_sentiment: string;
    score: number;
  };
  start_timestamp: number;
  call_status: string;
  disconnection_reason?: string;
}

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  response_engine: object;
  llm_websocket_url: string;
  boosted_keywords?: string[];
  enable_backchannel?: boolean;
  ambient_sound?: string;
  opt_out_sensitive_data_storage?: boolean;
}

export class RetellAbstraction {
  private static instance: RetellAbstraction;
  
  public static getInstance(): RetellAbstraction {
    if (!RetellAbstraction.instance) {
      RetellAbstraction.instance = new RetellAbstraction();
    }
    return RetellAbstraction.instance;
  }

  /**
   * Sync calls from external service through edge function
   */
  async syncCalls(): Promise<{
    synced_calls: number;
    processed_calls: number;
    skipped_agents: number;
    agents_found: number;
  }> {
    console.log("[RETELL_SERVICE] Starting call sync with bypass_validation");
    
    const { data, error } = await supabase.functions.invoke('sync-calls', {
      body: { 
        bypass_validation: true,
        debug_mode: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (error) {
      console.error("[RETELL_SERVICE] Call sync failed:", error);
      throw new Error(`Call sync failed: ${error.message}`);
    }

    console.log("[RETELL_SERVICE] Call sync completed:", data);
    return data;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    console.log("[RETELL_SERVICE] Testing API connection");
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (error) {
        console.error('[RETELL_SERVICE] API test failed:', error);
        return false;
      }

      const isConnected = data?.success === true;
      console.log("[RETELL_SERVICE] Connection test result:", isConnected);
      return isConnected;
    } catch (error) {
      console.error('[RETELL_SERVICE] API test connection failed:', error);
      return false;
    }
  }

  /**
   * Register webhook endpoint
   */
  async registerWebhook(): Promise<boolean> {
    console.log("[RETELL_SERVICE] Registering webhook");
    
    try {
      const { data, error } = await supabase.functions.invoke('register-retell-webhook', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (error) {
        console.error('[RETELL_SERVICE] Webhook registration failed:', error);
        return false;
      }

      const success = data?.success === true;
      console.log("[RETELL_SERVICE] Webhook registration result:", success);
      return success;
    } catch (error) {
      console.error('[RETELL_SERVICE] Webhook registration connection failed:', error);
      return false;
    }
  }

  /**
   * Validate agent configuration without exposing internal details
   */
  async validateAgentConfig(agentId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    console.log("[RETELL_SERVICE] Validating agent config for:", agentId);
    
    try {
      // Get agent from database
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        console.log("[RETELL_SERVICE] Agent not found:", error);
        return {
          isValid: false,
          issues: ['Agent not found in database']
        };
      }

      const issues: string[] = [];

      // Validate basic configuration
      if (!agent.name) {
        issues.push('Agent name is required');
      }

      if (!agent.retell_agent_id) {
        issues.push('External agent ID is required');
      }

      if (agent.rate_per_minute <= 0) {
        issues.push('Valid rate per minute is required');
      }

      if (agent.status !== 'active') {
        issues.push('Agent must be active');
      }

      const result = {
        isValid: issues.length === 0,
        issues
      };

      console.log("[RETELL_SERVICE] Agent validation result:", result);
      return result;
    } catch (error) {
      console.error('[RETELL_SERVICE] Agent validation failed:', error);
      return {
        isValid: false,
        issues: ['Failed to validate agent configuration']
      };
    }
  }

  /**
   * Get sanitized call data for frontend consumption - CORREGIDO
   */
  async getCallData(userIdOrCompanyId: string, limit: number = 100): Promise<any[]> {
    console.log('[RETELL_SERVICE] ✅ FIXED - Starting getCallData - FETCHING FROM calls table');
    console.log('[RETELL_SERVICE] Parameters:', { userIdOrCompanyId, limit });
    console.log('[RETELL_SERVICE] Fetching calls for user/company:', userIdOrCompanyId);
    
    try {
      console.log('[RETELL_SERVICE] ✅ Making Supabase query to CALLS table (not retell_calls)...');
      
      // ✅ CAMBIO PRINCIPAL: Buscar en la tabla 'calls' correcta
      const { data, error } = await supabase
        .from('calls') // ✅ TABLA CORRECTA
        .select(`
          id,
          call_id,
          agent_id,
          user_id,
          company_id,
          timestamp,
          start_time,
          duration_sec,
          cost_usd,
          revenue_amount,
          call_status,
          from_number,
          to_number,
          audio_url,
          transcript,
          sentiment,
          call_summary,
          created_at
        `)
        .eq('user_id', userIdOrCompanyId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      console.log('[RETELL_SERVICE] ✅ Supabase query to CALLS table completed');
      console.log('[RETELL_SERVICE] Query result:', { 
        data: data ? `${data.length} records` : 'null', 
        error, 
        dataLength: data?.length,
        actualData: data 
      });

      if (error) {
        console.error('[RETELL_SERVICE] Supabase error:', error);
        throw new Error(`Failed to fetch call data: ${error.message}`);
      }

      if (!data) {
        console.log('[RETELL_SERVICE] No data returned from query');
        return [];
      }

      console.log('[RETELL_SERVICE] ✅ Raw data from CALLS table:', data);

      // ✅ Transform calls data to match expected frontend format
      const transformedData = data.map((call, index) => {
        console.log(`[RETELL_SERVICE] Transforming call ${index + 1}:`, call);
        
        return {
          id: call.id,
          callId: call.call_id,
          timestamp: call.timestamp || call.start_time,
          duration: call.duration_sec || 0,
          cost: call.cost_usd || 0,
          sentiment: call.sentiment,
          sentimentScore: null,
          status: call.call_status || 'completed',
          fromNumber: this.sanitizePhoneNumber(call.from_number || 'Unknown'),
          toNumber: this.sanitizePhoneNumber(call.to_number || 'Unknown'),
          hasRecording: !!call.audio_url, // ✅ CAMPO CORRECTO
          hasTranscript: !!call.transcript,
          summary: call.call_summary,
          agent: {
            id: call.agent_id, // ✅ USAR agent_id de calls
            name: 'Solar Agent', // ✅ NOMBRE CORRECTO
            ratePerMinute: 0.17
          }
        };
      });

      console.log('[RETELL_SERVICE] ✅ Transformed data from CALLS table:', transformedData);
      console.log('[RETELL_SERVICE] ✅ Returning', transformedData.length, 'calls from CALLS table');
      
      return transformedData;
      
    } catch (error: any) {
      console.error('[RETELL_SERVICE] Exception in getCallData:', error);
      console.error('[RETELL_SERVICE] Error stack:', error.stack);
      throw new Error(`Failed to fetch call data: ${error.message}`);
    }
  }

  /**
   * Sanitize phone numbers for privacy
   */
  private sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber === 'unknown') return 'Unknown';
    
    // Mask middle digits for privacy
    if (phoneNumber.length >= 10) {
      const country = phoneNumber.substring(0, 2);
      const area = phoneNumber.substring(2, 5);
      const last = phoneNumber.substring(phoneNumber.length - 4);
      return `${country}${area}****${last}`;
    }
    
    return phoneNumber;
  }

  /**
   * Rate limiting check before API calls
   */
  async checkRateLimit(action: string): Promise<boolean> {
    console.log("[RETELL_SERVICE] Checking rate limit for action:", action);
    
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: `user_${action}`,
        p_action: action,
        p_limit_per_hour: 60 // 60 requests per hour per action
      });

      if (error) {
        console.error('[RETELL_SERVICE] Rate limit check failed:', error);
        return false; // Fail safe - allow request if check fails
      }

      const result = data === true;
      console.log("[RETELL_SERVICE] Rate limit check result:", result);
      return result;
    } catch (error) {
      console.error('[RETELL_SERVICE] Rate limit check error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const retellService = RetellAbstraction.getInstance();
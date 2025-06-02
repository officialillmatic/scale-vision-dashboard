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
    const { data, error } = await supabase.functions.invoke('sync-calls', {
      body: {},
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (error) {
      throw new Error(`Call sync failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (error) {
        console.error('API test failed:', error);
        return false;
      }

      return data?.success === true;
    } catch (error) {
      console.error('API test connection failed:', error);
      return false;
    }
  }

  /**
   * Register webhook endpoint
   */
  async registerWebhook(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('register-retell-webhook', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (error) {
        console.error('Webhook registration failed:', error);
        return false;
      }

      return data?.success === true;
    } catch (error) {
      console.error('Webhook registration connection failed:', error);
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
    try {
      // Get agent from database
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
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

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Agent validation failed:', error);
      return {
        isValid: false,
        issues: ['Failed to validate agent configuration']
      };
    }
  }

  /**
   * Get sanitized call data for frontend consumption
   */
  async getCallData(userIdOrCompanyId: string, limit: number = 100): Promise<any[]> {
    console.log('[RETELL_SERVICE] Fetching calls for user/company:', userIdOrCompanyId);
    
    const { data, error } = await supabase
      .from('retell_calls')
      .select(`
        id,
        call_id,
        retell_agent_id,
        user_id,
        company_id,
        created_at,
        updated_at
      `)
      .eq('user_id', userIdOrCompanyId) // CAMBIO: usar user_id en lugar de company_id
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log('[RETELL_SERVICE] Query result:', { data, error, dataLength: data?.length });

    if (error) {
      console.error('[RETELL_SERVICE] Error:', error);
      throw new Error(`Failed to fetch call data: ${error.message}`);
    }

    // Transform retell_calls data to match expected frontend format
    return data?.map(call => ({
      id: call.id,
      callId: call.call_id,
      timestamp: call.created_at,
      duration: 0, // No está disponible en retell_calls
      cost: 0, // No está disponible en retell_calls
      sentiment: null,
      sentimentScore: null,
      status: 'completed', // Valor por defecto
      fromNumber: 'Unknown', // No está disponible en retell_calls
      toNumber: 'Unknown', // No está disponible en retell_calls  
      hasRecording: false,
      hasTranscript: false,
      summary: null,
      agent: {
        id: call.retell_agent_id,
        name: 'Unknown Agent',
        ratePerMinute: 0
      }
    })) || [];
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
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: `user_${action}`,
        p_action: action,
        p_limit_per_hour: 60 // 60 requests per hour per action
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false; // Fail safe - allow request if check fails
      }

      return data === true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const retellService = RetellAbstraction.getInstance();
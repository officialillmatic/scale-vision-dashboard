
import { supabase } from './supabase';

// Interfaces for Retell AI data structures
export interface RetellCall {
  call_id: string;
  agent_id: string;
  start_timestamp: number;
  end_timestamp?: number;
  duration_sec: number;
  cost: number;
  call_status: string;
  from_number?: string;
  to_number?: string;
  disconnection_reason?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment?: {
    overall_sentiment?: string;
    score?: number;
  };
  disposition?: string;
  latency_ms?: number;
  summary?: string;
}

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id?: string;
  voice_model?: string;
  language?: string;
  response_engine?: string;
  llm_websocket_url?: string;
  prompt?: string;
  boosted_keywords?: string[];
  ambient_sound?: string;
  ambient_sound_volume?: number;
  backchannel_frequency?: number;
  backchannel_words?: string[];
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  interruption_sensitivity?: number;
  enable_transcription_formatting?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  pronunciation_dictionary?: any;
  normalize_for_speech?: boolean;
  responsiveness?: number;
}

export interface DashboardMetrics {
  totalCalls: number;
  totalMinutes: number;
  averageDuration: number;
  successRate: number;
  totalCost: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  costToday: number;
  costThisWeek: number;
  costThisMonth: number;
}

export interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  total_duration: number;
  total_cost: number;
  success_rate: number;
  average_duration: number;
}

export interface TimeBasedCallData {
  date: string;
  calls: number;
  duration: number;
  cost: number;
}

export class RetellService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.retellai.com/v2';

  constructor() {
    this.apiKey = import.meta.env.VITE_RETELL_API_KEY;
    if (!this.apiKey) {
      console.warn('[RETELL_SERVICE] No API key provided');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Retell API key is required');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user agent assignments from Supabase
   */
  async getUserAgent(userId: string): Promise<any> {
    console.log('[RETELL_SERVICE] Getting user agent for user:', userId);
    
    const { data, error } = await supabase
      .from('user_agents')
      .select(`
        *,
        retell_agents (*)
      `)
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (error) {
      console.error('[RETELL_SERVICE] Error fetching user agent:', error);
      throw new Error(`Failed to fetch user agent: ${error.message}`);
    }

    return data;
  }

  /**
   * Get agent details from Retell API
   */
  async getAgent(agentId: string): Promise<RetellAgent> {
    console.log('[RETELL_SERVICE] Fetching agent:', agentId);
    
    const response = await this.makeRequest<{ agent: RetellAgent }>(`/get-agent`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });

    return response.agent;
  }

  /**
   * Get calls for a specific agent from Retell API
   */
  async getAgentCalls(agentId: string, limit: number = 100): Promise<RetellCall[]> {
    console.log('[RETELL_SERVICE] Fetching calls for agent:', agentId);
    
    const response = await this.makeRequest<{ calls: RetellCall[] }>(`/list-calls`, {
      method: 'POST',
      body: JSON.stringify({ 
        agent_id: agentId,
        limit 
      }),
    });

    return response.calls || [];
  }

  /**
   * Get detailed call information from Retell API
   */
  async getCallDetails(callId: string): Promise<RetellCall> {
    console.log('[RETELL_SERVICE] Fetching call details:', callId);
    
    const response = await this.makeRequest<{ call: RetellCall }>(`/get-call`, {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    });

    return response.call;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string, days: number = 30): Promise<AgentMetrics> {
    console.log('[RETELL_SERVICE] Calculating agent metrics for:', agentId);
    
    const calls = await this.getAgentCalls(agentId);
    const recentCalls = this.filterCallsByDays(calls, days);
    
    const totalCalls = recentCalls.length;
    const totalDuration = recentCalls.reduce((sum, call) => sum + call.duration_sec, 0);
    const totalCost = recentCalls.reduce((sum, call) => sum + call.cost, 0);
    const successfulCalls = recentCalls.filter(call => 
      call.call_status === 'completed' || call.call_status === 'ended'
    ).length;

    // Get agent details for name
    const agent = await this.getAgent(agentId);

    return {
      agent_id: agentId,
      agent_name: agent.agent_name,
      total_calls: totalCalls,
      total_duration: totalDuration,
      total_cost: totalCost,
      success_rate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      average_duration: totalCalls > 0 ? totalDuration / totalCalls : 0,
    };
  }

  /**
   * Get time-based call data for charts
   */
  async getCallsTimeData(agentId: string, days: number = 30): Promise<TimeBasedCallData[]> {
    console.log('[RETELL_SERVICE] Getting time-based data for agent:', agentId);
    
    const calls = await this.getAgentCalls(agentId);
    const recentCalls = this.filterCallsByDays(calls, days);
    
    // Group calls by date
    const dateGroups: { [date: string]: RetellCall[] } = {};
    
    recentCalls.forEach(call => {
      const date = new Date(call.start_timestamp * 1000).toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(call);
    });

    // Convert to time-based data array
    return Object.entries(dateGroups).map(([date, dateCalls]) => ({
      date,
      calls: dateCalls.length,
      duration: dateCalls.reduce((sum, call) => sum + call.duration_sec, 0),
      cost: dateCalls.reduce((sum, call) => sum + call.cost, 0),
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate comprehensive dashboard metrics
   */
  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    console.log('[RETELL_SERVICE] Calculating dashboard metrics for user:', userId);
    
    try {
      // Get user's primary agent
      const userAgent = await this.getUserAgent(userId);
      if (!userAgent?.retell_agents?.retell_agent_id) {
        console.warn('[RETELL_SERVICE] No agent found for user');
        return this.getEmptyMetrics();
      }

      const agentId = userAgent.retell_agents.retell_agent_id;
      const calls = await this.getAgentCalls(agentId);

      // Calculate time periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter calls by time periods
      const callsToday = this.filterCallsAfterDate(calls, today);
      const callsThisWeek = this.filterCallsAfterDate(calls, thisWeek);
      const callsThisMonth = this.filterCallsAfterDate(calls, thisMonth);
      const allCalls = calls;

      // Calculate metrics
      const totalCalls = allCalls.length;
      const totalDuration = allCalls.reduce((sum, call) => sum + call.duration_sec, 0);
      const totalCost = allCalls.reduce((sum, call) => sum + call.cost, 0);
      const successfulCalls = allCalls.filter(call => 
        call.call_status === 'completed' || call.call_status === 'ended'
      ).length;

      return {
        totalCalls,
        totalMinutes: Math.round(totalDuration / 60),
        averageDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
        totalCost: Math.round(totalCost * 100) / 100,
        callsToday: callsToday.length,
        callsThisWeek: callsThisWeek.length,
        callsThisMonth: callsThisMonth.length,
        costToday: Math.round(callsToday.reduce((sum, call) => sum + call.cost, 0) * 100) / 100,
        costThisWeek: Math.round(callsThisWeek.reduce((sum, call) => sum + call.cost, 0) * 100) / 100,
        costThisMonth: Math.round(callsThisMonth.reduce((sum, call) => sum + call.cost, 0) * 100) / 100,
      };
    } catch (error) {
      console.error('[RETELL_SERVICE] Error calculating dashboard metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Sync calls to Supabase cache for faster access
   */
  async syncCallsToCache(userId: string): Promise<number> {
    console.log('[RETELL_SERVICE] Syncing calls to cache for user:', userId);
    
    try {
      const userAgent = await this.getUserAgent(userId);
      if (!userAgent?.retell_agents?.retell_agent_id) {
        console.warn('[RETELL_SERVICE] No agent found for user');
        return 0;
      }

      const agentId = userAgent.retell_agents.retell_agent_id;
      const calls = await this.getAgentCalls(agentId);

      // Transform calls for Supabase storage
      const callsToCache = calls.map(call => ({
        call_id: call.call_id,
        user_id: userId,
        company_id: userAgent.company_id,
        agent_id: userAgent.agent_id,
        timestamp: new Date(call.start_timestamp * 1000).toISOString(),
        start_time: new Date(call.start_timestamp * 1000).toISOString(),
        duration_sec: call.duration_sec,
        cost_usd: call.cost,
        call_status: call.call_status,
        from: call.from_number || 'unknown',
        to: call.to_number || 'unknown',
        from_number: call.from_number,
        to_number: call.to_number,
        disconnection_reason: call.disconnection_reason,
        recording_url: call.recording_url,
        audio_url: call.recording_url,
        transcript: call.transcript,
        transcript_url: call.transcript_url,
        sentiment: call.sentiment?.overall_sentiment,
        sentiment_score: call.sentiment?.score,
        result_sentiment: call.sentiment ? JSON.stringify(call.sentiment) : null,
        disposition: call.disposition,
        latency_ms: call.latency_ms,
        call_type: 'phone_call',
        call_summary: call.summary,
      }));

      // Upsert calls to Supabase
      const { error } = await supabase
        .from('calls')
        .upsert(callsToCache, {
          onConflict: 'call_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('[RETELL_SERVICE] Error syncing calls to cache:', error);
        throw new Error(`Failed to sync calls: ${error.message}`);
      }

      console.log('[RETELL_SERVICE] Successfully synced', callsToCache.length, 'calls to cache');
      return callsToCache.length;
    } catch (error) {
      console.error('[RETELL_SERVICE] Error in syncCallsToCache:', error);
      throw error;
    }
  }

  // Helper methods
  private filterCallsByDays(calls: RetellCall[], days: number): RetellCall[] {
    const cutoffTime = Date.now() / 1000 - (days * 24 * 60 * 60);
    return calls.filter(call => call.start_timestamp >= cutoffTime);
  }

  private filterCallsAfterDate(calls: RetellCall[], date: Date): RetellCall[] {
    const cutoffTime = date.getTime() / 1000;
    return calls.filter(call => call.start_timestamp >= cutoffTime);
  }

  private getEmptyMetrics(): DashboardMetrics {
    return {
      totalCalls: 0,
      totalMinutes: 0,
      averageDuration: 0,
      successRate: 0,
      totalCost: 0,
      callsToday: 0,
      callsThisWeek: 0,
      callsThisMonth: 0,
      costToday: 0,
      costThisWeek: 0,
      costThisMonth: 0,
    };
  }
}

// Export singleton instance
export const retellService = new RetellService();

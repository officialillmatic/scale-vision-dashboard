
import { useState, useEffect } from 'react';

export interface RetellAgentOption {
  retell_agent_id: string;
  name: string;
  display_text: string;
}

interface RetellAgent {
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

interface RetellAgentsResponse {
  agents: RetellAgent[];
}

export function useRetellAgents() {
  const [agents, setAgents] = useState<RetellAgentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const testEndpoint = async (baseUrl: string, endpoint: string): Promise<{ success: boolean; data?: any; status?: number; error?: string }> => {
    const fullUrl = `${baseUrl}${endpoint}`;
    const apiKey = import.meta.env.VITE_RETELL_API_KEY;
    
    try {
      console.log(`[USE_RETELL_AGENTS] Testing endpoint: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { raw_response: responseText };
      }

      console.log(`[USE_RETELL_AGENTS] ${fullUrl} - Status: ${response.status}`);

      return {
        success: response.ok,
        data: responseData,
        status: response.status,
        error: response.ok ? undefined : responseText
      };

    } catch (error: any) {
      console.error(`[USE_RETELL_AGENTS] ${fullUrl} - Network error:`, error);
      return {
        success: false,
        error: `Network error: ${error.message}`,
        status: 0
      };
    }
  };

  const fetchAgents = async () => {
    const apiKey = import.meta.env.VITE_RETELL_API_KEY;
    
    if (!apiKey) {
      setError('Retell API key not configured');
      console.error('[USE_RETELL_AGENTS] No API key found');
      return;
    }

    // Prevent multiple simultaneous calls
    if (isLoading) {
      console.log('[USE_RETELL_AGENTS] Already loading, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[USE_RETELL_AGENTS] Starting endpoint discovery...');
      
      // Test all possible endpoint combinations
      const possibleBaseUrls = [
        'https://api.retellai.com',
        'https://api.retellai.com/v1',
        'https://api.retellai.com/v2'
      ];
      
      const possibleEndpoints = [
        '/agent',
        '/agents', 
        '/v1/agents',
        '/list-agents',
        '/agent/list'
      ];

      let workingEndpoint = null;
      let workingData = null;

      // Test all combinations to find the working endpoint
      for (const baseUrl of possibleBaseUrls) {
        for (const endpoint of possibleEndpoints) {
          const result = await testEndpoint(baseUrl, endpoint);
          
          if (result.success && result.data) {
            workingEndpoint = `${baseUrl}${endpoint}`;
            workingData = result.data;
            console.log(`[USE_RETELL_AGENTS] ✅ Found working endpoint: ${workingEndpoint}`);
            break;
          }
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (workingEndpoint) break;
      }

      if (!workingEndpoint || !workingData) {
        throw new Error('No working endpoint found for Retell AI agents API');
      }

      console.log('[USE_RETELL_AGENTS] Raw API response:', workingData);

      // Handle different response formats
      let agentsArray = [];
      if (Array.isArray(workingData)) {
        agentsArray = workingData;
      } else if (workingData.agents && Array.isArray(workingData.agents)) {
        agentsArray = workingData.agents;
      } else if (workingData.data && Array.isArray(workingData.data)) {
        agentsArray = workingData.data;
      }

      if (agentsArray.length > 0) {
        // Filter out null/undefined agents and create agent options
        const validAgents = agentsArray.filter((agent: any) => 
          agent && 
          (agent.agent_id || agent.id) && 
          (agent.agent_name || agent.name)
        );

        // Remove duplicates based on agent_id using a Map for efficient lookup
        const uniqueAgentsMap = new Map<string, RetellAgentOption>();
        
        validAgents.forEach((agent: any) => {
          const agentId = agent.agent_id || agent.id;
          const agentName = agent.agent_name || agent.name || `Agent ${agentId}`;
          
          // Only add if we haven't seen this agent_id before
          if (!uniqueAgentsMap.has(agentId)) {
            uniqueAgentsMap.set(agentId, {
              retell_agent_id: agentId,
              name: agentName,
              display_text: `${agentName} (${agentId})`
            });
          }
        });

        // Convert Map back to array
        const uniqueAgentOptions = Array.from(uniqueAgentsMap.values());
        
        setAgents(uniqueAgentOptions);
        console.log(`[USE_RETELL_AGENTS] Successfully loaded ${uniqueAgentOptions.length} unique agents from ${workingEndpoint}`);
      } else {
        console.warn('[USE_RETELL_AGENTS] No agents found in API response');
        setAgents([]);
      }
    } catch (error: any) {
      console.error('[USE_RETELL_AGENTS] Error fetching agents from Retell AI:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to fetch agents from Retell AI';
      if (error.message.includes('401')) {
        errorMessage = 'Invalid API key. Please check your Retell AI configuration.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. Please verify your Retell AI API permissions.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setAgents([]);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  };

  useEffect(() => {
    // Only fetch if we haven't initialized yet
    if (!hasInitialized) {
      fetchAgents();
    }
  }, [hasInitialized]); // Only depend on hasInitialized to prevent multiple calls

  return {
    agents,
    isLoading,
    error,
    refetch: fetchAgents
  };
}

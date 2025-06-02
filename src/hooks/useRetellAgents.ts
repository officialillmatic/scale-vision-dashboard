
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

  const fetchAgents = async () => {
    const apiKey = import.meta.env.VITE_RETELL_API_KEY;
    
    if (!apiKey) {
      setError('Retell API key not configured');
      console.error('[USE_RETELL_AGENTS] No API key found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[USE_RETELL_AGENTS] Fetching agents from Retell AI API...');
      
      const response = await fetch('https://api.retellai.com/agents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[USE_RETELL_AGENTS] API error:', response.status, errorText);
        throw new Error(`Failed to fetch agents: ${response.status} - ${errorText}`);
      }

      const data: RetellAgentsResponse = await response.json();
      console.log('[USE_RETELL_AGENTS] Raw API response:', data);

      if (data.agents && Array.isArray(data.agents)) {
        const agentOptions: RetellAgentOption[] = data.agents.map(agent => ({
          retell_agent_id: agent.agent_id,
          name: agent.agent_name,
          display_text: `${agent.agent_name} (${agent.agent_id})`
        }));
        
        setAgents(agentOptions);
        console.log('[USE_RETELL_AGENTS] Successfully loaded', agentOptions.length, 'agents from Retell AI API');
      } else {
        console.warn('[USE_RETELL_AGENTS] Unexpected API response format:', data);
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
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    isLoading,
    error,
    refetch: fetchAgents
  };
}

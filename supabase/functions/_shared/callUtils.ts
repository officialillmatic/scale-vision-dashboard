
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Get the user's assigned agents
export async function getUserAgents(supabaseClient: any, userId: string, companyId: string) {
  try {
    // Get user's assigned agents
    const { data: userAgents, error: userAgentsError } = await supabaseClient
      .from("user_agents")
      .select(`
        id,
        agent_id,
        is_primary,
        agent:agents(*)
      `)
      .eq("user_id", userId)
      .eq("company_id", companyId);
    
    if (userAgentsError) {
      console.error('Error fetching user agents:', userAgentsError);
      return { 
        error: userAgentsError,
        userAgentIds: [],
        primaryAgentId: null,
        retellAgentMap: new Map(),
        agentRates: new Map()
      };
    }

    // Extract agent IDs and primary agent
    const userAgentIds = userAgents.map(ua => ua.agent_id);
    
    // Find primary agent (if any)
    const primaryAgent = userAgents.find(ua => ua.is_primary);
    const primaryAgentId = primaryAgent ? primaryAgent.agent_id : userAgentIds[0] || null;
    
    // Create mapping from Retell agent IDs to our internal agent IDs
    const retellAgentMap = new Map();
    const agentRates = new Map();
    
    userAgents.forEach(ua => {
      if (ua.agent?.retell_agent_id) {
        retellAgentMap.set(ua.agent.retell_agent_id, ua.agent_id);
      }
      if (ua.agent?.rate_per_minute) {
        agentRates.set(ua.agent_id, ua.agent.rate_per_minute);
      } else {
        // Default rate if not specified
        agentRates.set(ua.agent_id, 0.02);
      }
    });

    return { 
      userAgentIds,
      primaryAgentId,
      retellAgentMap,
      agentRates,
      error: null
    };
  } catch (error) {
    console.error('Error in getUserAgents:', error);
    return { 
      error,
      userAgentIds: [],
      primaryAgentId: null,
      retellAgentMap: new Map(),
      agentRates: new Map()
    };
  }
}

// Helper functions for call data mapping
export function mapCallStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'complete':
    case 'done':
      return 'completed';
    case 'in_progress':
    case 'inprogress':
    case 'ongoing':
    case 'active':
      return 'in_progress';
    case 'failed':
    case 'error':
    case 'disconnected':
      return 'failed';
    default:
      return 'unknown';
  }
}

export function mapCallType(type: string): string {
  switch (type?.toLowerCase()) {
    case 'phone':
    case 'phone_call':
    case 'call':
      return 'phone_call';
    case 'voicemail':
      return 'voicemail';
    default:
      return 'other';
  }
}

// Generate mock calls for development and testing
export function generateMockCalls(
  count: number,
  companyId: string,
  userId: string,
  maxCost: number,
  primaryAgentId: string | null
): { calls: any[], totalCost: number } {
  const calls = [];
  let totalCost = 0;
  
  // Generate mock call data (only for development)
  for (let i = 0; i < count && totalCost < maxCost; i++) {
    // Generate random duration between 30 and 300 seconds
    const durationSec = Math.floor(Math.random() * (300 - 30 + 1)) + 30;
    
    // Calculate call cost at $0.02 per minute
    const durationMin = durationSec / 60;
    const ratePerMin = 0.02; // Default rate
    const cost = durationMin * ratePerMin;
    
    // Only add call if it doesn't exceed max cost
    if (totalCost + cost > maxCost) {
      continue;
    }
    
    totalCost += cost;
    
    // Generate random timestamp within the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const timestamp = new Date(
      thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
    );
    
    // Generate random phone numbers
    const fromNumber = '+1' + Math.floor(Math.random() * 9000000000 + 1000000000);
    const toNumber = '+1' + Math.floor(Math.random() * 9000000000 + 1000000000);
    
    // Generate unique call ID
    const callId = 'mock_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Randomly select call status (mostly completed for testing)
    const statusOptions = ['completed', 'in_progress', 'failed'];
    const weights = [0.8, 0.1, 0.1]; // 80% completed, 10% in_progress, 10% failed
    const randomValue = Math.random();
    let selectedStatus = '';
    let cumulativeWeight = 0;
    
    for (let j = 0; j < statusOptions.length; j++) {
      cumulativeWeight += weights[j];
      if (randomValue <= cumulativeWeight) {
        selectedStatus = statusOptions[j];
        break;
      }
    }
    
    calls.push({
      id: crypto.randomUUID(),
      call_id: callId,
      user_id: userId,
      company_id: companyId,
      timestamp: timestamp.toISOString(),
      from: fromNumber,
      to: toNumber,
      duration_sec: durationSec,
      cost_usd: cost,
      call_status: selectedStatus,
      call_type: 'phone_call',
      agent_id: primaryAgentId
    });
  }
  
  return { calls, totalCost };
}

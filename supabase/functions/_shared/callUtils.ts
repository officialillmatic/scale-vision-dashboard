
// Generate mock call data
export function generateMockCalls(count: number, companyId: string, userId: string, currentBalance: number, primaryAgentId: string | null) {
  const callTypes = ["inbound", "outbound", "missed", "voicemail"];
  const statuses = ["completed", "in-progress", "failed"];
  const sentiments = ["positive", "neutral", "negative"];
  
  const now = new Date();
  const calls = [];
  let totalCost = 0;
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - i * 2); // Calls every 2 hours in the past
    
    const duration = Math.floor(Math.random() * 600) + 60; // 1-10 minutes
    const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const cost = parseFloat((duration * 0.002).toFixed(4));
    
    totalCost += cost;
    
    // Make sure we don't exceed the user's balance
    if (currentBalance - totalCost < 0) {
      break; // Stop generating calls if we exceed the balance
    }
    
    calls.push({
      call_id: `mock-${crypto.randomUUID()}`,
      company_id: companyId,
      user_id: userId,
      timestamp: timestamp.toISOString(),
      duration_sec: duration,
      cost_usd: cost,
      from: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      to: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      call_status: status,
      sentiment: sentiment,
      call_type: callType,
      latency_ms: Math.floor(Math.random() * 200) + 50,
      call_summary: `This is a mock ${callType} call summary for development purposes.`,
      agent_id: primaryAgentId // Use the primary agent if available
    });
  }
  
  return { calls, totalCost };
}

// Helper function to map Retell call status to our schema
export function mapCallStatus(retellStatus: string): string {
  // Define mapping from Retell status to our status
  const statusMap: Record<string, string> = {
    'completed': 'completed',
    'no-answer': 'no-answer',
    'busy': 'busy',
    'failed': 'failed',
    'voicemail': 'voicemail'
    // Add more mappings as needed
  };
  
  return statusMap[retellStatus] || 'unknown';
}

// Helper function to map call types
export function mapCallType(retellCallType: string): string {
  // Define mapping from Retell call types to our schema
  const typeMap: Record<string, string> = {
    'phone_call': 'phone_call',
    'voicemail': 'voicemail'
    // Add more mappings as needed
  };
  
  return typeMap[retellCallType] || 'other';
}

// Get user's agents
export async function getUserAgents(supabaseClient: any, userId: string, companyId: string) {
  const { data: userAgents, error: userAgentsError } = await supabaseClient
    .from('user_agents')
    .select(`
      agent_id,
      is_primary,
      agents:agent_id (
        id,
        name,
        rate_per_minute,
        retell_agent_id
      )
    `)
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (userAgentsError) {
    console.error('Error fetching user agents:', userAgentsError);
    return { error: userAgentsError };
  }

  const userAgentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
  const primaryAgentId = userAgents?.find(ua => ua.is_primary)?.agent_id || null;

  // Create maps of Retell agent IDs to our internal agent IDs and rates
  const retellAgentMap = new Map();
  const agentRates = new Map();
  
  userAgents?.forEach(ua => {
    if (ua.agents && ua.agents.retell_agent_id) {
      retellAgentMap.set(ua.agents.retell_agent_id, ua.agent_id);
      agentRates.set(ua.agent_id, ua.agents.rate_per_minute || 0.02);
    }
  });

  return { 
    userAgentIds: Array.from(userAgentIds), 
    primaryAgentId, 
    retellAgentMap, 
    agentRates 
  };
}

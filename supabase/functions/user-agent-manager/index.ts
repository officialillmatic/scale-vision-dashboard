
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[USER-AGENT-MANAGER-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      const { action, ...requestData } = requestBody;
      
      console.log(`[USER-AGENT-MANAGER-${requestId}] Action: ${action || 'not provided'}`);
      console.log(`[USER-AGENT-MANAGER-${requestId}] Request data:`, requestData);

      switch (action) {
        case 'auto_map_orphaned_calls':
          return await autoMapOrphanedCalls(supabaseClient, requestId);
          
        case 'audit_mappings':
          return await auditMappings(supabaseClient, requestId);
          
        case 'create_default_mapping':
          return await createDefaultMapping(supabaseClient, requestId, requestData);
          
        default:
          console.log(`[USER-AGENT-MANAGER-${requestId}] No action provided, defaulting to auto_map_orphaned_calls`);
          return await autoMapOrphanedCalls(supabaseClient, requestId);
      }
    }

    return createErrorResponse('Method not allowed - only POST requests supported', 405);

  } catch (error) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Fatal error:`, error);
    return createErrorResponse(`Operation failed: ${error.message}`, 500);
  }
});

async function autoMapOrphanedCalls(supabaseClient: any, requestId: string) {
  console.log(`[USER-AGENT-MANAGER-${requestId}] Starting auto-mapping process...`);
  
  // Find agents that exist in calls but don't have user mappings
  const { data: callsWithAgents, error: callsError } = await supabaseClient
    .from('calls')
    .select('agent_id, user_id, company_id')
    .not('agent_id', 'is', null);

  if (callsError) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Error finding calls with agents:`, callsError);
    return createErrorResponse(`Failed to find calls with agents: ${callsError.message}`, 500);
  }

  let mappingsCreated = 0;
  let agentsProcessed = 0;
  let callsFound = callsWithAgents?.length || 0;

  // Group calls by agent_id to process unique agents
  const agentGroups = new Map();
  callsWithAgents?.forEach(call => {
    if (call.agent_id && !agentGroups.has(call.agent_id)) {
      agentGroups.set(call.agent_id, call);
    }
  });

  for (const [agentId, sampleCall] of agentGroups) {
    try {
      // Check if mapping already exists
      const { data: existingMapping } = await supabaseClient
        .from('user_agents')
        .select('id')
        .eq('agent_id', agentId)
        .single();

      if (existingMapping) {
        console.log(`[USER-AGENT-MANAGER-${requestId}] Agent ${agentId} already has mapping, skipping`);
        continue;
      }

      // Create user-agent mapping
      const { error: mappingError } = await supabaseClient
        .from('user_agents')
        .insert({
          user_id: sampleCall.user_id,
          company_id: sampleCall.company_id,
          agent_id: agentId,
          is_primary: false
        });

      if (mappingError) {
        console.error(`[USER-AGENT-MANAGER-${requestId}] Failed to create mapping for agent ${agentId}:`, mappingError);
      } else {
        mappingsCreated++;
        console.log(`[USER-AGENT-MANAGER-${requestId}] Created mapping for agent ${agentId}`);
      }

      agentsProcessed++;

    } catch (error) {
      console.error(`[USER-AGENT-MANAGER-${requestId}] Error processing agent ${agentId}:`, error);
    }
  }

  const result = {
    message: 'Auto-mapping completed',
    mappings_created: mappingsCreated,
    agents_processed: agentsProcessed,
    calls_found: callsFound,
    requestId
  };

  console.log(`[USER-AGENT-MANAGER-${requestId}] Auto-mapping result:`, result);
  return createSuccessResponse(result);
}

async function auditMappings(supabaseClient: any, requestId: string) {
  console.log(`[USER-AGENT-MANAGER-${requestId}] Starting mappings audit...`);
  
  // Find agents without user mappings
  const { data: agentsWithoutMappings, error: auditError } = await supabaseClient
    .from('agents')
    .select(`
      id, 
      name, 
      retell_agent_id,
      status
    `)
    .not('retell_agent_id', 'is', null)
    .eq('status', 'active');

  if (auditError) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Audit error:`, auditError);
    return createErrorResponse(`Audit failed: ${auditError.message}`, 500);
  }

  const agentsWithoutUserMappings = [];
  
  for (const agent of agentsWithoutMappings || []) {
    const { data: mapping } = await supabaseClient
      .from('user_agents')
      .select('id')
      .eq('agent_id', agent.id)
      .single();

    if (!mapping) {
      agentsWithoutUserMappings.push({
        id: agent.id,
        name: agent.name,
        retell_agent_id: agent.retell_agent_id
      });
    }
  }

  const analysis = {
    total_agents: agentsWithoutMappings?.length || 0,
    agents_without_mappings: agentsWithoutUserMappings,
    agents_with_mappings: (agentsWithoutMappings?.length || 0) - agentsWithoutUserMappings.length
  };

  console.log(`[USER-AGENT-MANAGER-${requestId}] Audit completed:`, analysis);
  
  return createSuccessResponse({
    message: 'Audit completed',
    analysis,
    requestId
  });
}

async function createDefaultMapping(supabaseClient: any, requestId: string, requestData: any) {
  const { retell_agent_id, user_id, company_id } = requestData;
  
  if (!retell_agent_id || !user_id || !company_id) {
    return createErrorResponse('Missing required parameters: retell_agent_id, user_id, company_id', 400);
  }

  console.log(`[USER-AGENT-MANAGER-${requestId}] Creating mapping for agent ${retell_agent_id}`);

  // Find the agent
  const { data: agent, error: agentError } = await supabaseClient
    .from('agents')
    .select('id, name')
    .eq('retell_agent_id', retell_agent_id)
    .single();

  if (agentError || !agent) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Agent not found:`, agentError);
    return createErrorResponse(`Agent not found for retell_agent_id: ${retell_agent_id}`, 404);
  }

  // Create the mapping
  const { error: mappingError } = await supabaseClient
    .from('user_agents')
    .insert({
      user_id,
      company_id,
      agent_id: agent.id,
      is_primary: false
    });

  if (mappingError) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Failed to create mapping:`, mappingError);
    return createErrorResponse(`Failed to create mapping: ${mappingError.message}`, 500);
  }

  console.log(`[USER-AGENT-MANAGER-${requestId}] Successfully created mapping for ${agent.name}`);
  
  return createSuccessResponse({
    message: 'Mapping created successfully',
    agent_name: agent.name,
    agent_id: agent.id,
    requestId
  });
}

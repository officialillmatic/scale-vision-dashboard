
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
      const { action, ...requestData } = await req.json().catch(() => ({ action: 'unknown' }));
      console.log(`[USER-AGENT-MANAGER-${requestId}] Action: ${action}`);

      switch (action) {
        case 'auto_map_orphaned_calls':
          return await autoMapOrphanedCalls(supabaseClient, requestId);
          
        case 'audit_mappings':
          return await auditMappings(supabaseClient, requestId);
          
        case 'create_default_mapping':
          return await createDefaultMapping(supabaseClient, requestId, requestData);
          
        default:
          return createErrorResponse(`Unknown action: ${action}. Supported actions: auto_map_orphaned_calls, audit_mappings, create_default_mapping`, 400);
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
  
  // Find agents that have calls but no user mappings
  const { data: orphanedAgents, error: orphanError } = await supabaseClient
    .from('agents')
    .select(`
      id, 
      name, 
      retell_agent_id,
      calls!inner(id, user_id, company_id)
    `)
    .not('retell_agent_id', 'is', null);

  if (orphanError) {
    console.error(`[USER-AGENT-MANAGER-${requestId}] Error finding orphaned agents:`, orphanError);
    return createErrorResponse(`Failed to find orphaned agents: ${orphanError.message}`, 500);
  }

  let mappingsCreated = 0;
  let agentsProcessed = 0;
  let callsFound = 0;

  for (const agent of orphanedAgents || []) {
    try {
      // Check if mapping already exists
      const { data: existingMapping } = await supabaseClient
        .from('user_agents')
        .select('id')
        .eq('agent_id', agent.id)
        .single();

      if (existingMapping) {
        console.log(`[USER-AGENT-MANAGER-${requestId}] Agent ${agent.name} already has mapping, skipping`);
        continue;
      }

      // Get a representative call to determine user/company
      const { data: sampleCall } = await supabaseClient
        .from('calls')
        .select('user_id, company_id')
        .eq('agent_id', agent.id)
        .limit(1)
        .single();

      if (sampleCall) {
        // Create user-agent mapping
        const { error: mappingError } = await supabaseClient
          .from('user_agents')
          .insert({
            user_id: sampleCall.user_id,
            company_id: sampleCall.company_id,
            agent_id: agent.id,
            is_primary: false
          });

        if (mappingError) {
          console.error(`[USER-AGENT-MANAGER-${requestId}] Failed to create mapping for agent ${agent.name}:`, mappingError);
        } else {
          mappingsCreated++;
          console.log(`[USER-AGENT-MANAGER-${requestId}] Created mapping for agent ${agent.name}`);
        }
      }

      agentsProcessed++;
      callsFound += agent.calls?.length || 0;

    } catch (error) {
      console.error(`[USER-AGENT-MANAGER-${requestId}] Error processing agent ${agent.name}:`, error);
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

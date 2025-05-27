
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

  console.log(`[USER-AGENT-MANAGER] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      const { action, retell_agent_id, user_id, company_id } = requestBody;

      console.log(`[USER-AGENT-MANAGER] Action: ${action}, Retell Agent ID: ${retell_agent_id}`);

      switch (action) {
        case 'auto_map_orphaned_calls':
          return await autoMapOrphanedCalls(supabaseClient);
        
        case 'create_default_mapping':
          return await createDefaultMapping(supabaseClient, retell_agent_id, user_id, company_id);
        
        case 'audit_mappings':
          return await auditUserAgentMappings(supabaseClient);
        
        default:
          return createErrorResponse('Invalid action. Supported actions: auto_map_orphaned_calls, create_default_mapping, audit_mappings', 400);
      }
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[USER-AGENT-MANAGER] Fatal error:', error);
    return createErrorResponse(`User-agent management failed: ${error.message}`, 500);
  }
});

async function autoMapOrphanedCalls(supabaseClient: any) {
  console.log('[USER-AGENT-MANAGER] Starting auto-mapping of orphaned calls...');
  
  try {
    // Find all agents with Retell integration but no user mappings
    const { data: orphanedAgents, error: agentsError } = await supabaseClient
      .from('agents')
      .select(`
        id, 
        retell_agent_id, 
        name,
        status
      `)
      .not('retell_agent_id', 'is', null)
      .eq('status', 'active');

    if (agentsError) {
      console.error('[USER-AGENT-MANAGER] Error fetching agents:', agentsError);
      return createErrorResponse(`Failed to fetch agents: ${agentsError.message}`, 500);
    }

    let mappingsCreated = 0;
    let callsFound = 0;

    for (const agent of orphanedAgents || []) {
      // Check if this agent already has user mappings
      const { data: existingMappings } = await supabaseClient
        .from('user_agents')
        .select('id')
        .eq('agent_id', agent.id);

      if (existingMappings && existingMappings.length > 0) {
        console.log(`[USER-AGENT-MANAGER] Agent ${agent.name} already has mappings, skipping...`);
        continue;
      }

      // Find calls associated with this Retell agent
      const { data: callsForAgent, error: callsError } = await supabaseClient
        .from('calls')
        .select('user_id, company_id')
        .eq('agent_id', agent.id)
        .limit(1);

      if (callsError) {
        console.error(`[USER-AGENT-MANAGER] Error finding calls for agent ${agent.id}:`, callsError);
        continue;
      }

      if (callsForAgent && callsForAgent.length > 0) {
        const call = callsForAgent[0];
        callsFound++;

        // Create user-agent mapping based on call data
        const { error: mappingError } = await supabaseClient
          .from('user_agents')
          .insert({
            user_id: call.user_id,
            agent_id: agent.id,
            company_id: call.company_id,
            is_primary: true
          });

        if (mappingError) {
          console.error(`[USER-AGENT-MANAGER] Error creating mapping for agent ${agent.id}:`, mappingError);
        } else {
          mappingsCreated++;
          console.log(`[USER-AGENT-MANAGER] Created mapping for agent ${agent.name} -> user ${call.user_id}`);
        }
      }
    }

    return createSuccessResponse({
      message: 'Auto-mapping completed',
      agents_processed: orphanedAgents?.length || 0,
      calls_found: callsFound,
      mappings_created: mappingsCreated
    });

  } catch (error) {
    console.error('[USER-AGENT-MANAGER] Error in auto-mapping:', error);
    return createErrorResponse(`Auto-mapping failed: ${error.message}`, 500);
  }
}

async function createDefaultMapping(supabaseClient: any, retellAgentId: string, userId: string, companyId: string) {
  if (!retellAgentId || !userId || !companyId) {
    return createErrorResponse('Missing required parameters: retell_agent_id, user_id, company_id', 400);
  }

  try {
    // Find the agent by Retell ID
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, name')
      .eq('retell_agent_id', retellAgentId)
      .eq('status', 'active')
      .single();

    if (agentError || !agent) {
      return createErrorResponse(`Agent not found for Retell ID: ${retellAgentId}`, 404);
    }

    // Check if mapping already exists
    const { data: existingMapping } = await supabaseClient
      .from('user_agents')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (existingMapping) {
      return createSuccessResponse({
        message: 'Mapping already exists',
        agent_name: agent.name,
        mapping_id: existingMapping.id
      });
    }

    // Create the mapping
    const { data: newMapping, error: mappingError } = await supabaseClient
      .from('user_agents')
      .insert({
        user_id: userId,
        agent_id: agent.id,
        company_id: companyId,
        is_primary: true
      })
      .select()
      .single();

    if (mappingError) {
      console.error('[USER-AGENT-MANAGER] Error creating mapping:', mappingError);
      return createErrorResponse(`Failed to create mapping: ${mappingError.message}`, 500);
    }

    return createSuccessResponse({
      message: 'Mapping created successfully',
      agent_name: agent.name,
      mapping_id: newMapping.id
    });

  } catch (error) {
    console.error('[USER-AGENT-MANAGER] Error creating default mapping:', error);
    return createErrorResponse(`Failed to create mapping: ${error.message}`, 500);
  }
}

async function auditUserAgentMappings(supabaseClient: any) {
  try {
    // Get all agents with Retell integration
    const { data: retellAgents } = await supabaseClient
      .from('agents')
      .select('id, name, retell_agent_id, status')
      .not('retell_agent_id', 'is', null);

    // Get all user-agent mappings
    const { data: userAgents } = await supabaseClient
      .from('user_agents')
      .select(`
        id,
        user_id,
        agent_id,
        company_id,
        is_primary,
        agents!inner(name, retell_agent_id)
      `);

    // Analyze the data
    const analysis = {
      total_retell_agents: retellAgents?.length || 0,
      agents_with_mappings: 0,
      agents_without_mappings: [],
      total_mappings: userAgents?.length || 0,
      orphaned_mappings: [],
      duplicate_mappings: []
    };

    const agentMappingCount = new Map();

    // Count mappings per agent
    for (const mapping of userAgents || []) {
      const agentId = mapping.agent_id;
      agentMappingCount.set(agentId, (agentMappingCount.get(agentId) || 0) + 1);
    }

    // Check each Retell agent
    for (const agent of retellAgents || []) {
      const mappingCount = agentMappingCount.get(agent.id) || 0;
      
      if (mappingCount === 0) {
        analysis.agents_without_mappings.push({
          id: agent.id,
          name: agent.name,
          retell_agent_id: agent.retell_agent_id,
          status: agent.status
        });
      } else {
        analysis.agents_with_mappings++;
        
        if (mappingCount > 1) {
          analysis.duplicate_mappings.push({
            agent_id: agent.id,
            agent_name: agent.name,
            mapping_count: mappingCount
          });
        }
      }
    }

    return createSuccessResponse({
      message: 'User-agent mapping audit completed',
      analysis
    });

  } catch (error) {
    console.error('[USER-AGENT-MANAGER] Error in audit:', error);
    return createErrorResponse(`Audit failed: ${error.message}`, 500);
  }
}

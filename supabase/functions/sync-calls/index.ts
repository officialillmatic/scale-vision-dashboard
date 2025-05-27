
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, accept, accept-profile, content-profile',
  'Access-Control-Max-Age': '86400'
};

function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      success: false,
      timestamp: new Date().toISOString()
    }), 
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify({ 
      ...data, 
      success: true,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const retellApiKey = env('RETELL_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  console.log(`[SYNC-CALLS] Received ${req.method} request`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS] Request body:`, JSON.stringify(requestBody));

      // Handle test mode
      if (requestBody.test) {
        console.log(`[SYNC-CALLS] Test mode - checking Retell API connectivity`);
        try {
          const response = await fetch('https://api.retellai.com/v2/call', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Retell API responded with ${response.status}`);
          }

          const data = await response.json();
          return createSuccessResponse({
            message: 'Retell API connectivity test passed',
            callsFound: data?.length || 0
          });
        } catch (error) {
          console.error(`[SYNC-CALLS] Test failed:`, error);
          return createErrorResponse(`Test failed: ${error.message}`, 500);
        }
      }

      // Get agents with Retell integration
      const { data: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('*')
        .not('retell_agent_id', 'is', null);

      if (agentsError) {
        console.error(`[SYNC-CALLS] Error fetching agents:`, agentsError);
        return createErrorResponse(`Failed to fetch agents: ${agentsError.message}`, 500);
      }

      console.log(`[SYNC-CALLS] Found ${agents?.length || 0} agents with Retell integration`);

      let totalSynced = 0;

      for (const agent of agents || []) {
        try {
          console.log(`[SYNC-CALLS] Syncing calls for agent: ${agent.retell_agent_id}`);
          
          const response = await fetch(`https://api.retellai.com/v2/call?agent_id=${agent.retell_agent_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            console.error(`[SYNC-CALLS] Retell API error for agent ${agent.retell_agent_id}: ${response.status}`);
            continue;
          }

          const calls = await response.json();
          totalSynced += calls?.length || 0;
        } catch (error) {
          console.error(`[SYNC-CALLS] Error syncing agent ${agent.retell_agent_id}:`, error);
        }
      }

      console.log(`[SYNC-CALLS] Sync completed. Total calls synced: ${totalSynced}`);
      
      return createSuccessResponse({
        message: 'Sync completed successfully',
        totalSynced,
        agentsProcessed: agents?.length || 0
      });
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[SYNC-CALLS] Error:', error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-TEST] ${new Date().toISOString()} - Testing webhook system`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'GET') {
      // Return system health check
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'checking...',
          webhook_endpoint: 'active',
          retell_integration: 'checking...'
        }
      };

      // Test database connectivity
      try {
        const { data: dbTest, error: dbError } = await supabaseClient
          .from('agents')
          .select('count')
          .limit(1);
        
        healthCheck.services.database = dbError ? 'error' : 'healthy';
      } catch (e) {
        healthCheck.services.database = 'error';
      }

      // Test Retell integration (basic check)
      try {
        const { data: agentCount } = await supabaseClient
          .from('agents')
          .select('count', { count: 'exact' })
          .not('retell_agent_id', 'is', null);
        
        healthCheck.services.retell_integration = agentCount ? 'healthy' : 'no_agents';
      } catch (e) {
        healthCheck.services.retell_integration = 'error';
      }

      return createSuccessResponse(healthCheck);
    }

    if (req.method === 'POST') {
      // Simulate a webhook call for testing
      const { action, payload } = await req.json();

      switch (action) {
        case 'simulate_call':
          return await simulateWebhookCall(supabaseClient, payload);
        case 'test_agent_mapping':
          return await testAgentMapping(supabaseClient, payload);
        case 'validate_data_flow':
          return await validateDataFlow(supabaseClient);
        default:
          return createErrorResponse('Unknown test action', 400);
      }
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[WEBHOOK-TEST] Error:', error);
    return createErrorResponse(`Test failed: ${error.message}`, 500);
  }
});

async function simulateWebhookCall(supabaseClient: any, payload: any) {
  try {
    console.log('[WEBHOOK-TEST] Simulating webhook call...');
    
    // Create a test webhook payload
    const testPayload = {
      event: 'call_ended',
      call: {
        call_id: `test_${Date.now()}`,
        agent_id: payload.retell_agent_id || 'test_agent',
        from_number: '+1234567890',
        to_number: '+0987654321',
        start_timestamp: new Date(Date.now() - 60000).toISOString(),
        end_timestamp: new Date().toISOString(),
        duration: 60,
        call_status: 'completed',
        recording_url: 'https://example.com/recording.mp3',
        transcript: 'Test call transcript',
        sentiment_score: 0.8,
        sentiment: 'positive',
        disposition: 'completed'
      }
    };

    // Send to webhook endpoint
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    return createSuccessResponse({
      test_status: response.ok ? 'success' : 'failed',
      webhook_response: result,
      test_payload: testPayload
    });

  } catch (error) {
    return createErrorResponse(`Simulation failed: ${error.message}`, 500);
  }
}

async function testAgentMapping(supabaseClient: any, payload: any) {
  try {
    console.log('[WEBHOOK-TEST] Testing agent mapping...');
    
    const { data: agents, error } = await supabaseClient
      .from('agents')
      .select(`
        id,
        name,
        retell_agent_id,
        status,
        user_agents!inner(
          user_id,
          company_id,
          is_primary
        )
      `)
      .eq('status', 'active');

    if (error) throw error;

    const mappingReport = {
      total_agents: agents.length,
      agents_with_retell_id: agents.filter(a => a.retell_agent_id).length,
      agents_with_user_mapping: agents.filter(a => a.user_agents.length > 0).length,
      agent_details: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        retell_agent_id: agent.retell_agent_id,
        has_user_mapping: agent.user_agents.length > 0,
        user_count: agent.user_agents.length
      }))
    };

    return createSuccessResponse(mappingReport);

  } catch (error) {
    return createErrorResponse(`Agent mapping test failed: ${error.message}`, 500);
  }
}

async function validateDataFlow(supabaseClient: any) {
  try {
    console.log('[WEBHOOK-TEST] Validating data flow...');
    
    // Check recent calls and their data completeness
    const { data: recentCalls, error } = await supabaseClient
      .from('calls')
      .select(`
        call_id,
        timestamp,
        duration_sec,
        cost_usd,
        call_status,
        agent_id,
        user_id,
        company_id,
        recording_url,
        transcript,
        sentiment_score
      `)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;

    const dataQuality = {
      total_recent_calls: recentCalls.length,
      calls_with_recordings: recentCalls.filter(c => c.recording_url).length,
      calls_with_transcripts: recentCalls.filter(c => c.transcript).length,
      calls_with_sentiment: recentCalls.filter(c => c.sentiment_score !== null).length,
      calls_with_agents: recentCalls.filter(c => c.agent_id).length,
      average_cost: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.cost_usd || 0), 0) / recentCalls.length : 0,
      average_duration: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.duration_sec || 0), 0) / recentCalls.length : 0
    };

    return createSuccessResponse(dataQuality);

  } catch (error) {
    return createErrorResponse(`Data flow validation failed: ${error.message}`, 500);
  }
}

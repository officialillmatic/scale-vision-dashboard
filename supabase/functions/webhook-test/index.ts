
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellSecret = Deno.env.get('RETELL_SECRET');

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
          retell_integration: 'checking...',
          retell_secret_configured: Boolean(retellSecret)
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
        case 'test_end_to_end':
          return await testEndToEnd(supabaseClient, payload);
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
    
    // Get a real agent to test with
    const { data: testAgent, error: agentError } = await supabaseClient
      .from('agents')
      .select('retell_agent_id, id, name')
      .not('retell_agent_id', 'is', null)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (agentError || !testAgent) {
      return createErrorResponse('No test agent found with retell_agent_id', 400);
    }

    // Create a test webhook payload
    const testPayload = {
      event: 'call_ended',
      call: {
        call_id: `test_${Date.now()}`,
        agent_id: testAgent.retell_agent_id,
        from_number: '+1234567890',
        to_number: '+0987654321',
        start_timestamp: new Date(Date.now() - 60000).toISOString(),
        end_timestamp: new Date().toISOString(),
        duration: 60,
        call_status: 'completed',
        recording_url: 'https://example.com/recording.mp3',
        transcript: 'Test call transcript for webhook validation',
        sentiment_score: 0.8,
        sentiment: 'positive',
        disposition: 'completed'
      }
    };

    if (!retellSecret) {
      return createErrorResponse('RETELL_SECRET not configured for testing', 500);
    }

    // Send to webhook endpoint
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-retell-token': retellSecret,
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    return createSuccessResponse({
      test_status: response.ok ? 'success' : 'failed',
      webhook_response: result,
      test_payload: testPayload,
      response_status: response.status
    });

  } catch (error) {
    return createErrorResponse(`Simulation failed: ${error.message}`, 500);
  }
}

async function testEndToEnd(supabaseClient: any, payload: any) {
  try {
    console.log('[WEBHOOK-TEST] Running end-to-end test...');
    
    // Step 1: Get test agent
    const { data: testAgent, error: agentError } = await supabaseClient
      .from('agents')
      .select(`
        id, 
        retell_agent_id, 
        name,
        user_agents!inner(
          user_id,
          company_id,
          is_primary
        )
      `)
      .not('retell_agent_id', 'is', null)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (agentError || !testAgent) {
      return createErrorResponse('No suitable test agent found', 400);
    }

    const testCallId = `e2e_test_${Date.now()}`;
    
    // Step 2: Simulate webhook call
    const testPayload = {
      event: 'call_ended',
      call: {
        call_id: testCallId,
        agent_id: testAgent.retell_agent_id,
        from_number: '+1555123456',
        to_number: '+1555654321',
        start_timestamp: new Date(Date.now() - 120000).toISOString(),
        end_timestamp: new Date().toISOString(),
        duration: 120,
        call_status: 'completed',
        recording_url: `https://example.com/recordings/${testCallId}.mp3`,
        transcript_url: `https://example.com/transcripts/${testCallId}.txt`,
        transcript: 'This is an end-to-end test call transcript.',
        sentiment_score: 0.75,
        sentiment: 'positive',
        disposition: 'completed'
      }
    };

    // Step 3: Send webhook request
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-retell-token': retellSecret || 'test-secret',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify(testPayload)
    });

    const webhookResult = await webhookResponse.json();

    // Step 4: Verify data was inserted
    const { data: insertedCall, error: callError } = await supabaseClient
      .from('calls')
      .select('*')
      .eq('call_id', testCallId)
      .single();

    // Step 5: Verify relationships
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('call_id', testCallId)
      .single();

    // Step 6: Clean up test data
    await supabaseClient.from('calls').delete().eq('call_id', testCallId);
    await supabaseClient.from('transactions').delete().eq('call_id', testCallId);

    return createSuccessResponse({
      test_status: 'completed',
      webhook_response_ok: webhookResponse.ok,
      webhook_response_status: webhookResponse.status,
      webhook_result: webhookResult,
      call_inserted: Boolean(insertedCall && !callError),
      call_data: insertedCall,
      transaction_created: Boolean(transaction && !transactionError),
      transaction_data: transaction,
      test_payload: testPayload,
      agent_used: {
        id: testAgent.id,
        name: testAgent.name,
        retell_agent_id: testAgent.retell_agent_id
      },
      overall_success: webhookResponse.ok && insertedCall && !callError
    });

  } catch (error) {
    return createErrorResponse(`End-to-end test failed: ${error.message}`, 500);
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
      ready_for_webhooks: agents.filter(a => a.retell_agent_id && a.user_agents.length > 0).length,
      agent_details: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        retell_agent_id: agent.retell_agent_id,
        has_user_mapping: agent.user_agents.length > 0,
        user_count: agent.user_agents.length,
        webhook_ready: Boolean(agent.retell_agent_id && agent.user_agents.length > 0)
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
        transcript_url,
        sentiment_score,
        from_number,
        to_number
      `)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;

    const dataQuality = {
      total_recent_calls: recentCalls.length,
      calls_with_recordings: recentCalls.filter(c => c.recording_url).length,
      calls_with_transcripts: recentCalls.filter(c => c.transcript).length,
      calls_with_transcript_urls: recentCalls.filter(c => c.transcript_url).length,
      calls_with_sentiment: recentCalls.filter(c => c.sentiment_score !== null).length,
      calls_with_agents: recentCalls.filter(c => c.agent_id).length,
      calls_with_phone_numbers: recentCalls.filter(c => c.from_number && c.to_number).length,
      average_cost: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.cost_usd || 0), 0) / recentCalls.length : 0,
      average_duration: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => sum + (c.duration_sec || 0), 0) / recentCalls.length : 0,
      data_completeness_score: recentCalls.length > 0 ? 
        recentCalls.reduce((sum, c) => {
          let score = 0;
          if (c.recording_url) score += 1;
          if (c.transcript) score += 1;
          if (c.sentiment_score !== null) score += 1;
          if (c.agent_id) score += 1;
          if (c.from_number && c.to_number) score += 1;
          return sum + (score / 5);
        }, 0) / recentCalls.length : 0
    };

    return createSuccessResponse(dataQuality);

  } catch (error) {
    return createErrorResponse(`Data flow validation failed: ${error.message}`, 500);
  }
}

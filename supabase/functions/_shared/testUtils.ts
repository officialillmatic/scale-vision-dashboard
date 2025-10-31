
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { createErrorResponse, createSuccessResponse } from './corsUtils.ts';

export async function getTestAgent(supabaseClient: any) {
  const { data: testAgent, error: agentError } = await supabaseClient
    .from('agents')
    .select('retell_agent_id, id, name')
    .not('retell_agent_id', 'is', null)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (agentError || !testAgent) {
    throw new Error('No test agent found with retell_agent_id');
  }

  return testAgent;
}

export async function getTestAgentWithUserMapping(supabaseClient: any) {
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
    throw new Error('No suitable test agent found');
  }

  return testAgent;
}

export function createTestPayload(callId: string, agentId: string, isEndToEnd: boolean = false) {
  const basePayload = {
    event: 'call_ended',
    call: {
      call_id: callId,
      agent_id: agentId,
      from_number: isEndToEnd ? '+1555123456' : '+1234567890',
      to_number: isEndToEnd ? '+1555654321' : '+0987654321',
      start_timestamp: new Date(Date.now() - (isEndToEnd ? 120000 : 60000)).toISOString(),
      end_timestamp: new Date().toISOString(),
      duration: isEndToEnd ? 120 : 60,
      call_status: 'completed',
      recording_url: `https://example.com/${isEndToEnd ? 'recordings' : 'recording'}${isEndToEnd ? `/${callId}.mp3` : '.mp3'}`,
      transcript: isEndToEnd ? 'This is an end-to-end test call transcript.' : 'Test call transcript for webhook validation',
      sentiment_score: isEndToEnd ? 0.75 : 0.8,
      sentiment: 'positive',
      disposition: 'completed'
    }
  };

  if (isEndToEnd) {
    basePayload.call.transcript_url = `https://example.com/transcripts/${callId}.txt`;
  }

  return basePayload;
}

export async function sendWebhookRequest(webhookUrl: string, payload: any, retellSecret: string) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-retell-token': retellSecret,
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  return { response, result };
}

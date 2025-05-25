
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createSuccessResponse, createErrorResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[DEMO-DATA] Received ${req.method} request`);

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the first company and user for demo data
    const { data: companies, error: companiesError } = await supabaseClient
      .from('companies')
      .select('id, owner_id')
      .limit(1);

    if (companiesError || !companies || companies.length === 0) {
      return createErrorResponse('No companies found for demo data', 400);
    }

    const company = companies[0];

    // Get the first agent
    const { data: agents, error: agentsError } = await supabaseClient
      .from('agents')
      .select('id')
      .limit(1);

    if (agentsError || !agents || agents.length === 0) {
      return createErrorResponse('No agents found for demo data', 400);
    }

    const agent = agents[0];

    // Create demo call data
    const demoCall = {
      call_id: `demo_call_${Date.now()}`,
      user_id: company.owner_id,
      company_id: company.id,
      agent_id: agent.id,
      timestamp: new Date().toISOString(),
      start_time: new Date().toISOString(),
      duration_sec: 180, // 3 minutes
      cost_usd: 0.10,
      call_status: 'completed',
      from: '+1234567890',
      to: '+0987654321',
      from_number: '+1234567890',
      to_number: '+0987654321',
      call_type: 'phone_call',
      sentiment: 'positive',
      sentiment_score: 0.8,
      disposition: 'completed',
      transcript: 'This is a demo call transcript showing how the system works.',
      call_summary: 'Demo call for testing purposes'
    };

    const { data: insertedCall, error: insertError } = await supabaseClient
      .from('calls')
      .insert(demoCall)
      .select()
      .single();

    if (insertError) {
      console.error('[DEMO-DATA] Error inserting demo call:', insertError);
      return createErrorResponse(`Failed to create demo call: ${insertError.message}`, 500);
    }

    console.log('[DEMO-DATA] Successfully created demo call:', insertedCall.id);

    return createSuccessResponse({
      message: 'Demo call data created successfully',
      call: insertedCall,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DEMO-DATA] Fatal error:', error);
    return createErrorResponse(`Demo data creation failed: ${error.message}`, 500);
  }
});

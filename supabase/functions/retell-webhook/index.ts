import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/cors.ts";
import { processWebhookEvent, handleTransactionAndBalance, logWebhookResult } from "../_shared/retellEventProcessor.ts";
import { processCallCredits } from "../_shared/creditProcessor.ts";

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathname = url.pathname;

    // 🆕 NUEVO: Script de migración para procesar llamadas existentes
    if (pathname.includes('/migrate') || url.searchParams.get('action') === 'migrate') {
      console.log(`[MIGRATION] Starting existing calls processing...`);

      if (req.method !== 'POST') {
        return new Response('Method not allowed for migration', { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      // Get all calls that need processing
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select(`
          *,
          call_agent:agents!calls_agent_id_fkey(id, name, rate_per_minute)
        `)
        .gt('duration_sec', 0)  // Solo llamadas con duración
        .order('timestamp', { ascending: false });

      if (callsError) {
        console.error('[MIGRATION] Error fetching calls:', callsError);
        return new Response(JSON.stringify({ error: 'Error fetching calls', details: callsError }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[MIGRATION] Found ${calls?.length || 0} calls to process`);

      let processed = 0;
      let failed = 0;
      let skipped = 0;
      let totalDeducted = 0;
      const results = [];

      if (calls && calls.length > 0) {
        for (const call of calls) {
          try {
            console.log(`[MIGRATION] Processing call ${call.call_id} for user ${call.user_id}`);
            
            // Calcular costo correcto
            const durationMinutes = call.duration_sec / 60;
            const agentRate = call.call_agent?.rate_per_minute || 0;
            const calculatedCost = durationMinutes * agentRate;

            if (calculatedCost <= 0) {
              console.log(`[MIGRATION] Skipping call ${call.call_id} - no cost calculated`);
              skipped++;
              continue;
            }

            // Verificar si ya existe una transacción para esta llamada
            const { data: existingTransaction } = await supabase
              .from('credit_transactions')
              .select('id')
              .eq('call_id', call.call_id)
              .eq('transaction_type', 'call_charge')
              .single();

            if (existingTransaction) {
              console.log(`[MIGRATION] Skipping call ${call.call_id} - already processed`);
              skipped++;
              continue;
            }

            // Procesar créditos usando nuestro procesador corregido
            const creditResult = await processCallCredits(
              supabase,
              {
                call_id: call.call_id,
                duration_sec: call.duration_sec,
                cost_usd: call.cost_usd  // Para referencia
              },
              call.user_id,
              call.agent_id  // USAR TARIFA DEL AGENTE
            );

            if (creditResult.success) {
              processed++;
              totalDeducted += creditResult.calculatedCost || calculatedCost;
              
              results.push({
                call_id: call.call_id,
                user_id: call.user_id,
                agent_name: call.call_agent?.name || 'Unknown',
                duration_minutes: durationMinutes.toFixed(2),
                rate_per_minute: agentRate,
                calculated_cost: calculatedCost.toFixed(4),
                retell_cost: call.cost_usd,
                new_balance: creditResult.newBalance?.toFixed(2),
                status: 'success'
              });

              console.log(`[MIGRATION] ✅ Call ${call.call_id}: $${calculatedCost.toFixed(4)} deducted (was $${call.cost_usd}), new balance: $${creditResult.newBalance?.toFixed(2)}`);
            } else {
              failed++;
              results.push({
                call_id: call.call_id,
                user_id: call.user_id,
                error: creditResult.error,
                status: 'failed'
              });
              console.error(`[MIGRATION] ❌ Failed to process call ${call.call_id}:`, creditResult.error);
            }

            // Pequeña pausa para no sobrecargar la DB
            await new Promise(resolve => setTimeout(resolve, 50));

          } catch (error) {
            failed++;
            console.error(`[MIGRATION] Error processing call ${call.call_id}:`, error);
            results.push({
              call_id: call.call_id,
              error: error.message,
              status: 'error'
            });
          }
        }
      }

      const summary = {
        total_calls: calls?.length || 0,
        processed_successfully: processed,
        failed: failed,
        skipped: skipped,
        total_amount_deducted: `$${totalDeducted.toFixed(2)}`,
        processing_time_ms: Date.now() - startTime
      };

      console.log(`[MIGRATION] SUMMARY:`, summary);

      return new Response(JSON.stringify({ 
        success: true,
        summary,
        detailed_results: results.slice(0, 10), // Solo primeros 10 para no sobrecargar respuesta
        total_results_count: results.length
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

    // 📞 WEBHOOK NORMAL: Procesar llamadas de Retell
    console.log(`[WEBHOOK] Received ${req.method} request`);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    console.log(`[WEBHOOK] Processing event: ${body.event}`);

    const { event, call } = body;
    const callId = call?.call_id;

    if (!callId) {
      console.error('[WEBHOOK] No call_id found in webhook payload');
      return new Response('Bad request: missing call_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Process the webhook event
    const processedData = processWebhookEvent(event, call);
    
    // Find the agent mapping
    const { data: agent, error: agentError } = await supabase
      .from('retell_agents')
      .select('*')
      .eq('agent_id', call.agent_id)
      .single();

    if (agentError || !agent) {
      console.error(`[WEBHOOK] Agent not found for agent_id: ${call.agent_id}`);
      return new Response('Agent not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Find user assignment
    const { data: userAgent, error: userAgentError } = await supabase
      .from('user_agent_assignments')
      .select('user_id, company_id')
      .eq('agent_id', agent.id)
      .eq('is_primary', true)
      .single();

    if (userAgentError || !userAgent) {
      console.error(`[WEBHOOK] User assignment not found for agent: ${agent.id}`);
      return new Response('User assignment not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Store/update call data
    const callData = {
      call_id: callId,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      agent_id: agent.id,
      timestamp: call.start_timestamp || new Date().toISOString(),
      duration_sec: call.duration_sec || 0,
      cost_usd: call.cost_usd || 0,
      call_status: processedData.call_status,
      from: call.from_number || 'unknown',
      to: call.to_number || 'unknown',
      disconnection_reason: call.disconnection_reason,
      transcript: call.transcript,
      sentiment: call.sentiment,
      recording_url: call.recording_url
    };

    const { error: upsertError } = await supabase
      .from('retell_calls')
      .upsert(callData, { onConflict: 'call_id' });

    if (upsertError) {
      console.error('[WEBHOOK] Error upserting call data:', upsertError);
      await logWebhookResult(supabase, event, callId, agent, userAgent, callData, 'failed', startTime);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Process credits for completed calls (USANDO TARIFA CORRECTA)
    if (event === 'call_ended' && call.duration_sec > 0) {
      console.log(`[WEBHOOK] Processing credits for completed call: ${callId}`);
      
      const creditResult = await processCallCredits(
        supabase,
        call,
        userAgent.user_id,
        agent.id  // CORRECCIÓN: pasar agent.id para usar tarifa correcta
      );

      if (creditResult.error) {
        console.error(`[WEBHOOK] Credit processing failed:`, creditResult.error);
        // Don't fail the webhook if credit processing fails
      } else if (creditResult.success) {
        console.log(`[WEBHOOK] Credits processed successfully. Calculated cost: $${creditResult.calculatedCost?.toFixed(4)}, New balance: $${creditResult.newBalance?.toFixed(2)}`);
        
        // Log balance warnings
        if (creditResult.wasBlocked) {
          console.warn(`[WEBHOOK] User account blocked due to insufficient funds: ${userAgent.user_id}`);
        } else if (creditResult.isCritical) {
          console.warn(`[WEBHOOK] User has critical low balance: ${userAgent.user_id}`);
        } else if (creditResult.isLow) {
          console.warn(`[WEBHOOK] User has low balance: ${userAgent.user_id}`);
        }
      }
    }

    // Handle transaction and balance (existing logic)
    await handleTransactionAndBalance(supabase, event, call, userAgent);

    // Log successful webhook processing
    await logWebhookResult(supabase, event, callId, agent, userAgent, callData, 'success', startTime);

    console.log(`[WEBHOOK] Successfully processed ${event} for call ${callId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      event, 
      call_id: callId 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
// 🔥 CÓDIGO COMPLETO: supabase/functions/retell-webhook/index.ts
// Sistema completo de webhook con migración forzada y procesamiento automático de créditos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// ✅ FUNCIÓN PARA PROCESAR CRÉDITOS DE LLAMADAS INDIVIDUALES
async function processCallCredits(supabase: any, call: any, userId: string, agentId: string) {
  try {
    console.log(`[CREDITS] Processing credits for call ${call.call_id}, user ${userId}, agent ${agentId}`);
    
    // 1. Obtener información del agente
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error(`[CREDITS] Agent not found: ${agentId}`, agentError);
      return { success: false, error: 'Agent not found' };
    }

    // 2. Calcular el costo basado en la tarifa del agente
    const durationMinutes = call.duration_sec / 60;
    const ratePerMinute = agent.rate_per_minute || 0.30; // Tarifa por defecto
    const calculatedCost = Math.round(durationMinutes * ratePerMinute * 10000) / 10000;

    console.log(`[CREDITS] Call details: ${durationMinutes.toFixed(2)} min × $${ratePerMinute}/min = $${calculatedCost.toFixed(4)}`);

    if (calculatedCost <= 0) {
      console.log(`[CREDITS] No cost to deduct for call ${call.call_id}`);
      return { success: true, calculatedCost: 0, message: 'No cost to deduct' };
    }

    // 3. Verificar si ya existe una transacción para esta llamada
    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('id, amount')
      .eq('call_id', call.call_id)
      .eq('transaction_type', 'call_charge')
      .single();

    if (existingTransaction) {
      console.log(`[CREDITS] Transaction already exists for call ${call.call_id}`);
      return { 
        success: true, 
        calculatedCost: Math.abs(existingTransaction.amount),
        message: 'Already processed' 
      };
    }

    // 4. Obtener el balance actual del usuario
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      console.error(`[CREDITS] Error getting user balance:`, balanceError);
      return { success: false, error: 'Error getting balance' };
    }

    const currentAmount = currentBalance?.balance || 0;
    const newBalance = currentAmount - calculatedCost;

    console.log(`[CREDITS] Balance update: $${currentAmount.toFixed(4)} - $${calculatedCost.toFixed(4)} = $${newBalance.toFixed(4)}`);

    // 5. Crear transacción de cargo por llamada
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        call_id: call.call_id,
        transaction_type: 'call_charge',
        amount: -calculatedCost,
        balance_after: newBalance,
        description: `Call charge - Agent: ${agent.name} - Duration: ${durationMinutes.toFixed(2)} min`,
        metadata: {
          agent_id: agentId,
          agent_name: agent.name,
          duration_sec: call.duration_sec,
          duration_minutes: durationMinutes,
          rate_per_minute: ratePerMinute,
          retell_cost_usd: call.cost_usd || 0
        }
      });

    if (transactionError) {
      console.error(`[CREDITS] Error creating transaction:`, transactionError);
      return { success: false, error: 'Error creating transaction' };
    }

    // 6. Actualizar el balance del usuario
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[CREDITS] Error updating balance:`, updateError);
      return { success: false, error: 'Error updating balance' };
    }

    // 7. Determinar alertas de balance
    const isLow = newBalance < 10 && newBalance > 5;
    const isCritical = newBalance < 5 && newBalance > 0;
    const wasBlocked = newBalance <= 0;

    console.log(`[CREDITS] ✅ Successfully processed call ${call.call_id}: $${calculatedCost.toFixed(4)} deducted, new balance: $${newBalance.toFixed(4)}`);

    return {
      success: true,
      calculatedCost,
      newBalance,
      previousBalance: currentAmount,
      isLow,
      isCritical,
      wasBlocked,
      transactionCreated: true
    };

  } catch (error) {
    console.error(`[CREDITS] Unexpected error:`, error);
    return { success: false, error: error.message };
  }
}

// 🔥 MIGRACIÓN FORZADA PARA PROCESAR TODAS LAS LLAMADAS HISTÓRICAS
async function forceProcessAllHistoricalCalls(supabase: any) {
  console.log(`[FORCE_MIGRATION] Starting forced historical processing...`);
  
  try {
    // 1. Limpiar transacciones existentes de call_charge (opcional)
    console.log('[FORCE_MIGRATION] Clearing existing call charge transactions...');
    await supabase
      .from('credit_transactions')
      .delete()
      .eq('transaction_type', 'call_charge');

    // 2. Obtener TODAS las llamadas con duración
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('call_id, user_id, agent_id, duration_sec, cost_usd, timestamp')
      .gt('duration_sec', 0)
      .order('timestamp', { ascending: true });

    if (callsError) {
      throw new Error('Error fetching calls: ' + callsError.message);
    }

    console.log(`[FORCE_MIGRATION] Found ${calls?.length || 0} calls to process`);

    // 3. Obtener todos los agentes
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) {
      console.error('[FORCE_MIGRATION] Error fetching agents:', agentsError);
    }

    // 4. Crear mapa de agentes con tarifa por defecto
    const DEFAULT_RATE = 0.30; // $0.30 por minuto por defecto
    const agentsMap = new Map();
    
    if (agents) {
      agents.forEach(agent => {
        const rate = agent.rate_per_minute || DEFAULT_RATE;
        agentsMap.set(String(agent.id), { ...agent, rate_per_minute: rate });
      });
    }

    console.log(`[FORCE_MIGRATION] Loaded ${agentsMap.size} agents, using default rate $${DEFAULT_RATE}/min`);

    const results = {
      total_calls: calls?.length || 0,
      processed: 0,
      failed: 0,
      total_deducted: 0,
      user_summaries: {},
      errors: []
    };

    // 5. Procesar cada llamada
    if (calls && calls.length > 0) {
      for (const call of calls) {
        try {
          // Buscar agente o usar valores por defecto
          let agent = agentsMap.get(String(call.agent_id));
          if (!agent) {
            agent = {
              id: call.agent_id,
              name: `Unknown Agent (${call.agent_id})`,
              rate_per_minute: DEFAULT_RATE
            };
          }

          // Calcular costo
          const durationMinutes = call.duration_sec / 60;
          const cost = Math.round(durationMinutes * agent.rate_per_minute * 10000) / 10000;

          if (cost <= 0) {
            console.log(`[FORCE_MIGRATION] Skipping call ${call.call_id} - zero cost`);
            continue;
          }

          // Obtener balance actual del usuario
          const { data: userBalance, error: balanceError } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', call.user_id)
            .single();

          if (balanceError) {
            console.error(`[FORCE_MIGRATION] No balance found for user ${call.user_id}:`, balanceError);
            results.failed++;
            results.errors.push(`User ${call.user_id}: ${balanceError.message}`);
            continue;
          }

          const currentBalance = userBalance?.balance || 0;
          const newBalance = currentBalance - cost;

          // Crear transacción
          const { error: transError } = await supabase
            .from('credit_transactions')
            .insert({
              user_id: call.user_id,
              call_id: call.call_id,
              transaction_type: 'call_charge',
              amount: -cost,
              balance_after: newBalance,
              description: `Historical call charge - ${agent.name} - ${durationMinutes.toFixed(2)} minutes`,
              metadata: {
                agent_id: call.agent_id,
                agent_name: agent.name,
                duration_sec: call.duration_sec,
                duration_minutes: durationMinutes,
                rate_per_minute: agent.rate_per_minute,
                forced_migration: true,
                timestamp: call.timestamp
              }
            });

          if (transError) {
            console.error(`[FORCE_MIGRATION] Transaction error for call ${call.call_id}:`, transError);
            results.failed++;
            results.errors.push(`Call ${call.call_id}: ${transError.message}`);
            continue;
          }

          // Actualizar balance del usuario
          const { error: updateError } = await supabase
            .from('user_balances')
            .update({ balance: newBalance })
            .eq('user_id', call.user_id);

          if (updateError) {
            console.error(`[FORCE_MIGRATION] Balance update error for user ${call.user_id}:`, updateError);
            results.failed++;
            results.errors.push(`Balance update ${call.user_id}: ${updateError.message}`);
            continue;
          }

          // Actualizar estadísticas
          results.processed++;
          results.total_deducted += cost;

          // Resumen por usuario
          if (!results.user_summaries[call.user_id]) {
            results.user_summaries[call.user_id] = {
              total_calls: 0,
              total_cost: 0,
              final_balance: newBalance
            };
          }
          results.user_summaries[call.user_id].total_calls++;
          results.user_summaries[call.user_id].total_cost += cost;
          results.user_summaries[call.user_id].final_balance = newBalance;

          console.log(`[FORCE_MIGRATION] ✅ Call ${call.call_id}: $${cost.toFixed(4)} deducted, new balance: $${newBalance.toFixed(4)}`);

          // Pequeña pausa para no sobrecargar la DB
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`[FORCE_MIGRATION] Error processing call ${call.call_id}:`, error);
          results.failed++;
          results.errors.push(`Call ${call.call_id}: ${error.message}`);
        }
      }
    }

    return results;

  } catch (error) {
    console.error(`[FORCE_MIGRATION] Critical error:`, error);
    throw error;
  }
}

// 🚀 SERVIDOR PRINCIPAL
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
    const body = await req.json();

    console.log('[DEBUG] Request body received:', JSON.stringify(body));
    console.log('[DEBUG] URL search params:', url.searchParams.toString());

    // 🔥 MIGRACIÓN FORZADA PARA LLAMADAS HISTÓRICAS
    if (body.force_historical === true || url.searchParams.get('force_historical') === 'true') {
      console.log('[WEBHOOK] Starting FORCED historical migration...');
      
      if (req.method !== 'POST') {
        return new Response('Method not allowed for migration', { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      try {
        const results = await forceProcessAllHistoricalCalls(supabase);
        
        const summary = {
          total_calls_found: results.total_calls,
          successfully_processed: results.processed,
          failed: results.failed,
          total_amount_deducted: `$${results.total_deducted.toFixed(4)}`,
          users_affected: Object.keys(results.user_summaries).length,
          processing_time_ms: Date.now() - startTime,
          default_rate_used: '$0.30/min'
        };

        console.log('[FORCE_MIGRATION] SUMMARY:', summary);

        return new Response(JSON.stringify({
          success: true,
          forced_historical_migration: true,
          summary,
          user_summaries: results.user_summaries,
          errors: results.errors.slice(0, 10)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('[FORCE_MIGRATION] Critical error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Forced migration failed',
          details: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 🔄 MIGRACIÓN NORMAL (para compatibilidad)
    if (body.migrate === true || url.searchParams.get('migrate') === 'true') {
      console.log(`[MIGRATION] Starting regular migration...`);

      if (req.method !== 'POST') {
        return new Response('Method not allowed for migration', { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      // Redirigir a migración forzada para mejor funcionamiento
      const results = await forceProcessAllHistoricalCalls(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        migration_redirected_to_forced: true,
        summary: {
          processed_successfully: results.processed,
          failed: results.failed,
          total_amount_deducted: `$${results.total_deducted.toFixed(4)}`,
          processing_time_ms: Date.now() - startTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 📞 WEBHOOK NORMAL - Procesar llamadas de Retell en tiempo real
    console.log(`[WEBHOOK] Received ${req.method} request`);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

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

    // Buscar mapeo del agente en tu tabla retell_agents
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

    // Buscar asignación de usuario
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

    // Guardar datos de la llamada
    const callData = {
      call_id: callId,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      agent_id: agent.id,
      timestamp: call.start_timestamp || new Date().toISOString(),
      duration_sec: call.duration_sec || 0,
      cost_usd: call.cost_usd || 0,
      call_status: event === 'call_ended' ? 'completed' : 'in_progress',
      from: call.from_number || 'unknown',
      to: call.to_number || 'unknown',
      disconnection_reason: call.disconnection_reason,
      transcript: call.transcript,
      recording_url: call.recording_url
    };

    // Insertar/actualizar llamada
    const { error: upsertError } = await supabase
      .from('calls')
      .upsert(callData, { onConflict: 'call_id' });

    if (upsertError) {
      console.error('[WEBHOOK] Error saving call:', upsertError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Procesar créditos SOLO para llamadas terminadas con duración
    let creditProcessed = false;
    if (event === 'call_ended' && call.duration_sec > 0) {
      console.log(`[WEBHOOK] Processing credits for completed call: ${callId}`);
      
      const creditResult = await processCallCredits(
        supabase,
        call,
        userAgent.user_id,
        agent.id
      );

      if (creditResult.success) {
        creditProcessed = true;
        console.log(`[WEBHOOK] ✅ Credits processed: $${creditResult.calculatedCost?.toFixed(4)} deducted, balance: $${creditResult.newBalance?.toFixed(4)}`);
        
        // Log balance warnings
        if (creditResult.wasBlocked) {
          console.warn(`[WEBHOOK] User account blocked due to insufficient funds: ${userAgent.user_id}`);
        } else if (creditResult.isCritical) {
          console.warn(`[WEBHOOK] User has critical low balance: ${userAgent.user_id}`);
        } else if (creditResult.isLow) {
          console.warn(`[WEBHOOK] User has low balance: ${userAgent.user_id}`);
        }
      } else {
        console.error(`[WEBHOOK] ❌ Credit processing failed:`, creditResult.error);
      }
    }

    console.log(`[WEBHOOK] Successfully processed ${event} for call ${callId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      event, 
      call_id: callId,
      credits_processed: creditProcessed,
      processing_time_ms: Date.now() - startTime
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
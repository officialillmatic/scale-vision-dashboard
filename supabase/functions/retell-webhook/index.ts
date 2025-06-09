// 🔥 WEBHOOK ADAPTADO A TU ESTRUCTURA EXISTENTE
// Reemplaza tu archivo: supabase/functions/retell-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/cors.ts";

// ✅ FUNCIÓN PARA PROCESAR CRÉDITOS (adaptada a tus tablas)
async function processCallCredits(supabase: any, call: any, userId: string, agentId: string) {
  try {
    console.log(`[CREDITS] Processing credits for call ${call.call_id}, user ${userId}, agent ${agentId}`);
    
    // 1. Obtener información del agente desde TU tabla 'agents'
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error(`[CREDITS] Agent not found: ${agentId}`, agentError);
      return { success: false, error: 'Agent not found' };
    }

    // 2. Calcular el costo real basado en la tarifa del agente
    const durationMinutes = call.duration_sec / 60;
    const ratePerMinute = agent.rate_per_minute || 0;
    const calculatedCost = Math.round(durationMinutes * ratePerMinute * 10000) / 10000; // 4 decimales

    console.log(`[CREDITS] Call details: ${durationMinutes.toFixed(2)} min × $${ratePerMinute}/min = $${calculatedCost.toFixed(4)}`);

    if (calculatedCost <= 0) {
      console.log(`[CREDITS] No cost to deduct for call ${call.call_id}`);
      return { success: true, calculatedCost: 0, message: 'No cost to deduct' };
    }

    // 3. Verificar si ya existe una transacción para esta llamada en TU tabla
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

    // 4. Obtener el balance actual del usuario desde TU tabla
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

    // 5. Crear transacción de cargo por llamada en TU tabla
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        call_id: call.call_id,
        transaction_type: 'call_charge',
        amount: -calculatedCost, // Negativo porque es un cargo
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

    // 6. Actualizar el balance del usuario en TU tabla
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
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

// ✅ MIGRACIÓN ADAPTADA A TUS TABLAS
async function processMigration(supabase: any) {
  console.log(`[MIGRATION] Starting migration with your existing structure...`);
  
  // 1. Obtener todas las llamadas de TU tabla 'calls'
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select(`
      call_id,
      user_id,
      agent_id,
      duration_sec,
      cost_usd,
      timestamp,
      call_status
    `)
    .gt('duration_sec', 0)
    .order('timestamp', { ascending: true });

  if (callsError) {
    console.error('[MIGRATION] Error fetching calls:', callsError);
    throw new Error('Failed to fetch calls');
  }

  // 2. Obtener todos los agentes de TU tabla 'agents'
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, rate_per_minute');

  if (agentsError) {
    console.error('[MIGRATION] Error fetching agents:', agentsError);
    throw new Error('Failed to fetch agents');
  }

  const agentsMap = new Map(agents?.map(agent => [agent.id, agent]) || []);

  // 3. Obtener transacciones existentes de TU tabla 'credit_transactions'
  const { data: existingTransactions, error: transError } = await supabase
    .from('credit_transactions')
    .select('call_id')
    .eq('transaction_type', 'call_charge');

  const processedCallIds = new Set(
    existingTransactions?.map(t => t.call_id) || []
  );

  console.log(`[MIGRATION] Found ${calls?.length || 0} total calls`);
  console.log(`[MIGRATION] Found ${agents?.length || 0} agents`);
  console.log(`[MIGRATION] ${processedCallIds.size} calls already processed`);

  const results = {
    total: calls?.length || 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    totalDeducted: 0,
    details: []
  };

  // 4. Procesar cada llamada
  if (calls && calls.length > 0) {
    for (const call of calls) {
      try {
        // Skip si ya fue procesada
        if (processedCallIds.has(call.call_id)) {
          results.skipped++;
          console.log(`[MIGRATION] Skipping already processed call: ${call.call_id}`);
          continue;
        }

        // Skip si no tiene agente válido
        const agent = agentsMap.get(call.agent_id);
        if (!agent) {
          results.skipped++;
          console.log(`[MIGRATION] Skipping call with unknown agent: ${call.call_id} (agent: ${call.agent_id})`);
          continue;
        }

        // Skip si no tiene rate válido
        if (!agent.rate_per_minute || agent.rate_per_minute <= 0) {
          results.skipped++;
          console.log(`[MIGRATION] Skipping call with no rate: ${call.call_id} (agent: ${agent.name})`);
          continue;
        }

        // Procesar créditos
        const creditResult = await processCallCredits(
          supabase,
          call,
          call.user_id,
          call.agent_id
        );

        if (creditResult.success) {
          results.processed++;
          results.totalDeducted += creditResult.calculatedCost || 0;
          
          results.details.push({
            call_id: call.call_id,
            user_id: call.user_id,
            agent_name: agent.name,
            duration_minutes: (call.duration_sec / 60).toFixed(2),
            rate_per_minute: agent.rate_per_minute,
            calculated_cost: creditResult.calculatedCost?.toFixed(4),
            new_balance: creditResult.newBalance?.toFixed(4),
            status: 'success'
          });

          console.log(`[MIGRATION] ✅ Call ${call.call_id}: $${creditResult.calculatedCost?.toFixed(4)} deducted`);
        } else {
          results.failed++;
          results.details.push({
            call_id: call.call_id,
            user_id: call.user_id,
            agent_name: agent.name,
            error: creditResult.error,
            status: 'failed'
          });
          console.error(`[MIGRATION] ❌ Failed call ${call.call_id}:`, creditResult.error);
        }

        // Pausa para no sobrecargar la DB
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        console.error(`[MIGRATION] Error processing call ${call.call_id}:`, error);
      }
    }
  }

  return results;
}

// ✅ SERVIDOR PRINCIPAL
serve(async (req) => {
  const startTime = Date.now();
  
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

    // 🔄 MIGRACIÓN
    if (body.migrate === true || url.searchParams.get('migrate') === 'true') {
      if (req.method !== 'POST') {
        return new Response('Method not allowed for migration', { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      const migrationResults = await processMigration(supabase);
      
      const summary = {
        ...migrationResults,
        total_amount_deducted: `$${migrationResults.totalDeducted.toFixed(4)}`,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      console.log('[MIGRATION] FINAL SUMMARY:', summary);

      return new Response(JSON.stringify({
        success: true,
        summary,
        detailed_results: migrationResults.details.slice(0, 20),
        total_results_count: migrationResults.details.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 📞 WEBHOOK NORMAL
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { event, call } = body;
    const callId = call?.call_id;

    if (!callId) {
      console.error('[WEBHOOK] No call_id found in webhook payload');
      return new Response('Bad request: missing call_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`[WEBHOOK] Processing ${event} for call ${callId}`);

    // Buscar mapeo del agente en TU tabla 'retell_agents'
    const { data: agent, error: agentError } = await supabase
      .from('retell_agents')
      .select('*')
      .eq('agent_id', call.agent_id)
      .single();

    if (agentError || !agent) {
      console.error(`[WEBHOOK] Agent not found: ${call.agent_id}`);
      return new Response('Agent not found', { status: 404, headers: corsHeaders });
    }

    // Buscar asignación de usuario en TU tabla 'user_agent_assignments'
    const { data: userAgent, error: userAgentError } = await supabase
      .from('user_agent_assignments')
      .select('user_id, company_id')
      .eq('agent_id', agent.id)
      .eq('is_primary', true)
      .single();

    if (userAgentError || !userAgent) {
      console.error(`[WEBHOOK] User assignment not found for agent: ${agent.id}`);
      return new Response('User assignment not found', { status: 404, headers: corsHeaders });
    }

    // Guardar datos de la llamada en TU tabla 'calls'
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
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    // Procesar créditos SOLO para llamadas terminadas con duración
    if (event === 'call_ended' && call.duration_sec > 0) {
      console.log(`[WEBHOOK] Processing credits for completed call: ${callId}`);
      
      const creditResult = await processCallCredits(
        supabase,
        call,
        userAgent.user_id,
        agent.id
      );

      if (creditResult.success) {
        console.log(`[WEBHOOK] ✅ Credits processed: $${creditResult.calculatedCost?.toFixed(4)} deducted, balance: $${creditResult.newBalance?.toFixed(4)}`);
      } else {
        console.error(`[WEBHOOK] ❌ Credit processing failed:`, creditResult.error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      event, 
      call_id: callId,
      credits_processed: event === 'call_ended' && call.duration_sec > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
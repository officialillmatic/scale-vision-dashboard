// 🔥 WEBHOOK COMPLETAMENTE CORREGIDO PARA user_credits
// Reemplaza tu archivo retell-webhook/index.ts con este código

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// ✅ FUNCIÓN CORREGIDA PARA PROCESAR CRÉDITOS
async function processCallCredits(supabase: any, call: any, userId: string, agentId: string) {
  try {
    console.log(`[CREDITS] Processing credits for call ${call.call_id}, user ${userId}, agent ${agentId}`);
    
    // 1. Verificar si ya existe una transacción para esta llamada
    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('id, amount')
      .eq('call_id', call.call_id)
      .eq('transaction_type', 'call_charge_auto')
      .single();

    if (existingTransaction) {
      console.log(`[CREDITS] Transaction already exists for call ${call.call_id}`);
      return { 
        success: true, 
        calculatedCost: Math.abs(existingTransaction.amount),
        message: 'Already processed' 
      };
    }

    // 2. Obtener el balance actual del usuario (CORREGIDO)
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_credits')        // ✅ TABLA CORRECTA
      .select('current_balance')   // ✅ COLUMNA CORRECTA
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      console.error(`[CREDITS] Error getting user balance:`, balanceError);
      return { success: false, error: 'Error getting balance' };
    }

    const currentAmount = currentBalance?.current_balance || 0; // ✅ CORREGIDO

    // 3. Usar el costo de Retell directamente (más confiable)
    const calculatedCost = call.cost_usd || 0;
    const newBalance = currentAmount - calculatedCost;

    console.log(`[CREDITS] Balance update: $${currentAmount.toFixed(4)} - $${calculatedCost.toFixed(4)} = $${newBalance.toFixed(4)}`);

    if (calculatedCost <= 0) {
      console.log(`[CREDITS] No cost to deduct for call ${call.call_id}`);
      return { success: true, calculatedCost: 0, message: 'No cost to deduct' };
    }

    // 4. Crear transacción de cargo por llamada (SIN metadata)
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        call_id: call.call_id,
        transaction_type: 'call_charge_auto',
        amount: -calculatedCost,
        balance_after: newBalance,
        description: `Auto call charge - ${call.call_id} - ${(call.duration_sec/60).toFixed(2)} min`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error(`[CREDITS] Error creating transaction:`, transactionError);
      return { success: false, error: 'Error creating transaction' };
    }

    // 5. Actualizar el balance del usuario (CORREGIDO)
    const { error: updateError } = await supabase
      .from('user_credits')                        // ✅ TABLA CORRECTA
      .update({ current_balance: newBalance })     // ✅ COLUMNA CORRECTA
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[CREDITS] Error updating balance:`, updateError);
      return { success: false, error: 'Error updating balance' };
    }

    // 6. Determinar alertas de balance
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

// 🚀 SERVIDOR PRINCIPAL
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

    console.log('[WEBHOOK] Request received:', JSON.stringify(body));

    // 📞 WEBHOOK NORMAL - Procesar llamadas de Retell
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { event, call } = body;
    const callId = call?.call_id;

    // Log del evento
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: event,
        call_id: callId,
        agent_id: call?.agent_id,
        cost_usd: call?.cost_usd,
        duration_sec: call?.duration_sec,
        created_at: new Date().toISOString()
      });

    console.log(`[WEBHOOK] Processing event: ${event} for call ${callId}`);

    // Solo procesar llamadas terminadas con duración y costo
    if (event === 'call_ended' && call?.duration_sec > 0 && call?.cost_usd > 0) {
      console.log(`[WEBHOOK] Processing completed call: ${callId}`);

      // Buscar mapeo del agente
      const { data: agent, error: agentError } = await supabase
        .from('retell_agents')
        .select('*')
        .eq('agent_id', call.agent_id)
        .single();

      if (agentError || !agent) {
        console.error(`[WEBHOOK] Agent not found for agent_id: ${call.agent_id}`);
        return new Response(JSON.stringify({
          success: false,
          error: 'Agent not found',
          call_id: callId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        return new Response(JSON.stringify({
          success: false,
          error: 'User assignment not found',
          call_id: callId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        call_status: 'completed',
        from: call.from_number || 'unknown',
        to: call.to_number || 'unknown',
        disconnection_reason: call.disconnection_reason,
        transcript: call.transcript,
        recording_url: call.recording_url
      };

      const { error: upsertError } = await supabase
        .from('calls')
        .upsert(callData, { onConflict: 'call_id' });

      if (upsertError) {
        console.error('[WEBHOOK] Error saving call:', upsertError);
      }

      // Procesar créditos
      const creditResult = await processCallCredits(
        supabase,
        call,
        userAgent.user_id,
        agent.id
      );

      if (creditResult.success) {
        console.log(`[WEBHOOK] ✅ Credits processed: $${creditResult.calculatedCost?.toFixed(4)} deducted, balance: $${creditResult.newBalance?.toFixed(4)}`);
        
        // Alertas de balance
        if (creditResult.wasBlocked) {
          console.warn(`[WEBHOOK] 🚨 User account blocked: ${userAgent.user_id}`);
        } else if (creditResult.isCritical) {
          console.warn(`[WEBHOOK] ⚠️ Critical low balance: ${userAgent.user_id}`);
        } else if (creditResult.isLow) {
          console.warn(`[WEBHOOK] ⚠️ Low balance: ${userAgent.user_id}`);
        }
      } else {
        console.error(`[WEBHOOK] ❌ Credit processing failed:`, creditResult.error);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        event, 
        call_id: callId,
        user_id: userAgent.user_id,
        credits_processed: creditResult.success,
        new_balance: creditResult.newBalance,
        processing_time_ms: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      console.log(`[WEBHOOK] Ignoring event: ${event} (not a completed call with cost)`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        event,
        message: 'Event received but not processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
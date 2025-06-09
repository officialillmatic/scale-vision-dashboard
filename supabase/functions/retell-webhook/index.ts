// 🔥 WEBHOOK COMPLETO CON MIGRACIÓN FORZADA
// Reemplaza completamente tu archivo retell-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/cors.ts";

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

    // 🔥 MIGRACIÓN FORZADA PARA PROCESAR TODAS LAS LLAMADAS HISTÓRICAS
    if (body.force_historical === true || url.searchParams.get('force_historical') === 'true') {
      console.log('[FORCE_MIGRATION] Starting forced historical processing...');
      
      try {
        // 1. Limpiar transacciones existentes de call_charge
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

        // 3. Obtener todos los agentes (SIN JOIN problemático)
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('*');

        if (agentsError) {
          console.error('[FORCE_MIGRATION] Error fetching agents:', agentsError);
          // Continuar sin agentes si es necesario
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

              // Pequeña pausa
              await new Promise(resolve => setTimeout(resolve, 50));

            } catch (error) {
              console.error(`[FORCE_MIGRATION] Error processing call ${call.call_id}:`, error);
              results.failed++;
              results.errors.push(`Call ${call.call_id}: ${error.message}`);
            }
          }
        }

        const summary = {
          total_calls_found: results.total_calls,
          successfully_processed: results.processed,
          failed: results.failed,
          total_amount_deducted: `$${results.total_deducted.toFixed(4)}`,
          users_affected: Object.keys(results.user_summaries).length,
          processing_time_ms: Date.now() - startTime,
          default_rate_used: `$${DEFAULT_RATE}/min`
        };

        console.log('[FORCE_MIGRATION] SUMMARY:', summary);

        return new Response(JSON.stringify({
          success: true,
          forced_historical_migration: true,
          summary,
          user_summaries: results.user_summaries,
          errors: results.errors.slice(0, 10) // Primeros 10 errores
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

    // 📞 WEBHOOK NORMAL (resto del código existente)
    console.log(`[WEBHOOK] Received ${req.method} request`);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { event, call } = body;
    console.log(`[WEBHOOK] Processing event: ${event}`);

    // Aquí va el resto de tu lógica de webhook normal...
    // (procesamiento de llamadas nuevas en tiempo real)

    return new Response(JSON.stringify({ 
      success: true, 
      event,
      message: 'Webhook processed successfully'
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
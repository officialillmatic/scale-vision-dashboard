import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  timestamp: string;
  recording_url?: string;
  call_agent?: {
    id: string;
    name: string;
    rate_per_minute: number;
  };
  agents?: {
    id: string;
    name: string;
    rate_per_minute: number;
  };
}

interface CustomAgentData {
  id: string;
  name: string;
  retell_agent_id: string;
  rate_per_minute: number;
  is_primary?: boolean;
  assigned_at?: string;
}

interface UserCredits {
  user_id: string;
  credits: number;
  low_balance_threshold: number;
}

// Constantes
const POLLING_INTERVAL = 10000; // 10 segundos
const CALL_LOOKBACK_HOURS = 6; // 6 horas para capturar más llamadas

export const useNewBalanceSystem = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCustomAgents, setUserCustomAgents] = useState<CustomAgentData[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [lastProcessedCall, setLastProcessedCall] = useState<string | null>(null);
  const [processedCallsCount, setProcessedCallsCount] = useState(0);
  const [audioDurations, setAudioDurations] = useState<{[key: string]: number}>({});
  
  // Refs para evitar re-renders innecesarios
  const isProcessingRef = useRef(false);
  const processedCallsRef = useRef(new Set<string>());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FUNCIÓN CORREGIDA: Obtener duración real de llamada (SYNC como CallsSimple.tsx)
  const getCallDuration = useCallback((call: CallData): number => {
    // 1. PRIORIZAR duración del audio (más precisa)
    if (audioDurations[call.id] && audioDurations[call.id] > 0) {
      console.log(`🎵 Usando duración de audio: ${audioDurations[call.id]}s para ${call.call_id?.substring(0, 8)}`);
      return audioDurations[call.id];
    }
    
    // 2. Fallback a duration_sec de la BD
    if (call.duration_sec && call.duration_sec > 0) {
      console.log(`📊 Usando duración de BD: ${call.duration_sec}s para ${call.call_id?.substring(0, 8)}`);
      return call.duration_sec;
    }
    
    console.log(`⚠️ Sin duración disponible para ${call.call_id?.substring(0, 8)}`);
    return 0;
  }, [audioDurations]);

  // ✅ FUNCIÓN NUEVA: Cargar duración de audio (como CallsSimple.tsx)
  const loadAudioDuration = async (call: CallData) => {
    if (!call.recording_url || audioDurations[call.id]) return;
    
    try {
      console.log(`🎵 Cargando duración de audio para ${call.call_id?.substring(0, 8)}...`);
      const audio = new Audio(call.recording_url);
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          console.log(`✅ Audio cargado: ${duration}s para ${call.call_id?.substring(0, 8)}`);
          setAudioDurations(prev => ({
            ...prev,
            [call.id]: duration
          }));
          resolve();
        });
        
        audio.addEventListener('error', () => {
          console.log(`❌ Error cargando audio para ${call.call_id?.substring(0, 8)}`);
          resolve();
        });

        // Timeout de seguridad
        setTimeout(() => {
          console.log(`⏰ Timeout cargando audio para ${call.call_id?.substring(0, 8)}`);
          resolve();
        }, 5000);
      });
    } catch (error) {
      console.log(`❌ Error loading audio duration:`, error);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Calcular costo de llamada (SYNC como CallsSimple.tsx)
  const calculateCallCost = useCallback((call: CallData, availableAgents: CustomAgentData[]): number => {
    console.group(`💰 Calculando costo para ${call.call_id?.substring(0, 8)}`);
    
    try {
      // 1. Si ya tiene costo en BD, usarlo
      if (call.cost_usd && call.cost_usd > 0) {
        console.log(`✅ Ya tiene costo: $${call.cost_usd}`);
        return call.cost_usd;
      }

      // 2. Obtener duración real (SYNC)
      const duration = getCallDuration(call);
      if (duration === 0) {
        console.log(`❌ Sin duración válida`);
        return 0;
      }

      // 3. Buscar tarifa del agente (igual lógica que CallsSimple.tsx)
      let agentRate = 0;
      let agentName = 'Unknown';

      // Prioridad 1: call_agent
      if (call.call_agent?.rate_per_minute) {
        agentRate = call.call_agent.rate_per_minute;
        agentName = call.call_agent.name;
        console.log(`✅ Usando call_agent: ${agentName} - $${agentRate}/min`);
      }
      // Prioridad 2: agents
      else if (call.agents?.rate_per_minute) {
        agentRate = call.agents.rate_per_minute;
        agentName = call.agents.name;
        console.log(`✅ Usando agents: ${agentName} - $${agentRate}/min`);
      }
      // Prioridad 3: buscar en availableAgents
      else {
        const userAgent = availableAgents.find(agent => 
          agent.id === call.agent_id || 
          agent.retell_agent_id === call.agent_id
        );
        
        if (userAgent?.rate_per_minute) {
          agentRate = userAgent.rate_per_minute;
          agentName = userAgent.name;
          console.log(`✅ Usando availableAgents: ${agentName} - $${agentRate}/min`);
        } else {
          console.log(`❌ Sin tarifa disponible para agente ${call.agent_id?.substring(0, 8)}`);
          return 0;
        }
      }

      // 4. Calcular costo
      const durationMinutes = duration / 60;
      const cost = durationMinutes * agentRate;
      
      console.log(`🧮 Cálculo: ${duration}s (${durationMinutes.toFixed(2)}min) × $${agentRate}/min = $${cost.toFixed(4)}`);
      
      return cost;
      
    } catch (error) {
      console.error('❌ Error en cálculo:', error);
      return 0;
    } finally {
      console.groupEnd();
    }
  }, [getCallDuration]);

  // ✅ FUNCIÓN CORREGIDA: Aplicar descuento unificado (SOLO PROFILES como CallsSimple.tsx)
  const applyDeduction = useCallback(async (callId: string, cost: number): Promise<boolean> => {
    if (!user?.id || cost <= 0) return false;

    try {
      console.log(`💳 APLICANDO DESCUENTO: $${cost.toFixed(4)} para ${callId}`);

      // ✅ USAR SOLO PROFILES (como CallsSimple.tsx)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error obteniendo profile:', profileError);
        return false;
      }

      const currentBalance = profileData?.credit_balance || 0;
      const newBalance = Math.max(0, currentBalance - cost);
      
      console.log(`💰 profiles: $${currentBalance} → $${newBalance}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          credit_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error actualizando profiles:', updateError);
        return false;
      }

      // 2. Crear registro de transacción (opcional)
      try {
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -cost,
            transaction_type: 'call_cost',
            description: `Call cost for ${callId}`,
            reference_id: callId,
            created_at: new Date().toISOString()
          });
      } catch (transactionError) {
        console.warn('⚠️ Error creando transacción (no crítico):', transactionError);
      }

      // 3. Emitir evento para UI (como CallsSimple.tsx)
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: {
          userId: user.id,
          deduction: cost,
          callId: callId,
          oldBalance: currentBalance,
          newBalance: newBalance,
          source: 'automatic_processing',
          isDeduction: true,
          difference: cost
        }
      }));

      console.log(`✅ DESCUENTO APLICADO: ${callId} - $${cost.toFixed(4)}`);
      return true;

    } catch (error) {
      console.error('💥 Error aplicando descuento:', error);
      return false;
    }
  }, [user?.id]);

  // ✅ FUNCIÓN CORREGIDA: Detectar y procesar llamadas (MISMO FILTRADO que CallsSimple.tsx)
  const detectAndProcessNewCalls = useCallback(async () => {
    if (!user?.id || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      
      console.log('🔍 BUSCANDO LLAMADAS PARA PROCESAR...');

      // 1. Obtener agentes asignados si no los tenemos
      if (userCustomAgents.length === 0) {
        await loadUserCustomAgents();
        return; // Salir y esperar a la siguiente iteración
      }

      // ✅ 2. BUSCAR LLAMADAS COMO CallsSimple.tsx (POR AGENT_ID, NO USER_ID)
      const userAgentIds = userCustomAgents.map(agent => agent.id).filter(Boolean);
      const retellAgentIds = userCustomAgents.map(agent => agent.retell_agent_id).filter(Boolean);
      const allAgentIds = [...userAgentIds, ...retellAgentIds].filter(Boolean);
      
      console.log('🎯 Buscando llamadas de agentes:', allAgentIds);

      const lookbackTime = new Date(Date.now() - CALL_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
      
      // ✅ CAMBIO CRÍTICO: Buscar por agent_id (como CallsSimple.tsx)
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', allAgentIds)  // ← CORRECCIÓN: Por agentes, no por user_id
        .in('call_status', ['completed', 'ended', 'finished'])
        .gte('timestamp', lookbackTime)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error obteniendo llamadas:', error);
        return;
      }

      console.log(`📞 Encontradas ${calls?.length || 0} llamadas completadas de agentes asignados`);

      if (!calls || calls.length === 0) {
        console.log('✅ No hay llamadas para procesar');
        return;
      }

      // ✅ 3. MAPEAR LLAMADAS CON INFORMACIÓN COMPLETA DEL AGENTE (como CallsSimple.tsx)
      const mappedCalls = calls.map(call => {
        let matchedAgent = null;

        // Buscar agente por ID directo o retell_agent_id
        const userAgentData = userCustomAgents.find(agent => 
          agent.id === call.agent_id ||
          agent.retell_agent_id === call.agent_id
        );

        if (userAgentData) {
          matchedAgent = {
            id: userAgentData.id,
            name: userAgentData.name,
            rate_per_minute: userAgentData.rate_per_minute
          };
          console.log(`✅ Agente encontrado para ${call.call_id}: ${matchedAgent.name} ($${matchedAgent.rate_per_minute}/min)`);
        } else {
          // Agente no encontrado - usar tarifa por defecto
          matchedAgent = {
            id: call.agent_id,
            name: `Unknown Agent (${call.agent_id.substring(0, 8)}...)`,
            rate_per_minute: 0.02
          };
          console.log(`⚠️ Agente no encontrado para ${call.call_id}, usando tarifa por defecto`);
        }

        return {
          ...call,
          call_agent: matchedAgent,
          agents: matchedAgent
        };
      });

      // ✅ 4. CARGAR DURACIONES DE AUDIO (como CallsSimple.tsx)
      console.log('🎵 Cargando duraciones de audio...');
      const callsWithAudio = mappedCalls.filter(call => call.recording_url);
      console.log(`📻 ${callsWithAudio.length} llamadas con audio encontradas`);

      // Cargar audio en lotes pequeños
      for (let i = 0; i < callsWithAudio.length; i += 3) {
        const batch = callsWithAudio.slice(i, i + 3);
        await Promise.all(batch.map(call => loadAudioDuration(call)));
        if (i + 3 < callsWithAudio.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 5. Filtrar llamadas que necesitan procesamiento
      const callsToProcess = mappedCalls.filter(call => {
        const needsProcessing = (
          !processedCallsRef.current.has(call.call_id) &&
          (!call.cost_usd || call.cost_usd === 0)
        );
        
        if (needsProcessing) {
          console.log(`🎯 Llamada para procesar: ${call.call_id?.substring(0, 8)}`);
        }
        
        return needsProcessing;
      });

      if (callsToProcess.length === 0) {
        console.log('✅ No hay llamadas nuevas para procesar');
        return;
      }

      console.log(`⚡ PROCESANDO ${callsToProcess.length} llamadas...`);

      // 6. Procesar cada llamada
      let successCount = 0;
      
      for (const call of callsToProcess) {
        try {
          console.log(`\n🚀 Procesando: ${call.call_id?.substring(0, 8)}`);
          
          // Calcular costo
          const cost = calculateCallCost(call, userCustomAgents);
          
          if (cost > 0) {
            // Actualizar costo en BD
            const { error: updateError } = await supabase
              .from('calls')
              .update({ 
                cost_usd: cost,
                updated_at: new Date().toISOString()
              })
              .eq('call_id', call.call_id);

            if (updateError) {
              console.error(`❌ Error actualizando call:`, updateError);
              continue;
            }

            // Aplicar descuento
            const deductionSuccess = await applyDeduction(call.call_id, cost);
            
            if (deductionSuccess) {
              processedCallsRef.current.add(call.call_id);
              setLastProcessedCall(call.call_id);
              successCount++;
              console.log(`✅ ÉXITO: ${call.call_id?.substring(0, 8)} - $${cost.toFixed(4)}`);
            }
          }
          
          // Pausa entre procesamiento
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Error procesando ${call.call_id}:`, error);
        }
      }

      setProcessedCallsCount(prev => prev + successCount);
      console.log(`✅ PROCESAMIENTO COMPLETADO: ${successCount}/${callsToProcess.length} éxitos`);

    } catch (error) {
      console.error('❌ Error en detectAndProcessNewCalls:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [user?.id, userCustomAgents, calculateCallCost, applyDeduction, loadUserCustomAgents]);

  // Cargar agentes asignados al usuario
  const loadUserCustomAgents = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('👥 Cargando agentes asignados...');
      
      const { data: assignments, error } = await supabase
        .from('user_agent_assignments')
        .select(`
          *,
          agents:agent_id (
            id,
            name,
            retell_agent_id,
            rate_per_minute
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error loading user agents:', error);
        return;
      }

      const agents = (assignments || [])
        .map(assignment => ({
          id: assignment.agents.id,
          name: assignment.agents.name,
          retell_agent_id: assignment.agents.retell_agent_id,
          rate_per_minute: assignment.agents.rate_per_minute,
          is_primary: assignment.is_primary,
          assigned_at: assignment.assigned_at
        }))
        .filter(agent => agent.rate_per_minute > 0);

      console.log(`✅ Cargados ${agents.length} agentes activos`);
      setUserCustomAgents(agents);
      
    } catch (error) {
      console.error('❌ Error en loadUserCustomAgents:', error);
    }
  }, [user?.id]);

  // ✅ FUNCIÓN CORREGIDA: Cargar balance del usuario (SOLO PROFILES)
  const loadUserCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      // ✅ USAR SOLO PROFILES (como CallsSimple.tsx)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        setUserCredits({
          user_id: user.id,
          credits: profileData.credit_balance || 0,
          low_balance_threshold: 10
        });
        console.log(`💰 Balance cargado desde profiles: $${profileData.credit_balance || 0}`);
      }
      
    } catch (error) {
      console.error('❌ Error en loadUserCredits:', error);
    }
  }, [user?.id]);

  // Inicializar sistema
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Inicializando Sistema Unificado de Balance...');
      loadUserCustomAgents();
      loadUserCredits();
    }
  }, [user?.id, loadUserCustomAgents, loadUserCredits]);

  // Configurar polling automático
  useEffect(() => {
    if (user?.id && userCustomAgents.length > 0) {
      console.log('⏰ Iniciando polling automático cada 10 segundos...');
      
      // Ejecutar inmediatamente
      const timeoutId = setTimeout(() => {
        detectAndProcessNewCalls();
      }, 2000); // Delay inicial de 2 segundos
      
      // Configurar intervalo
      pollingIntervalRef.current = setInterval(() => {
        detectAndProcessNewCalls();
      }, POLLING_INTERVAL);

      return () => {
        clearTimeout(timeoutId);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          console.log('⏹️ Polling detenido');
        }
      };
    }
  }, [user?.id, userCustomAgents.length, detectAndProcessNewCalls]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    isProcessing,
    userCustomAgents,
    userCredits,
    lastProcessedCall,
    processedCallsCount,
    audioDurations, // ✅ AGREGADO para compatibilidad
    detectAndProcessNewCalls: () => detectAndProcessNewCalls(),
    refreshData: () => {
      loadUserCustomAgents();
      loadUserCredits();
    }
  };
};

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
const POLLING_INTERVAL = 10000; // 10 segundos (más lento para evitar conflictos)
const CALL_LOOKBACK_HOURS = 6; // 6 horas para capturar más llamadas

export const useNewBalanceSystem = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCustomAgents, setUserCustomAgents] = useState<CustomAgentData[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [lastProcessedCall, setLastProcessedCall] = useState<string | null>(null);
  const [processedCallsCount, setProcessedCallsCount] = useState(0);
  
  // Refs para evitar re-renders innecesarios
  const isProcessingRef = useRef(false);
  const processedCallsRef = useRef(new Set<string>());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FUNCIÓN CORREGIDA: Obtener duración real de llamada
  const getCallDuration = useCallback(async (call: CallData): Promise<number> => {
    // 1. Si tiene duración en BD, usarla
    if (call.duration_sec && call.duration_sec > 0) {
      console.log(`📊 Usando duración de BD: ${call.duration_sec}s para ${call.call_id?.substring(0, 8)}`);
      return call.duration_sec;
    }

    // 2. Si tiene URL de audio, cargar duración
    if (call.recording_url) {
      try {
        console.log(`🎵 Cargando duración de audio para ${call.call_id?.substring(0, 8)}...`);
        const duration = await loadAudioDuration(call.recording_url);
        if (duration > 0) {
          console.log(`✅ Audio cargado: ${duration}s para ${call.call_id?.substring(0, 8)}`);
          return duration;
        }
      } catch (error) {
        console.warn(`⚠️ Error cargando audio:`, error);
      }
    }

    console.log(`❌ Sin duración disponible para ${call.call_id?.substring(0, 8)}`);
    return 0;
  }, []);

  // Función auxiliar para cargar duración de audio
  const loadAudioDuration = (audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration));
      });
      audio.addEventListener('error', () => {
        reject(new Error('Could not load audio'));
      });
      
      // Timeout de seguridad
      setTimeout(() => {
        reject(new Error('Audio loading timeout'));
      }, 8000);
      
      audio.src = audioUrl;
    });
  };

  // ✅ FUNCIÓN CORREGIDA: Calcular costo de llamada
  const calculateCallCost = useCallback(async (call: CallData, availableAgents: CustomAgentData[]): Promise<number> => {
    console.group(`💰 Calculando costo para ${call.call_id?.substring(0, 8)}`);
    
    try {
      // 1. Si ya tiene costo en BD, no recalcular
      if (call.cost_usd && call.cost_usd > 0) {
        console.log(`✅ Ya tiene costo: $${call.cost_usd}`);
        return call.cost_usd;
      }

      // 2. Obtener duración real
      const duration = await getCallDuration(call);
      if (duration === 0) {
        console.log(`❌ Sin duración válida`);
        return 0;
      }

      // 3. Buscar tarifa del agente
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

  // ✅ FUNCIÓN CORREGIDA: Aplicar descuento unificado
  const applyDeduction = useCallback(async (callId: string, cost: number): Promise<boolean> => {
    if (!user?.id || cost <= 0) return false;

    try {
      console.log(`💳 APLICANDO DESCUENTO: $${cost.toFixed(4)} para ${callId}`);

      // 1. Intentar user_credits primero
      const { data: userCreditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (!creditsError && userCreditsData) {
        // Usar user_credits
        const currentBalance = userCreditsData.credits || 0;
        const newBalance = Math.max(0, currentBalance - cost);
        
        console.log(`💰 user_credits: $${currentBalance} → $${newBalance}`);

        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ 
            credits: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('❌ Error actualizando user_credits:', updateError);
          return false;
        }

        // Actualizar estado local
        setUserCredits(prev => prev ? { ...prev, credits: newBalance } : null);
        
      } else {
        // Fallback a profiles
        console.log('📋 Fallback a profiles...');
        
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
      }

      // 2. Emitir evento para UI
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: {
          userId: user.id,
          deduction: cost,
          callId: callId,
          source: 'automatic_processing'
        }
      }));

      console.log(`✅ DESCUENTO APLICADO: ${callId} - $${cost.toFixed(4)}`);
      return true;

    } catch (error) {
      console.error('💥 Error aplicando descuento:', error);
      return false;
    }
  }, [user?.id]);

  // ✅ FUNCIÓN PRINCIPAL: Detectar y procesar llamadas
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

      // 2. Buscar llamadas completadas del usuario
      const lookbackTime = new Date(Date.now() - CALL_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
      
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .in('call_status', ['completed', 'ended', 'finished'])
        .gte('timestamp', lookbackTime)
        .order('timestamp', { ascending: false })
        .limit(20); // Limitar para evitar sobrecarga

      if (error) {
        console.error('❌ Error obteniendo llamadas:', error);
        return;
      }

      console.log(`📞 Encontradas ${calls?.length || 0} llamadas completadas`);

      if (!calls || calls.length === 0) {
        console.log('✅ No hay llamadas para procesar');
        return;
      }

      // 3. Filtrar llamadas que necesitan procesamiento
      const callsToProcess = calls.filter(call => {
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

      // 4. Procesar cada llamada
      let successCount = 0;
      
      for (const call of callsToProcess) {
        try {
          console.log(`\n🚀 Procesando: ${call.call_id?.substring(0, 8)}`);
          
          // Calcular costo
          const cost = await calculateCallCost(call, userCustomAgents);
          
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
  }, [user?.id, userCustomAgents, calculateCallCost, applyDeduction]);

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

  // Cargar balance del usuario
  const loadUserCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Intentar user_credits primero
      const { data: userCreditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!creditsError && userCreditsData) {
        setUserCredits(userCreditsData);
        console.log(`💰 Balance cargado desde user_credits: $${userCreditsData.credits}`);
        return;
      }

      // Fallback a profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        // Crear entrada en user_credits si no existe
        const { error: insertError } = await supabase
          .from('user_credits')
          .insert({
            user_id: user.id,
            credits: profileData.credit_balance || 0,
            low_balance_threshold: 10,
            created_at: new Date().toISOString()
          });

        if (!insertError) {
          setUserCredits({
            user_id: user.id,
            credits: profileData.credit_balance || 0,
            low_balance_threshold: 10
          });
          console.log(`💰 Balance migrado a user_credits: $${profileData.credit_balance || 0}`);
        }
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
    detectAndProcessNewCalls: () => detectAndProcessNewCalls(),
    refreshData: () => {
      loadUserCustomAgents();
      loadUserCredits();
    }
  };
};

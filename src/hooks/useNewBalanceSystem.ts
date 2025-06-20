// 🤖 NUEVO SISTEMA DE DESCUENTOS AUTOMÁTICOS
// Ubicación: src/hooks/useNewBalanceSystem.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  recording_url?: string;
  end_reason?: string;
}

interface AgentData {
  id: string;
  name: string;
  rate_per_minute: number;
  retell_agent_id?: string;
}

interface BalanceState {
  balance: number;
  isLoading: boolean;
  error: string | null;
  status: 'empty' | 'critical' | 'warning' | 'healthy';
  estimatedMinutes: number;
  lastUpdate: Date;
  processingCalls: string[];
  recentDeductions: Array<{
    callId: string;
    amount: number;
    timestamp: Date;
  }>;
}

interface ProcessingResult {
  success: boolean;
  callId: string;
  amount: number;
  error?: string;
}

export const useNewBalanceSystem = () => {
  const { user } = useAuth();
  const [balanceState, setBalanceState] = useState<BalanceState>({
    balance: 0,
    isLoading: true,
    error: null,
    status: 'healthy',
    estimatedMinutes: 0,
    lastUpdate: new Date(),
    processingCalls: [],
    recentDeductions: []
  });

  const [userAgents, setUserAgents] = useState<AgentData[]>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  const calculateStatus = (balance: number): 'empty' | 'critical' | 'warning' | 'healthy' => {
    if (balance <= 0) return 'empty';
    if (balance <= 20) return 'critical';
    if (balance <= 40) return 'warning';
    return 'healthy';
  };

  const calculateEstimatedMinutes = (balance: number, agents: AgentData[]): number => {
    if (balance <= 0 || agents.length === 0) return 0;
    
    // Usar tarifa promedio de los agentes del usuario
    const avgRate = agents.reduce((sum, agent) => sum + agent.rate_per_minute, 0) / agents.length;
    return Math.floor(balance / avgRate);
  };

  const updateBalanceState = (updates: Partial<BalanceState>) => {
    setBalanceState(prev => {
      const newBalance = updates.balance !== undefined ? updates.balance : prev.balance;
      const newStatus = updates.balance !== undefined ? calculateStatus(newBalance) : prev.status;
      const newEstimatedMinutes = updates.balance !== undefined ? 
        calculateEstimatedMinutes(newBalance, userAgents) : prev.estimatedMinutes;

      return {
        ...prev,
        ...updates,
        status: newStatus,
        estimatedMinutes: newEstimatedMinutes,
        lastUpdate: new Date()
      };
    });
  };

  // ============================================================================
  // CARGA DE DATOS INICIALES
  // ============================================================================

  const loadUserAgents = async (): Promise<AgentData[]> => {
    if (!user?.id) return [];

    try {
      console.log('🤖 Cargando agentes del usuario...');

      // 1. Obtener asignaciones de agentes
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select('agent_id')
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error('❌ Error obteniendo asignaciones:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('⚠️ Usuario sin agentes asignados');
        return [];
      }

      const agentIds = assignments.map(a => a.agent_id);

      // 2. Obtener detalles de los agentes
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, rate_per_minute, retell_agent_id')
        .in('id', agentIds);

      if (agentsError) {
        console.error('❌ Error obteniendo agentes:', agentsError);
        return [];
      }

      console.log(`✅ ${agents?.length || 0} agentes cargados`);
      return agents || [];

    } catch (error) {
      console.error('❌ Error en loadUserAgents:', error);
      return [];
    }
  };

  const loadCurrentBalance = async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo balance:', error);
        return 0;
      }

      const balance = profile?.credit_balance || 0;
      console.log(`💰 Balance actual: $${balance}`);
      return balance;

    } catch (error) {
      console.error('❌ Error en loadCurrentBalance:', error);
      return 0;
    }
  };

  // ============================================================================
  // DETECCIÓN Y PROCESAMIENTO DE LLAMADAS
  // ============================================================================

  const loadAudioDuration = async (recordingUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(recordingUrl);
      
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout cargando audio');
        resolve(0);
      }, 5000);

      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        const duration = Math.round(audio.duration);
        console.log(`🎵 Duración de audio: ${duration}s`);
        resolve(duration);
      });

      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        console.log('❌ Error cargando audio');
        resolve(0);
      });
    });
  };

  const calculateCallCost = async (call: CallData, agents: AgentData[]): Promise<number> => {
    // 1. Si ya tiene costo, usarlo
    if (call.cost_usd && call.cost_usd > 0) {
      console.log(`✅ Usando costo existente: $${call.cost_usd}`);
      return call.cost_usd;
    }

    // 2. Obtener duración real del audio
    let duration = call.duration_sec || 0;
    if (call.recording_url && duration === 0) {
      duration = await loadAudioDuration(call.recording_url);
    }

    if (duration === 0) {
      console.log('⚠️ Sin duración disponible');
      return 0;
    }

    // 3. Buscar tarifa del agente
    const agent = agents.find(a => 
      a.id === call.agent_id || 
      a.retell_agent_id === call.agent_id
    );

    if (!agent || !agent.rate_per_minute) {
      console.log(`⚠️ Agente sin tarifa: ${call.agent_id}`);
      return 0;
    }

    // 4. Calcular costo
    const durationMinutes = duration / 60;
    const cost = durationMinutes * agent.rate_per_minute;
    
    console.log(`🧮 Costo calculado: ${durationMinutes.toFixed(2)}min × $${agent.rate_per_minute}/min = $${cost.toFixed(4)}`);
    return cost;
  };

  const processCall = async (call: CallData, agents: AgentData[]): Promise<ProcessingResult> => {
    try {
      console.log(`⚡ Procesando llamada: ${call.call_id}`);

      // 1. Calcular costo
      const cost = await calculateCallCost(call, agents);
      if (cost <= 0) {
        return {
          success: false,
          callId: call.call_id,
          amount: 0,
          error: 'Costo inválido'
        };
      }

      // 2. Actualizar costo en la base de datos
      const { error: updateError } = await supabase
        .from('calls')
        .update({ 
          cost_usd: cost,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', call.call_id);

      if (updateError) {
        return {
          success: false,
          callId: call.call_id,
          amount: cost,
          error: 'Error actualizando BD'
        };
      }

      // 3. Descontar del balance
      const currentBalance = await loadCurrentBalance();
      const newBalance = Math.max(0, currentBalance - cost);

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          credit_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (balanceError) {
        return {
          success: false,
          callId: call.call_id,
          amount: cost,
          error: 'Error actualizando balance'
        };
      }

      // 4. Crear registro de transacción
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user!.id,
          amount: -cost,
          transaction_type: 'call_cost',
          description: `Call cost for ${call.call_id}`,
          reference_id: call.call_id,
          created_at: new Date().toISOString()
        });

      // 5. Actualizar estado local
      updateBalanceState({
        balance: newBalance,
        recentDeductions: [
          {
            callId: call.call_id,
            amount: cost,
            timestamp: new Date()
          },
          ...balanceState.recentDeductions.slice(0, 4) // Mantener últimas 5
        ]
      });

      console.log(`🎉 Llamada procesada exitosamente: ${call.call_id} - $${cost.toFixed(4)}`);
      return {
        success: true,
        callId: call.call_id,
        amount: cost
      };

    } catch (error) {
      console.error(`❌ Error procesando ${call.call_id}:`, error);
      return {
        success: false,
        callId: call.call_id,
        amount: 0,
        error: 'Error inesperado'
      };
    }
  };

  const detectAndProcessNewCalls = async () => {
    if (!user?.id || isProcessingRef.current || userAgents.length === 0) {
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('🔍 Detectando llamadas nuevas...');

      // 1. Obtener llamadas completadas recientes
      const agentIds = userAgents.flatMap(agent => [
        agent.id,
        ...(agent.retell_agent_id ? [agent.retell_agent_id] : [])
      ]);

      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', agentIds)
        .in('call_status', ['completed', 'ended'])
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo llamadas:', error);
        return;
      }

      // 2. Filtrar llamadas que necesitan procesamiento
      const callsToProcess = (calls || []).filter(call => {
        const needsProcessing = (
          (!call.cost_usd || call.cost_usd === 0) &&
          !processedCallsRef.current.has(call.call_id)
        );

        if (needsProcessing) {
          console.log(`🎯 Llamada para procesar: ${call.call_id}`);
        }

        return needsProcessing;
      });

      if (callsToProcess.length === 0) {
        console.log('✅ No hay llamadas nuevas para procesar');
        return;
      }

      console.log(`🚨 Procesando ${callsToProcess.length} llamadas automáticamente`);
      
      // 3. Marcar como en procesamiento
      updateBalanceState({
        processingCalls: callsToProcess.map(c => c.call_id)
      });

      // 4. Procesar llamadas
      let successCount = 0;
      for (const call of callsToProcess) {
        const result = await processCall(call, userAgents);
        
        if (result.success) {
          processedCallsRef.current.add(call.call_id);
          successCount++;
        }

        // Pequeña pausa entre procesamiento
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`✅ Procesamiento completado: ${successCount}/${callsToProcess.length} exitosos`);

      // 5. Limpiar estado de procesamiento
      updateBalanceState({
        processingCalls: []
      });

    } catch (error) {
      console.error('❌ Error en detección automática:', error);
      updateBalanceState({
        error: 'Error en procesamiento automático',
        processingCalls: []
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  // ============================================================================
  // INICIALIZACIÓN Y POLLING
  // ============================================================================

  const initializeSystem = async () => {
    if (!user?.id) return;

    try {
      updateBalanceState({ isLoading: true, error: null });
      console.log('🚀 Inicializando sistema de balance automático...');

      // 1. Cargar agentes del usuario
      const agents = await loadUserAgents();
      setUserAgents(agents);

      // 2. Cargar balance actual
      const balance = await loadCurrentBalance();

      // 3. Actualizar estado inicial
      updateBalanceState({
        balance,
        isLoading: false,
        estimatedMinutes: calculateEstimatedMinutes(balance, agents)
      });

      console.log('✅ Sistema inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando sistema:', error);
      updateBalanceState({
        isLoading: false,
        error: 'Error inicializando sistema'
      });
    }
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      detectAndProcessNewCalls();
    }, 5000); // Cada 5 segundos

    console.log('🔄 Polling iniciado (cada 5 segundos)');
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    console.log('⏹️ Polling detenido');
  };

  // ============================================================================
  // FUNCIONES PÚBLICAS
  // ============================================================================

  const refreshBalance = useCallback(async () => {
    const balance = await loadCurrentBalance();
    updateBalanceState({ balance });
    return balance;
  }, [user?.id]);

  const manualProcessCall = async (callId: string): Promise<ProcessingResult> => {
    if (userAgents.length === 0) {
      return {
        success: false,
        callId,
        amount: 0,
        error: 'No hay agentes cargados'
      };
    }

    try {
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (error || !call) {
        return {
          success: false,
          callId,
          amount: 0,
          error: 'Llamada no encontrada'
        };
      }

      return await processCall(call, userAgents);

    } catch (error) {
      return {
        success: false,
        callId,
        amount: 0,
        error: 'Error inesperado'
      };
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Inicializar sistema cuando el usuario esté disponible
  useEffect(() => {
    if (user?.id) {
      initializeSystem();
    }
  }, [user?.id]);

  // Iniciar/detener polling según el estado
  useEffect(() => {
    if (user?.id && userAgents.length > 0 && !balanceState.isLoading) {
      startPolling();
      return () => stopPolling();
    }
  }, [user?.id, userAgents.length, balanceState.isLoading]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estado del balance
    balance: balanceState.balance,
    isLoading: balanceState.isLoading,
    error: balanceState.error,
    status: balanceState.status,
    estimatedMinutes: balanceState.estimatedMinutes,
    lastUpdate: balanceState.lastUpdate,
    
    // Estado del procesamiento
    processingCalls: balanceState.processingCalls,
    recentDeductions: balanceState.recentDeductions,
    isProcessing: isProcessingRef.current,
    
    // Información adicional
    userAgents,
    processedCallsCount: processedCallsRef.current.size,
    
    // Funciones
    refreshBalance,
    manualProcessCall,
    
    // Para debugging
    debugInfo: {
      processedCalls: Array.from(processedCallsRef.current),
      isPollingActive: pollingIntervalRef.current !== null
    }
  };
};

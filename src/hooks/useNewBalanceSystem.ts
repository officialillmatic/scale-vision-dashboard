// 🤖 SISTEMA CORREGIDO: MAPEO CORRECTO RETELL → CUSTOM AGENT
// Ubicación: src/hooks/useNewBalanceSystem.ts
// ✅ CORREGIDO para mapear retell_agent_id correctamente

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string; // Este es el retell_agent_id
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  recording_url?: string;
  end_reason?: string;
}

interface CustomAgentData {
  id: string; // Custom Agent ID
  name: string;
  rate_per_minute: number;
  retell_agent_id: string; // Retell Agent ID para mapeo
}

interface UserCreditData {
  user_id: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface BalanceState {
  balance: number;
  warningThreshold: number;
  criticalThreshold: number;
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
  status: 'empty' | 'critical' | 'warning' | 'healthy' | 'blocked';
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
  newBalance?: number;
}

export const useNewBalanceSystem = () => {
  const { user } = useAuth();
  const [balanceState, setBalanceState] = useState<BalanceState>({
    balance: 0,
    warningThreshold: 40,
    criticalThreshold: 20,
    isBlocked: false,
    isLoading: true,
    error: null,
    status: 'healthy',
    estimatedMinutes: 0,
    lastUpdate: new Date(),
    processingCalls: [],
    recentDeductions: []
  });

  const [userCustomAgents, setUserCustomAgents] = useState<CustomAgentData[]>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  const calculateStatus = (
    balance: number, 
    warningThreshold: number, 
    criticalThreshold: number, 
    isBlocked: boolean
  ): 'empty' | 'critical' | 'warning' | 'healthy' | 'blocked' => {
    if (isBlocked) return 'blocked';
    if (balance <= 0) return 'empty';
    if (balance <= criticalThreshold) return 'critical';
    if (balance <= warningThreshold) return 'warning';
    return 'healthy';
  };

  const calculateEstimatedMinutes = (balance: number, agents: CustomAgentData[]): number => {
    if (balance <= 0 || agents.length === 0) return 0;
    
    // Usar tarifa promedio de los Custom Agents del usuario
    const avgRate = agents.reduce((sum, agent) => sum + agent.rate_per_minute, 0) / agents.length;
    return Math.floor(balance / avgRate);
  };

  const updateBalanceState = (updates: Partial<BalanceState>) => {
    setBalanceState(prev => {
      const newBalance = updates.balance !== undefined ? updates.balance : prev.balance;
      const newWarningThreshold = updates.warningThreshold !== undefined ? updates.warningThreshold : prev.warningThreshold;
      const newCriticalThreshold = updates.criticalThreshold !== undefined ? updates.criticalThreshold : prev.criticalThreshold;
      const newIsBlocked = updates.isBlocked !== undefined ? updates.isBlocked : prev.isBlocked;
      const newStatus = calculateStatus(newBalance, newWarningThreshold, newCriticalThreshold, newIsBlocked);
      const newEstimatedMinutes = updates.balance !== undefined ? 
        calculateEstimatedMinutes(newBalance, userCustomAgents) : prev.estimatedMinutes;

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
  // CARGA DE CUSTOM AGENTS (CORREGIDA)
  // ============================================================================

  const loadUserCustomAgents = async (): Promise<CustomAgentData[]> => {
    if (!user?.id) return [];

    try {
      console.log('🤖 Cargando Custom Agents asignados al usuario...');

      // ✅ CORRECCIÓN 1: Obtener Custom Agents asignados (NO Retell Agents)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select('agent_id') // Este es el Custom Agent ID
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error('❌ Error obteniendo asignaciones:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('⚠️ Usuario sin Custom Agents asignados');
        return [];
      }

      const customAgentIds = assignments.map(a => a.agent_id);
      console.log('🎯 Custom Agent IDs asignados:', customAgentIds);

      // ✅ CORRECCIÓN 2: Obtener Custom Agents con retell_agent_id
      const { data: customAgents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, rate_per_minute, retell_agent_id')
        .in('id', customAgentIds)
        .eq('status', 'active'); // Solo agentes activos

      if (agentsError) {
        console.error('❌ Error obteniendo Custom Agents:', agentsError);
        return [];
      }

      console.log(`✅ ${customAgents?.length || 0} Custom Agents cargados:`, customAgents);
      return customAgents || [];

    } catch (error) {
      console.error('❌ Error en loadUserCustomAgents:', error);
      return [];
    }
  };

  const loadCurrentBalance = async (): Promise<UserCreditData | null> => {
    if (!user?.id) return null;

    try {
      console.log('💰 Cargando balance desde user_credits...');

      const { data: userCredit, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📝 Creando registro en user_credits para usuario nuevo...');
          
          const { data: newUserCredit, error: createError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              current_balance: 0,
              warning_threshold: 40,
              critical_threshold: 20,
              is_blocked: false
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creando user_credits:', createError);
            return null;
          }

          console.log('✅ Registro creado en user_credits');
          return newUserCredit;
        }
        
        console.error('❌ Error obteniendo balance:', error);
        return null;
      }

      console.log(`💰 Balance cargado: $${userCredit.current_balance} (Warning: $${userCredit.warning_threshold}, Critical: $${userCredit.critical_threshold})`);
      return userCredit;

    } catch (error) {
      console.error('❌ Error en loadCurrentBalance:', error);
      return null;
    }
  };

  // ============================================================================
  // DETECCIÓN Y PROCESAMIENTO (CORREGIDA PARA RETELL MAPPING)
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

  const calculateCallCost = async (call: CallData, customAgents: CustomAgentData[]): Promise<number> => {
    // ✅ CORRECCIÓN 3: Mapear retell_agent_id → Custom Agent
    console.log(`🧮 Calculando costo para llamada ${call.call_id}:`);
    console.log(`   - calls.agent_id (retell): ${call.agent_id}`);

    // 1. Si ya tiene costo, no recalcular (aunque debería ser 0)
    if (call.cost_usd && call.cost_usd > 0) {
      console.log(`✅ Usando costo existente: $${call.cost_usd}`);
      return call.cost_usd;
    }

    // 2. Buscar Custom Agent por retell_agent_id
    const customAgent = customAgents.find(agent => 
      agent.retell_agent_id === call.agent_id
    );

    if (!customAgent) {
      console.log(`❌ No se encontró Custom Agent para retell_agent_id: ${call.agent_id}`);
      console.log('Available Custom Agents:', customAgents.map(a => ({
        id: a.id,
        name: a.name,
        retell_agent_id: a.retell_agent_id
      })));
      return 0;
    }

    console.log(`✅ Custom Agent encontrado: ${customAgent.name} (rate: $${customAgent.rate_per_minute}/min)`);

    if (!customAgent.rate_per_minute || customAgent.rate_per_minute <= 0) {
      console.log(`⚠️ Custom Agent sin tarifa válida: ${customAgent.rate_per_minute}`);
      return 0;
    }

    // 3. Obtener duración real del audio
    let duration = call.duration_sec || 0;
    if (call.recording_url && duration === 0) {
      console.log('🎵 Cargando duración desde audio...');
      duration = await loadAudioDuration(call.recording_url);
    }

    if (duration === 0) {
      console.log('⚠️ Sin duración disponible');
      return 0;
    }

    // 4. Calcular costo
    const durationMinutes = duration / 60;
    const cost = durationMinutes * customAgent.rate_per_minute;
    
    console.log(`🧮 Costo calculado: ${durationMinutes.toFixed(2)}min × $${customAgent.rate_per_minute}/min = $${cost.toFixed(4)}`);
    return cost;
  };

  const processCall = async (call: CallData, customAgents: CustomAgentData[]): Promise<ProcessingResult> => {
    try {
      console.log(`⚡ Procesando llamada: ${call.call_id}`);

      // 1. Calcular costo dinámico
      const cost = await calculateCallCost(call, customAgents);
      if (cost <= 0) {
        return {
          success: false,
          callId: call.call_id,
          amount: 0,
          error: 'Costo inválido o Custom Agent no encontrado'
        };
      }

      // ✅ CORRECCIÓN 4: NO actualizar cost_usd en calls (queda en 0)
      console.log(`💡 NO actualizando cost_usd en calls (queda en 0 - cálculo dinámico)`);

      // 2. ✅ Usar función RPC para descontar del balance
      console.log(`💳 Descontando $${cost.toFixed(4)} vía RPC admin_adjust_user_credits`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user!.id,
        p_amount: -cost, // Negativo para descuento
        p_description: `Auto call cost: ${call.call_id} via ${customAgents.find(a => a.retell_agent_id === call.agent_id)?.name}`,
        p_admin_id: 'auto_system'
      });

      if (rpcError) {
        console.error('❌ Error en RPC admin_adjust_user_credits:', rpcError);
        return {
          success: false,
          callId: call.call_id,
          amount: cost,
          error: 'Error descontando balance via RPC'
        };
      }

      console.log('✅ RPC ejecutada exitosamente:', rpcResult);

      // 3. Obtener el nuevo balance después del descuento
      const newBalanceData = await loadCurrentBalance();
      const newBalance = newBalanceData?.current_balance || 0;

      // 4. Actualizar estado local
      updateBalanceState({
        balance: newBalance,
        warningThreshold: newBalanceData?.warning_threshold || 40,
        criticalThreshold: newBalanceData?.critical_threshold || 20,
        isBlocked: newBalanceData?.is_blocked || false,
        recentDeductions: [
          {
            callId: call.call_id,
            amount: cost,
            timestamp: new Date()
          },
          ...balanceState.recentDeductions.slice(0, 4)
        ]
      });

      console.log(`🎉 Llamada procesada exitosamente: ${call.call_id} - $${cost.toFixed(4)} (Nuevo balance: $${newBalance})`);
      return {
        success: true,
        callId: call.call_id,
        amount: cost,
        newBalance: newBalance
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
    if (!user?.id || isProcessingRef.current || userCustomAgents.length === 0) {
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('🔍 Detectando llamadas nuevas con mapeo corregido...');

      // ✅ CORRECCIÓN 5: Buscar llamadas SOLO por retell_agent_id
      const retellAgentIds = userCustomAgents
        .map(agent => agent.retell_agent_id)
        .filter(Boolean);

      console.log('🎯 Buscando llamadas con retell_agent_ids:', retellAgentIds);

      if (retellAgentIds.length === 0) {
        console.log('⚠️ No hay retell_agent_ids para buscar');
        return;
      }

      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', retellAgentIds) // ✅ SOLO retell_agent_ids
        .in('call_status', ['completed', 'ended'])
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo llamadas:', error);
        return;
      }

      console.log(`📞 Llamadas encontradas: ${calls?.length || 0}`);

      // 2. Filtrar llamadas que necesitan procesamiento
      const callsToProcess = (calls || []).filter(call => {
        const needsProcessing = (
          (!call.cost_usd || call.cost_usd === 0) && // cost_usd debe ser 0
          !processedCallsRef.current.has(call.call_id)
        );

        if (needsProcessing) {
          console.log(`🎯 Llamada para procesar: ${call.call_id} (retell_agent: ${call.agent_id})`);
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
        const result = await processCall(call, userCustomAgents);
        
        if (result.success) {
          processedCallsRef.current.add(call.call_id);
          successCount++;
        }

        // Pausa entre procesamiento
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
      console.log('🚀 Inicializando sistema con mapeo Retell corregido...');

      // 1. Cargar Custom Agents del usuario
      const customAgents = await loadUserCustomAgents();
      setUserCustomAgents(customAgents);

      // 2. Cargar balance desde user_credits
      const balanceData = await loadCurrentBalance();

      if (balanceData) {
        updateBalanceState({
          balance: balanceData.current_balance,
          warningThreshold: balanceData.warning_threshold,
          criticalThreshold: balanceData.critical_threshold,
          isBlocked: balanceData.is_blocked,
          isLoading: false,
          estimatedMinutes: calculateEstimatedMinutes(balanceData.current_balance, customAgents)
        });
      } else {
        updateBalanceState({
          isLoading: false,
          error: 'No se pudo cargar el balance del usuario'
        });
      }

      console.log('✅ Sistema con mapeo Retell inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando sistema:', error);
      updateBalanceState({
        isLoading: false,
        error: 'Error inicializando sistema con mapeo'
      });
    }
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      detectAndProcessNewCalls();
    }, 5000);

    console.log('🔄 Polling con mapeo Retell iniciado (cada 5 segundos)');
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    console.log('⏹️ Polling con mapeo Retell detenido');
  };

  // ============================================================================
  // FUNCIONES PÚBLICAS
  // ============================================================================

  const refreshBalance = useCallback(async () => {
    const balanceData = await loadCurrentBalance();
    if (balanceData) {
      updateBalanceState({
        balance: balanceData.current_balance,
        warningThreshold: balanceData.warning_threshold,
        criticalThreshold: balanceData.critical_threshold,
        isBlocked: balanceData.is_blocked
      });
      return balanceData.current_balance;
    }
    return 0;
  }, [user?.id]);

  const manualProcessCall = async (callId: string): Promise<ProcessingResult> => {
    if (userCustomAgents.length === 0) {
      return {
        success: false,
        callId,
        amount: 0,
        error: 'No hay Custom Agents cargados'
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

      return await processCall(call, userCustomAgents);

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

  useEffect(() => {
    if (user?.id) {
      initializeSystem();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && userCustomAgents.length > 0 && !balanceState.isLoading) {
      startPolling();
      return () => stopPolling();
    }
  }, [user?.id, userCustomAgents.length, balanceState.isLoading]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // ============================================================================
  // RETURN (CORREGIDO)
  // ============================================================================

  return {
    // Estado del balance
    balance: balanceState.balance,
    warningThreshold: balanceState.warningThreshold,
    criticalThreshold: balanceState.criticalThreshold,
    isBlocked: balanceState.isBlocked,
    isLoading: balanceState.isLoading,
    error: balanceState.error,
    status: balanceState.status,
    estimatedMinutes: balanceState.estimatedMinutes,
    lastUpdate: balanceState.lastUpdate,
    
    // Estado del procesamiento
    processingCalls: balanceState.processingCalls,
    recentDeductions: balanceState.recentDeductions,
    isProcessing: isProcessingRef.current,
    
    // Información adicional (corregida)
    userAgents: userCustomAgents, // Ahora son Custom Agents
    processedCallsCount: processedCallsRef.current.size,
    
    // Funciones
    refreshBalance,
    manualProcessCall,
    
    // Para debugging (actualizado)
    debugInfo: {
      processedCalls: Array.from(processedCallsRef.current),
      isPollingActive: pollingIntervalRef.current !== null,
      usingUserCreditsTable: true,
      usingRPCFunction: 'admin_adjust_user_credits',
      retellMapping: true,
      customAgentsCount: userCustomAgents.length,
      retellAgentIds: userCustomAgents.map(a => a.retell_agent_id)
    }
  };
};

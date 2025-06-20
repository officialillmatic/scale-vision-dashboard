// 🤖 SISTEMA SEGURO: SIN REFERENCIAS A SERVICIOS EXTERNOS
// Ubicación: src/hooks/useNewBalanceSystem.ts
// 🔐 SEGURIDAD: Términos genéricos, sin exponer proveedores
// ✅ CORREGIDO: Esquema de base de datos y detección mejorada

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string; // Este es el external_agent_id
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  recording_url?: string;
  disconnection_reason?: string; // ✅ CORREGIDO: era end_reason
}

interface CustomAgentData {
  id: string; // Custom Agent ID
  name: string;
  rate_per_minute: number;
  retell_agent_id: string; // Guardamos el nombre original del campo pero no lo exponemos
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
    
    // Usar tarifa promedio de los agentes personalizados del usuario
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
  // CARGA DE AGENTES PERSONALIZADOS
  // ============================================================================

  const loadUserCustomAgents = async (): Promise<CustomAgentData[]> => {
    if (!user?.id) return [];

    try {
      console.log('🤖 Loading assigned custom agents...');

      // Obtener agentes personalizados asignados
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select('agent_id') // Este es el Custom Agent ID
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error('❌ Error loading agent assignments:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('⚠️ No custom agents assigned to user');
        return [];
      }

      const customAgentIds = assignments.map(a => a.agent_id);
      console.log('🎯 Custom agent IDs assigned:', customAgentIds);

      // Obtener detalles de agentes personalizados con ID externo
      const { data: customAgents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, rate_per_minute, retell_agent_id')
        .in('id', customAgentIds)
        .eq('status', 'active'); // Solo agentes activos

      if (agentsError) {
        console.error('❌ Error loading custom agents:', agentsError);
        return [];
      }

      console.log(`✅ ${customAgents?.length || 0} custom agents loaded successfully`);
      console.log('🔍 Custom agents:', customAgents?.map(a => ({
        id: a.id,
        name: a.name,
        rate: a.rate_per_minute,
        external_id: a.retell_agent_id
      })));
      
      return customAgents || [];

    } catch (error) {
      console.error('❌ Error in loadUserCustomAgents:', error);
      return [];
    }
  };

  const loadCurrentBalance = async (): Promise<UserCreditData | null> => {
    if (!user?.id) return null;

    try {
      console.log('💰 Loading current balance...');

      const { data: userCredit, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📝 Creating new user credit record...');
          
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
            console.error('❌ Error creating user credits:', createError);
            return null;
          }

          console.log('✅ User credit record created');
          return newUserCredit;
        }
        
        console.error('❌ Error loading balance:', error);
        return null;
      }

      console.log(`💰 Balance loaded: $${userCredit.current_balance} (Warning: $${userCredit.warning_threshold}, Critical: $${userCredit.critical_threshold})`);
      return userCredit;

    } catch (error) {
      console.error('❌ Error in loadCurrentBalance:', error);
      return null;
    }
  };

  // ============================================================================
  // DETECCIÓN Y PROCESAMIENTO DE LLAMADAS
  // ============================================================================

  const loadAudioDuration = async (recordingUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(recordingUrl);
      
      const timeout = setTimeout(() => {
        console.log('⏰ Audio loading timeout');
        resolve(0);
      }, 5000);

      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        const duration = Math.round(audio.duration);
        console.log(`🎵 Audio duration: ${duration}s`);
        resolve(duration);
      });

      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        console.log('❌ Error loading audio');
        resolve(0);
      });
    });
  };

  const calculateCallCost = async (call: CallData, customAgents: CustomAgentData[]): Promise<number> => {
    console.log(`🧮 Calculating cost for call ${call.call_id}:`);
    console.log(`   - External agent ID: ${call.agent_id}`);

    // 1. Buscar agente personalizado por ID externo
    const customAgent = customAgents.find(agent => 
      agent.retell_agent_id === call.agent_id
    );

    if (!customAgent) {
      console.log(`❌ Custom agent not found for external ID: ${call.agent_id}`);
      console.log('Available custom agents:', customAgents.map(a => ({
        id: a.id,
        name: a.name,
        external_id: a.retell_agent_id
      })));
      return 0;
    }

    console.log(`✅ Custom agent found: ${customAgent.name} (rate: $${customAgent.rate_per_minute}/min)`);

    if (!customAgent.rate_per_minute || customAgent.rate_per_minute <= 0) {
      console.log(`⚠️ Custom agent has invalid rate: ${customAgent.rate_per_minute}`);
      return 0;
    }

    // 2. Obtener duración real del audio
    let duration = call.duration_sec || 0;
    if (call.recording_url && duration === 0) {
      console.log('🎵 Loading duration from audio...');
      duration = await loadAudioDuration(call.recording_url);
    }

    if (duration === 0) {
      console.log('⚠️ No duration available');
      return 0;
    }

    // 3. Calcular costo
    const durationMinutes = duration / 60;
    const cost = durationMinutes * customAgent.rate_per_minute;
    
    console.log(`🧮 Cost calculated: ${durationMinutes.toFixed(2)}min × $${customAgent.rate_per_minute}/min = $${cost.toFixed(4)}`);
    return cost;
  };

  const processCall = async (call: CallData, customAgents: CustomAgentData[]): Promise<ProcessingResult> => {
    try {
      console.log(`⚡ Processing call: ${call.call_id}`);

      // 1. Calcular costo dinámico
      const cost = await calculateCallCost(call, customAgents);
      if (cost <= 0) {
        return {
          success: false,
          callId: call.call_id,
          amount: 0,
          error: 'Invalid cost or custom agent not found'
        };
      }

      // 2. Usar función RPC para descontar del balance
      console.log(`💳 Deducting $${cost.toFixed(4)} via admin credit adjustment`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user!.id,
        p_amount: -cost, // Negativo para descuento
        p_description: `Auto call cost: ${call.call_id} via ${customAgents.find(a => a.retell_agent_id === call.agent_id)?.name}`,
        p_admin_id: 'auto_system'
      });

      if (rpcError) {
        console.error('❌ Error in admin credit adjustment:', rpcError);
        return {
          success: false,
          callId: call.call_id,
          amount: cost,
          error: 'Error deducting balance via admin function'
        };
      }

      console.log('✅ Admin credit adjustment executed successfully');

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

      console.log(`🎉 Call processed successfully: ${call.call_id} - $${cost.toFixed(4)} (New balance: $${newBalance})`);
      return {
        success: true,
        callId: call.call_id,
        amount: cost,
        newBalance: newBalance
      };

    } catch (error) {
      console.error(`❌ Error processing ${call.call_id}:`, error);
      return {
        success: false,
        callId: call.call_id,
        amount: 0,
        error: 'Unexpected error'
      };
    }
  };

  const detectAndProcessNewCalls = async () => {
    if (!user?.id || isProcessingRef.current || userCustomAgents.length === 0) {
      return;
    }

    try {
      isProcessingRef.current = true;
      console.log('🔍 Detecting new calls for processing...');

      // Buscar llamadas por IDs de agentes externos
      const externalAgentIds = userCustomAgents
        .map(agent => agent.retell_agent_id)
        .filter(Boolean);

      console.log('🎯 Searching calls with external agent IDs:', externalAgentIds);

      if (externalAgentIds.length === 0) {
        console.log('⚠️ No external agent IDs available for search');
        return;
      }

      // ✅ MEJORADO: Buscar más estados y llamadas más recientes
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', externalAgentIds) // Buscar por IDs externos
        .in('call_status', ['completed', 'ended', 'finished', 'terminated']) // ✅ MÁS ESTADOS
        .eq('user_id', user.id) // ✅ FILTRO ADICIONAL por usuario
        .gte('timestamp', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // ✅ ÚLTIMAS 2 HORAS
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error fetching calls:', error);
        return;
      }

      console.log(`📞 Total calls found: ${calls?.length || 0}`);
      
      // ✅ DEBUG: Mostrar información de todas las llamadas encontradas
      if (calls && calls.length > 0) {
        console.log('📋 All calls found:');
        calls.forEach((call, index) => {
          console.log(`   ${index + 1}. ${call.call_id} - Status: ${call.call_status} - Agent: ${call.agent_id} - Duration: ${call.duration_sec}s - Cost: $${call.cost_usd || 0}`);
        });
      }

      // 2. ✅ MEJORADO: Filtrar llamadas que necesitan procesamiento
      const callsToProcess = (calls || []).filter(call => {
        const alreadyProcessed = processedCallsRef.current.has(call.call_id);
        const hasValidDuration = call.duration_sec && call.duration_sec > 0;
        const needsProcessing = !alreadyProcessed && hasValidDuration;

        console.log(`🔍 Call ${call.call_id}:`, {
          status: call.call_status,
          duration: call.duration_sec,
          cost_stored: call.cost_usd,
          already_processed: alreadyProcessed,
          needs_processing: needsProcessing
        });

        return needsProcessing;
      });

      if (callsToProcess.length === 0) {
        console.log('✅ No new calls to process');
        return;
      }

      console.log(`🚨 Auto-processing ${callsToProcess.length} calls`);
      
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

      console.log(`✅ Processing completed: ${successCount}/${callsToProcess.length} successful`);

      // 5. Limpiar estado de procesamiento
      updateBalanceState({
        processingCalls: []
      });

    } catch (error) {
      console.error('❌ Error in automatic detection:', error);
      updateBalanceState({
        error: 'Error in automatic processing',
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
      console.log('🚀 Initializing smart balance system...');

      // 1. Cargar agentes personalizados del usuario
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
          error: 'Could not load user balance'
        });
      }

      console.log('✅ Smart balance system initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing system:', error);
      updateBalanceState({
        isLoading: false,
        error: 'Error initializing smart system'
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

    console.log('🔄 Smart monitoring started (every 5 seconds)');
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    console.log('⏹️ Smart monitoring stopped');
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
        error: 'No custom agents loaded'
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
          error: 'Call not found'
        };
      }

      return await processCall(call, userCustomAgents);

    } catch (error) {
      return {
        success: false,
        callId,
        amount: 0,
        error: 'Unexpected error'
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
  // RETURN
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
    
    // Información adicional
    userAgents: userCustomAgents,
    processedCallsCount: processedCallsRef.current.size,
    
    // Funciones
    refreshBalance,
    manualProcessCall,
    
    // Para debugging
    debugInfo: {
      processedCalls: Array.from(processedCallsRef.current),
      isPollingActive: pollingIntervalRef.current !== null,
      usingUserCreditsTable: true,
      usingRPCFunction: 'admin_adjust_user_credits',
      smartMappingEnabled: true,
      customAgentsCount: userCustomAgents.length,
      externalAgentIds: userCustomAgents.map(a => a.retell_agent_id)
    }
  };
};

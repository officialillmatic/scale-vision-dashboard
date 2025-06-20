import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../utils/supabase';

// Types
interface CallData {
  call_id: string;
  user_id: string;
  agent_id: string;
  duration_sec: number;
  call_status: string;
  timestamp: string;
  recording_url?: string;
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
const DEFAULT_RATE_PER_MINUTE = 0.10; // $0.10/min como fallback
const POLLING_INTERVAL = 5000; // 5 segundos
const CALL_LOOKBACK_HOURS = 2; // Buscar llamadas de las últimas 2 horas

export const useNewBalanceSystem = () => {
  const user = useAuthStore(state => state.user);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCustomAgents, setUserCustomAgents] = useState<CustomAgentData[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [lastProcessedCall, setLastProcessedCall] = useState<string | null>(null);
  
  // Refs para evitar re-renders innecesarios
  const isProcessingRef = useRef(false);
  const processedCallsRef = useRef(new Set<string>());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FUNCIÓN MEJORADA: Selección inteligente de agente
  const selectAgentForCall = useCallback((call: CallData, availableAgents: CustomAgentData[]): CustomAgentData | null => {
    if (availableAgents.length === 0) {
      console.log(`❌ No agents available for user ${call.user_id}`);
      return null;
    }

    console.log(`🔍 Selecting agent for call ${call.call_id}:`);
    console.log(`   - Call agent_id: ${call.agent_id}`);
    console.log(`   - Available agents: ${availableAgents.length}`);

    // Prioridad 1: Buscar coincidencia exacta por retell_agent_id
    const exactMatch = availableAgents.find(agent => 
      agent.retell_agent_id === call.agent_id
    );
    if (exactMatch) {
      console.log(`✅ Found exact agent match: ${exactMatch.name}`);
      return exactMatch;
    }

    // Prioridad 2: Agente marcado como primario
    const primaryAgent = availableAgents.find(agent => agent.is_primary);
    if (primaryAgent) {
      console.log(`✅ Using primary agent: ${primaryAgent.name} (no exact match found)`);
      return primaryAgent;
    }

    // Prioridad 3: El más recientemente asignado
    const sortedByDate = [...availableAgents].sort((a, b) => {
      const dateA = new Date(a.assigned_at || 0).getTime();
      const dateB = new Date(b.assigned_at || 0).getTime();
      return dateB - dateA;
    });

    const selectedAgent = sortedByDate[0];
    console.log(`✅ Using most recent agent: ${selectedAgent.name} (assigned: ${selectedAgent.assigned_at || 'unknown'})`);
    return selectedAgent;
  }, []);

  // ✅ FUNCIÓN MEJORADA: Cálculo de costo universal
  const calculateCallCost = useCallback(async (call: CallData, availableAgents: CustomAgentData[]): Promise<number> => {
    console.group(`🧮 Calculating cost for call ${call.call_id}`);
    
    try {
      // 1. Seleccionar agente usando la nueva lógica
      const selectedAgent = selectAgentForCall(call, availableAgents);
      
      // 2. Determinar tarifa a usar
      let ratePerMinute: number;
      let agentName: string;
      
      if (selectedAgent && selectedAgent.rate_per_minute > 0) {
        ratePerMinute = selectedAgent.rate_per_minute;
        agentName = selectedAgent.name;
        console.log(`💰 Using custom rate: $${ratePerMinute}/min from ${agentName}`);
      } else {
        ratePerMinute = DEFAULT_RATE_PER_MINUTE;
        agentName = "Default Rate";
        console.log(`⚠️ Using default rate: $${ratePerMinute}/min (no valid custom agent)`);
      }

      // 3. Obtener duración de la llamada
      let duration = call.duration_sec || 0;
      
      // Si no hay duración pero hay URL de grabación, intentar cargarla
      if (duration === 0 && call.recording_url) {
        console.log('🎵 Loading duration from audio URL...');
        try {
          duration = await loadAudioDuration(call.recording_url);
          console.log(`🎵 Loaded duration: ${duration}s`);
        } catch (error) {
          console.warn('⚠️ Could not load audio duration:', error);
        }
      }

      if (duration === 0) {
        console.log('❌ No duration available, cost = $0');
        return 0;
      }

      // 4. Calcular costo final
      const durationMinutes = duration / 60;
      const cost = durationMinutes * ratePerMinute;
      
      console.log(`📊 Final calculation:`);
      console.log(`   - Duration: ${duration}s (${durationMinutes.toFixed(2)} min)`);
      console.log(`   - Rate: $${ratePerMinute}/min`);
      console.log(`   - Agent: ${agentName}`);
      console.log(`   - Total Cost: $${cost.toFixed(4)}`);
      
      return cost;
      
    } catch (error) {
      console.error('❌ Error calculating call cost:', error);
      return 0;
    } finally {
      console.groupEnd();
    }
  }, [selectAgentForCall]);

  // Función para cargar duración de audio (si es necesaria)
  const loadAudioDuration = useCallback((audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        reject(new Error('Could not load audio'));
      });
      audio.src = audioUrl;
    });
  }, []);

  // ✅ FUNCIÓN MEJORADA: Detección y procesamiento de llamadas
  const detectAndProcessNewCalls = useCallback(async () => {
    if (!user?.id || isProcessingRef.current || userCustomAgents.length === 0) {
      return;
    }

    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      
      console.log('🔍 Detecting new calls for automatic discount processing...');
      console.log(`   - User: ${user.id}`);
      console.log(`   - Available agents: ${userCustomAgents.length}`);

      // ✅ NUEVA LÓGICA: Buscar TODAS las llamadas completadas del usuario
      // No filtrar por agent_id específico - usar asignación de usuario
      const lookbackTime = new Date(Date.now() - CALL_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
      
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)  // ✅ Solo filtrar por usuario
        .in('call_status', ['completed', 'ended', 'finished', 'terminated'])
        .gte('timestamp', lookbackTime)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error fetching calls:', error);
        return;
      }

      console.log(`📞 Found ${calls?.length || 0} completed calls in last ${CALL_LOOKBACK_HOURS}h`);
      
      if (!calls || calls.length === 0) {
        console.log('✅ No calls to process');
        return;
      }

      // ✅ NUEVA LÓGICA: Procesar TODAS las llamadas del usuario
      const callsToProcess = calls.filter(call => {
        const alreadyProcessed = processedCallsRef.current.has(call.call_id);
        const hasValidDuration = call.duration_sec && call.duration_sec > 0;
        const needsProcessing = !alreadyProcessed && hasValidDuration;

        console.log(`🔍 Call ${call.call_id}:`, {
          status: call.call_status,
          duration: call.duration_sec,
          agent_id: call.agent_id,
          already_processed: alreadyProcessed,
          needs_processing: needsProcessing,
          will_use_agent: userCustomAgents[0]?.name || 'default'
        });

        return needsProcessing;
      });

      console.log(`⚡ Processing ${callsToProcess.length} new calls`);

      // Procesar cada llamada
      for (const call of callsToProcess) {
        try {
          console.log(`\n🚀 Processing call ${call.call_id}...`);
          
          // Calcular costo usando la nueva lógica universal
          const cost = await calculateCallCost(call, userCustomAgents);
          
          if (cost > 0) {
            // Aplicar descuento automático
            console.log(`💳 Applying automatic discount of $${cost.toFixed(4)}...`);
            
            const { data: result, error: rpcError } = await supabase
              .rpc('admin_adjust_user_credits', {
                target_user_id: user.id,
                amount: -cost, // Negativo para descuento
                reason: `Automatic deduction for call ${call.call_id} (${(call.duration_sec / 60).toFixed(1)}min)`
              });

            if (rpcError) {
              console.error(`❌ Failed to apply discount for call ${call.call_id}:`, rpcError);
            } else {
              console.log(`✅ Successfully deducted $${cost.toFixed(4)} for call ${call.call_id}`);
              
              // Marcar como procesada
              processedCallsRef.current.add(call.call_id);
              setLastProcessedCall(call.call_id);
              
              // Actualizar balance local
              if (userCredits) {
                setUserCredits(prev => prev ? {
                  ...prev,
                  credits: prev.credits - cost
                } : null);
              }
            }
          } else {
            console.log(`⚠️ Skipping call ${call.call_id} - zero cost calculated`);
          }
          
        } catch (callError) {
          console.error(`❌ Error processing call ${call.call_id}:`, callError);
        }
      }

      if (callsToProcess.length > 0) {
        console.log(`✅ Finished processing ${callsToProcess.length} calls`);
      }

    } catch (error) {
      console.error('❌ Error in detectAndProcessNewCalls:', error);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [user?.id, userCustomAgents, calculateCallCost, userCredits]);

  // Cargar agentes asignados al usuario
  const loadUserCustomAgents = useCallback(async () => {
    if (!user?.id) return;

    try {
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

      console.log(`👥 Loaded ${agents.length} active custom agents for user`);
      agents.forEach(agent => {
        console.log(`   - ${agent.name}: $${agent.rate_per_minute}/min ${agent.is_primary ? '(PRIMARY)' : ''}`);
      });

      setUserCustomAgents(agents);
    } catch (error) {
      console.error('❌ Error in loadUserCustomAgents:', error);
    }
  }, [user?.id]);

  // Cargar balance del usuario
  const loadUserCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading user credits:', error);
        return;
      }

      setUserCredits(data || null);
    } catch (error) {
      console.error('❌ Error in loadUserCredits:', error);
    }
  }, [user?.id]);

  // Inicializar sistema
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Initializing New Balance System...');
      loadUserCustomAgents();
      loadUserCredits();
    }
  }, [user?.id, loadUserCustomAgents, loadUserCredits]);

  // Configurar polling automático
  useEffect(() => {
    if (user?.id && userCustomAgents.length > 0) {
      console.log('⏰ Starting automatic call detection polling...');
      
      // Ejecutar inmediatamente
      detectAndProcessNewCalls();
      
      // Configurar intervalo
      pollingIntervalRef.current = setInterval(() => {
        detectAndProcessNewCalls();
      }, POLLING_INTERVAL);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          console.log('⏹️ Stopped automatic call detection polling');
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
    processedCallsCount: processedCallsRef.current.size,
    detectAndProcessNewCalls: () => detectAndProcessNewCalls(),
    refreshData: () => {
      loadUserCustomAgents();
      loadUserCredits();
    }
  };
};

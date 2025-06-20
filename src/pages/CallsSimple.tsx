import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CallDetailModal } from "@/components/calls/CallDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone,
  Clock, 
  DollarSign, 
  User, 
  Calendar, 
  Search,
  FileText,
  PlayCircle,
  TrendingUp,
  Filter,
  Eye,
  ArrowUpDown,
  Volume2,
  Download,
  CalendarDays,
  ChevronDown,
  Users
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";

// ============================================================================
// FUNCIÓN: Descontar costo de llamada del balance del usuario
// ============================================================================
const deductCallCost = async (callId: string, callCost: number, userId: string) => {
  if (!callCost || callCost <= 0) {
    console.log(`⚠️ No se descuenta - costo inválido: $${callCost}`);
    return false;
  }

  try {
    console.log(`💳 Descontando $${callCost.toFixed(4)} del balance del usuario ${userId}`);
    
    // Buscar el UUID real de la llamada
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('id, call_id')
      .eq('call_id', callId)
      .single();

    if (callError || !callData) {
      console.error('❌ No se encontró la llamada:', callError);
      return false;
    }

    const callUUID = callData.id;
    
    // Verificar si ya existe una transacción para esta llamada
    const { data: existingTransaction, error: checkError } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('call_id', callUUID)
      .eq('transaction_type', 'debit')
      .single();

    if (existingTransaction) {
      console.log(`✅ El costo ya fue descontado para la llamada ${callId}`);
      return true;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando transacción existente:', checkError);
      return false;
    }

    // Obtener balance actual del usuario
    const { data: userCredit, error: creditError } = await supabase
      .from('user_credits')
      .select('current_balance')
      .eq('user_id', userId)
      .single();

    if (creditError) {
      console.error('❌ Error obteniendo balance:', creditError);
      return false;
    }

    const currentBalance = userCredit?.current_balance || 0;
    const newBalance = currentBalance - callCost;

    // Actualizar balance del usuario
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error actualizando balance:', updateError);
      return false;
    }

    // Registrar transacción
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        call_id: callUUID,
        amount: callCost,
        transaction_type: 'debit',
        description: `Call cost deduction - Call ID: ${callId}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error registrando transacción:', transactionError);
      
      // Revertir el balance si falla el registro
      await supabase
        .from('user_credits')
        .update({ current_balance: currentBalance })
        .eq('user_id', userId);
      return false;
    }

    console.log(`🎉 DESCUENTO EXITOSO: $${currentBalance.toFixed(4)} → $${newBalance.toFixed(4)}`);
    
    // Disparar evento para actualizar balance en tiempo real
    window.dispatchEvent(new CustomEvent('balanceUpdated', { 
      detail: { 
        newBalance, 
        userId,
        deduction: callCost,
        callId: callId
      } 
    }));
    
    return true;

  } catch (error) {
    console.error('💥 Excepción en descuento de créditos:', error);
    return false;
  }
};
// ============================================================================
// FUNCIONES DE PROCESAMIENTO AUTOMÁTICO DE LLAMADAS NUEVAS
// ============================================================================

const isNewCallNeedingProcessing = (call: any) => {
  const finishedStates = ['completed', 'ended', 'finished'];
  const isFinished = finishedStates.includes(call.call_status?.toLowerCase());
  const hasDuration = call.duration_sec > 0;
  const notProcessed = !call.cost_usd || call.cost_usd === 0;
  const hasAgentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;

  return isFinished && hasDuration && notProcessed && hasAgentRate;
};

const processNewCallsAutomatically = async (
  calls: any[], 
  calculateCallCost: (call: any) => number,
  userId: string,
  setCalls: React.Dispatch<React.SetStateAction<any[]>>
) => {
  console.log('🤖 PROCESAMIENTO AUTOMÁTICO DE LLAMADAS NUEVAS');
  
  const newCallsToProcess = calls.filter(isNewCallNeedingProcessing);
  
  if (newCallsToProcess.length === 0) {
    console.log('✅ No hay llamadas nuevas para procesar automáticamente');
    return;
  }

  for (const call of newCallsToProcess) {
    try {
      console.log(`⚡ PROCESANDO AUTOMÁTICAMENTE: ${call.call_id}`);
      
      const calculatedCost = calculateCallCost(call);
      
      if (calculatedCost > 0) {
        const { error: updateError } = await supabase
          .from('calls')
          .update({ 
            cost_usd: calculatedCost,
            updated_at: new Date().toISOString()
          })
          .eq('call_id', call.call_id);

        if (updateError) {
          console.error(`❌ Error actualizando costo automáticamente:`, updateError);
          continue;
        }

        const deductionSuccess = await deductCallCost(call.call_id, calculatedCost, userId);
        
        if (deductionSuccess) {
          console.log(`🎉 DESCUENTO AUTOMÁTICO EXITOSO: ${call.call_id} - $${calculatedCost.toFixed(4)}`);
          
          setCalls(prevCalls => 
            prevCalls.map(c => 
              c.call_id === call.call_id 
                ? { ...c, cost_usd: calculatedCost }
                : c
            )
          );
// ✅ EMITIR EVENTO PARA DESCUENTO AUTOMÁTICO EN DASHBOARD
window.dispatchEvent(new CustomEvent('balanceUpdated', {
  detail: {
    userId: userId,
    deduction: calculatedCost,
    callId: call.call_id,
    source: 'automatic_call_processing'
  }
}));
console.log(`📡 Evento balanceUpdated emitido: $${calculatedCost} para ${call.call_id}`);
          
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error en procesamiento automático ${call.call_id}:`, error);
    }
  }
};
// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================
interface Call {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from_number: string;
  to_number: string;
  transcript?: string;
  call_summary?: string;
  sentiment?: string;
  recording_url?: string;
  end_reason?: string;
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

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'custom';
// ============================================================================
// COMPONENTE FILTRO DE AGENTES
// ============================================================================
const AgentFilter = ({ agents, selectedAgent, onAgentChange, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedAgentName = selectedAgent 
    ? agents.find(agent => agent.id === selectedAgent)?.name || 'Unknown Agent'
    : 'All Agents';

  if (isLoading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium text-gray-500 min-w-[160px]">
          <User className="w-4 h-4" />
          <span>Loading agents...</span>
        </div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm font-medium text-gray-500 min-w-[160px]">
          <User className="w-4 h-4" />
          <span>No agents assigned</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-w-[160px]"
      >
        <User className="w-4 h-4" />
        <span className="truncate flex-1 text-left">{selectedAgentName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  onAgentChange(null);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  selectedAgent === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <div>
                    <div className="font-medium">All Agents</div>
                    <div className="text-xs text-gray-500">Show all calls</div>
                  </div>
                </div>
              </button>
              
              {agents.length > 0 && <hr className="my-1" />}
              
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    onAgentChange(agent.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    selectedAgent === agent.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        ID: {agent.id.substring(0, 12)}...
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
// ============================================================================
// COMPONENTE PRINCIPAL - DECLARACIÓN Y ESTADOS
// ============================================================================
export default function CallsSimple() {
  const { user } = useAuth();
  const { getAgentName, isLoadingAgents } = useAgents();
  
  // Estados del componente
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAssignedAgents, setUserAssignedAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audioDurations, setAudioDurations] = useState<{[key: string]: number}>({});
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    totalCost: 0,
    totalDuration: 0,
    avgDuration: 0,
    completedCalls: 0
  });

  // Estados para sistema automático
  const [isProcessingAutomatic, setIsProcessingAutomatic] = useState(false);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState(new Date());
  const pollingIntervalRef = useRef(null);
  const subscriptionChannelRef = useRef(null);
  const lastCallCountRef = useRef(0);

  // Variables auxiliares
  const uniqueAgents = userAssignedAgents || [];

  const getAgentNameLocal = (agentId) => {
    const agent = userAssignedAgents.find(a => 
      a.id === agentId || a.retell_agent_id === agentId
    );
    
    if (agent) {
      return agent.name;
    }
    
    if (getAgentName) {
      return getAgentName(agentId);
    }
    
    return `Agent ${agentId.substring(0, 8)}...`;
  };
  // ============================================================================
  // FUNCIONES AUXILIARES DE CÁLCULO
  // ============================================================================
  
  const getCallDuration = (call: any) => {
    if (call.duration_sec && call.duration_sec > 0) {
      return call.duration_sec;
    }
    
    if (audioDurations[call.id] && audioDurations[call.id] > 0) {
      return audioDurations[call.id];
    }
    
    return 0;
  };

  const calculateCallCost = (call: Call) => {
    const durationMinutes = getCallDuration(call) / 60;
    let agentRate = 0;
    
    if (call.call_agent?.rate_per_minute) {
      agentRate = call.call_agent.rate_per_minute;
    } else if (call.agents?.rate_per_minute) {
      agentRate = call.agents.rate_per_minute;
    }
    
    if (agentRate === 0) {
      return call.cost_usd || 0;
    }
    
    return durationMinutes * agentRate;
  };

  const calculateCallCostSync = (call: Call) => {
    return calculateCallCost(call);
  };
  // ============================================================================
  // FUNCIÓN FETCH CALLS CORREGIDA
  // ============================================================================
  
  const fetchCalls = async () => {
    console.log("🔄 FETCH CALLS INICIADO - VERSIÓN CORREGIDA UNIVERSAL");
    
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select('agent_id')
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error("❌ Error obteniendo asignaciones:", assignmentsError);
        setError(`Error obteniendo asignaciones: ${assignmentsError.message}`);
        return;
      }

      if (!assignments || assignments.length === 0) {
        console.log("⚠️ Usuario sin asignaciones de agentes");
        setCalls([]);
        setUserAssignedAgents([]);
        setStats({
          total: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          completedCalls: 0
        });
        return;
      }

      const agentIds = assignments.map(a => a.agent_id);
      console.log("🎯 IDs de agentes asignados:", agentIds);

      const { data: agentDetails, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, rate_per_minute, retell_agent_id')
        .in('id', agentIds);

      if (agentsError) {
        console.error("❌ Error obteniendo detalles de agentes:", agentsError);
        setError(`Error obteniendo agentes: ${agentsError.message}`);
        return;
      }

      console.log("🤖 Detalles de agentes obtenidos:", agentDetails);
      setUserAssignedAgents(agentDetails || []);

      console.log("🔍 ESTRATEGIA MÚLTIPLE: Buscando llamadas de todas las formas posibles...");

      const agentUUIDs = agentDetails.map(agent => agent.id).filter(Boolean);
      const retellAgentIds = agentDetails.map(agent => agent.retell_agent_id).filter(Boolean);
      
      console.log("📋 IDs para búsqueda:");
      console.log("   • Agent UUIDs:", agentUUIDs);
      console.log("   • Retell Agent IDs:", retellAgentIds);

      const { data: callsByUUID, error: uuidError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', agentUUIDs)
        .order('timestamp', { ascending: false });

      const { data: callsByRetell, error: retellError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', retellAgentIds)
        .order('timestamp', { ascending: false });

      const agentPatterns = agentDetails.map(agent => `agent_${agent.id}`);
      const { data: callsByPattern, error: patternError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', agentPatterns)
        .order('timestamp', { ascending: false });

      const allCalls = [
        ...(callsByUUID || []),
        ...(callsByRetell || []),
        ...(callsByPattern || [])
      ];

      const uniqueCalls = allCalls.filter((call, index, self) => 
        index === self.findIndex(c => c.call_id === call.call_id)
      );

      console.log(`🎯 RESULTADO FINAL: ${uniqueCalls.length} llamadas únicas encontradas`);

      const userAgents = agentDetails?.map(agent => ({
        agent_id: agent.id,
        agents: agent
      })) || [];

      const mappedCalls = uniqueCalls.map(call => {
        let matchedAgent = null;

        const userAgentAssignment = userAgents.find(assignment => 
          assignment.agents.id === call.agent_id ||
          assignment.agents.retell_agent_id === call.agent_id ||
          `agent_${assignment.agents.id}` === call.agent_id
        );

        if (userAgentAssignment) {
          matchedAgent = {
            id: userAgentAssignment.agents.id,
            name: userAgentAssignment.agents.name,
            rate_per_minute: userAgentAssignment.agents.rate_per_minute
          };
        } else {
          matchedAgent = {
            id: call.agent_id,
            name: `Unknown Agent (${call.agent_id.substring(0, 8)}...)`,
            rate_per_minute: 0.02
          };
        }

        return {
          ...call,
          end_reason: call.disconnection_reason || null,
          call_agent: matchedAgent
        };
      });

      setCalls(mappedCalls || []);

    } catch (err: any) {
      console.error("❌ Excepción en fetch calls:", err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // ============================================================================
  // SISTEMA DE TIEMPO REAL - useEffects
  // ============================================================================

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    console.log('🚀 INICIANDO SISTEMA AUTOMÁTICO CON TIEMPO REAL para:', user.email);
    fetchCalls();

    return () => {
      console.log('🧹 Limpiando sistema automático...');
      cleanupSubscriptions();
    };
  }, [user?.id]);

  useEffect(() => {
    if (userAssignedAgents.length > 0 && user?.id && !subscriptionChannelRef.current) {
      console.log('🎯 Agentes disponibles, configurando tiempo real...');
      setupRealtimeSubscription();
      setupPolling();
    }
  }, [userAssignedAgents.length, user?.id]);

  useEffect(() => {
    if (!calls.length || !user?.id || loading || isProcessingAutomatic) {
      return;
    }

    const currentCallCount = calls.length;
    const previousCallCount = lastCallCountRef.current;
    
    const recentCalls = calls.filter(call => {
      const callTime = new Date(call.timestamp);
      return callTime > lastProcessedTimestamp;
    });

    if ((currentCallCount > previousCallCount && previousCallCount > 0) || recentCalls.length > 0) {
      console.log(`🚨 ACTIVANDO PROCESAMIENTO AUTOMÁTICO`);
      
      setIsProcessingAutomatic(true);
      
      processNewCallsAutomatically(calls, calculateCallCost, user.id, setCalls)
        .then(() => {
          setLastProcessedTimestamp(new Date());
          window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { 
              userId: user.id,
              source: 'automatic_processing',
              timestamp: new Date().toISOString()
            }
          }));
        })
        .finally(() => {
          setIsProcessingAutomatic(false);
        });
    }

    lastCallCountRef.current = currentCallCount;
    
  }, [calls.length, user?.id, loading]);

  useEffect(() => {
    if (calls.length > 0) {
      applyFiltersAndSort();
    }
  }, [calls, searchTerm, statusFilter, agentFilter, dateFilter, customDate]);

  useEffect(() => {
    const loadAllAudioDurations = async () => {
      const callsWithAudio = calls.filter(call => call.recording_url);
      
      for (let i = 0; i < callsWithAudio.length; i += 3) {
        const batch = callsWithAudio.slice(i, i + 3);
        await Promise.all(batch.map(call => loadAudioDuration(call)));
        if (i + 3 < callsWithAudio.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    if (calls.length > 0) {
      loadAllAudioDurations();
    }
  }, [calls]);

  useEffect(() => {
    if (!loading && calls.length > 0) {
      let totalCost = 0;
      let totalDuration = 0;
      let completedCalls = 0;

      calls.forEach((call) => {
        const duration = getCallDuration(call);
        totalDuration += duration;
        const callCost = calculateCallCostSync(call);
        totalCost += callCost;
        if (['completed', 'ended'].includes(call.call_status?.toLowerCase())) {
          completedCalls++;
        }
      });

      const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

      setStats({
        total: calls.length,
        totalCost: Number(totalCost.toFixed(4)),
        totalDuration,
        avgDuration,
        completedCalls
      });
    } else if (!loading && calls.length === 0) {
      setStats({
        total: 0,
        totalCost: 0,
        totalDuration: 0,
        avgDuration: 0,
        completedCalls: 0
      });
    }
  }, [calls, loading, audioDurations]);
  // ============================================================================
  // FUNCIONES DEL SISTEMA DE TIEMPO REAL
  // ============================================================================

  const setupRealtimeSubscription = () => {
    if (subscriptionChannelRef.current || !userAssignedAgents.length) {
      return;
    }

    console.log('📡 Configurando suscripción en tiempo real...');
    
    const allAgentIds = userAssignedAgents.flatMap(agent => [
      agent.id,
      agent.retell_agent_id
    ]).filter(Boolean);

    const channel = supabase
      .channel('calls_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls'
        },
        (payload) => {
          handleRealtimeChange(payload, allAgentIds);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeSubscription('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeSubscription('error');
        }
      });

    subscriptionChannelRef.current = channel;
  };

  const handleRealtimeChange = async (payload, userAgentIds) => {
    const { eventType, new: newRecord } = payload;
    
    const isUserCall = newRecord?.agent_id && userAgentIds.includes(newRecord.agent_id);
    
    if (!isUserCall) {
      return;
    }

    switch (eventType) {
      case 'INSERT':
        setTimeout(() => {
          fetchCalls();
        }, 2000);
        break;
        
      case 'UPDATE':
        const wasCompleted = newRecord?.call_status === 'completed';
        const wasEnded = newRecord?.call_status === 'ended';
        
        if (wasCompleted || wasEnded) {
          setTimeout(async () => {
            await fetchCalls();
          }, 3000);
        } else {
          setTimeout(() => fetchCalls(), 1000);
        }
        break;
        
      case 'DELETE':
        setTimeout(() => fetchCalls(), 1000);
        break;
    }
  };

  const setupPolling = () => {
    if (pollingIntervalRef.current) {
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      if (!isProcessingAutomatic && !loading) {
        fetchCalls();
      }
    }, 60000);
  };

  const cleanupSubscriptions = () => {
    if (subscriptionChannelRef.current) {
      subscriptionChannelRef.current.unsubscribe();
      subscriptionChannelRef.current = null;
      setRealtimeSubscription(null);
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  // ============================================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================================

  const loadAudioDuration = async (call: Call) => {
    if (!call.recording_url || audioDurations[call.id]) return;
    
    try {
      const audio = new Audio(call.recording_url);
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          setAudioDurations(prev => ({
            ...prev,
            [call.id]: duration
          }));
          resolve();
        });
        
        audio.addEventListener('error', () => {
          resolve();
        });
      });
    } catch (error) {
      console.log(`❌ Error loading audio duration:`, error);
    }
  };

  const isDateInRange = (callTimestamp: string): boolean => {
    const callDate = new Date(callTimestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const callDateOnly = new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    switch (dateFilter) {
      case 'all':
        return true;
      case 'today':
        return callDateOnly.getTime() === todayOnly.getTime();
      case 'yesterday':
        return callDateOnly.getTime() === yesterdayOnly.getTime();
      case 'last7days':
        return callDate >= last7Days;
      case 'custom':
        if (!customDate) return true;
        const selectedDate = new Date(customDate);
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return callDateOnly.getTime() === selectedDateOnly.getTime();
      default:
        return true;
    }
  };

  const handleDateFilterChange = (newFilter: DateFilter) => {
    setDateFilter(newFilter);
    if (newFilter !== 'custom') {
      setCustomDate('');
    }
  };

  const getDateFilterText = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'last7days':
        return 'Last 7 days';
      case 'custom':
        return customDate ? new Date(customDate).toLocaleDateString() : 'Custom date';
      default:
        return 'All dates';
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...calls];

    if (searchTerm) {
      filtered = filtered.filter(call => 
        call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.from_number.includes(searchTerm) ||
        call.to_number.includes(searchTerm) ||
        call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (call.call_agent?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(call => call.call_status === statusFilter);
    }

    if (agentFilter !== null) {
      const selectedAgent = userAssignedAgents.find(agent => agent.id === agentFilter);
      if (selectedAgent) {
        filtered = filtered.filter(call => {
          const matchesId = call.agent_id === selectedAgent.id;
          const matchesRetell = call.agent_id === selectedAgent.retell_agent_id;
          return matchesId || matchesRetell;
        });
      } else {
        filtered = [];
      }
    }

    filtered = filtered.filter(call => isDateInRange(call.timestamp));

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'timestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCalls(filtered);
  };
  // ============================================================================
  // FUNCIONES DE FORMATO
  // ============================================================================

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'ended': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      case 'neutral': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getEndReasonColor = (endReason: string) => {
    if (!endReason) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    switch (endReason.toLowerCase()) {
      case 'user hangup':
      case 'user_hangup':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'agent hangup':
      case 'agent_hangup':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'dial no answer':
      case 'dial_no_answer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error llm websocket open':
      case 'error_llm_websocket_open':
      case 'technical_error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'call completed':
      case 'call_completed':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return "0:00";
    }
    
    const numSeconds = Number(seconds);
    if (numSeconds === 0) {
      return "0:00";
    }
    
    const mins = Math.floor(numSeconds / 60);
    const secs = Math.floor(numSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    const roundedAmount = Math.round((amount || 0) * 10000) / 10000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(roundedAmount);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'unknown') return 'Unknown';
    return phone;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ? '↑' : '↓';
  };
  // ============================================================================
  // HANDLERS DE EVENTOS
  // ============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCallClick = (call: Call) => {
    const originalCall = calls.find(c => c.id === call.id) || call;
    setSelectedCall(originalCall);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCall(null);
  };

  // Variables auxiliares para la UI
  const uniqueStatuses = [...new Set(calls.map(call => call.call_status))];
  const selectedAgentName = agentFilter ? getAgentNameLocal(agentFilter) : null;

  // ============================================================================
  // VERIFICACIÓN DE USUARIO
  // ============================================================================

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Please log in to view your calls</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  // ============================================================================
  // RENDER DEL COMPONENTE
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <div className="space-y-6">
          {/* Header con Sistema Automático */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📞 Call Management</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-600">
                  Comprehensive call data for your account
                  {selectedAgentName && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • Filtered by {selectedAgentName}
                    </span>
                  )}
                </p>
                
                {/* Indicadores del Sistema Automático */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      realtimeSubscription === 'connected' ? 'bg-green-500 animate-pulse' :
                      realtimeSubscription === 'error' ? 'bg-red-500' :
                      'bg-yellow-500 animate-bounce'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      realtimeSubscription === 'connected' ? 'text-green-600' :
                      realtimeSubscription === 'error' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {realtimeSubscription === 'connected' ? 'Live Updates' :
                       realtimeSubscription === 'error' ? 'Connection Error' :
                       'Connecting...'}
                    </span>
                  </div>
                  
                  {isProcessingAutomatic && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <span className="text-xs font-medium text-blue-600">Auto Processing</span>
                    </div>
                  )}
                  
                  <span className="text-xs text-gray-400">
                    Last update: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <User className="w-3 h-3 mr-1" />
                Active User
              </Badge>
              
              <Button
                onClick={() => {
                  console.log("🔄 REFRESH MANUAL - Solo refrescando datos");
                  fetchCalls();
                }}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-gray-500 border-gray-300"
              >
                {loading ? (
                  <div className="flex items-center gap-1">
                    <LoadingSpinner size="sm" />
                    <span className="text-xs">Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-gray-400 rounded-full"></div>
                    <span className="text-xs">Manual Sync</span>
                  </div>
                )}
              </Button>
              
              <div className="text-right">
                <div className="text-xs font-medium text-green-600">🤖 Auto System</div>
                <div className="text-xs text-gray-500">
                  {realtimeSubscription === 'connected' ? 'Active' : 'Starting...'}
                </div>
              </div>
            </div>
          </div>
          {/* Indicador de procesamiento automático */}
          {isProcessingAutomatic && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-blue-700 font-medium">
                    🤖 Procesando llamadas nuevas automáticamente...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800 font-medium">❌ {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedCalls}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Cost</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Duration</p>
                    <p className="text-xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Avg Duration</p>
                    <p className="text-xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-pink-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search calls by ID, phone, agent, or summary..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <AgentFilter
                  agents={uniqueAgents}
                  selectedAgent={agentFilter}
                  onAgentChange={setAgentFilter}
                  isLoading={isLoadingAgents}
                />

                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <select
                    value={dateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value as DateFilter)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>

                {dateFilter === 'custom' && (
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-auto"
                  />
                )}

                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {dateFilter !== 'all' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">
                      📅 {getDateFilterText()}
                    </Badge>
                  )}
                  Showing {filteredCalls.length} of {calls.length} calls
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Calls Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                📋 Call History ({filteredCalls.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                  <span className="ml-3 text-gray-600">Loading calls...</span>
                </div>
              ) : filteredCalls.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No calls found</p>
                  <p className="text-sm">
                    {dateFilter !== 'all' 
                      ? `No calls found for ${getDateFilterText().toLowerCase()}`
                      : 'No calls match your current filters'
                    }
                  </p>
                  {dateFilter !== 'all' && (
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setDateFilter('all');
                          setCustomDate('');
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        📅 Show All Dates
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('timestamp')}
                            className="flex items-center gap-1 hover:text-gray-700"
                          >
                            Date & Time {getSortIcon('timestamp')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('duration_sec')}
                            className="flex items-center gap-1 hover:text-gray-700"
                          >
                            Duration {getSortIcon('duration_sec')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('cost_usd')}
                            className="flex items-center gap-1 hover:text-gray-700"
                          >
                            Cost {getSortIcon('cost_usd')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('call_status')}
                            className="flex items-center gap-1 hover:text-gray-700"
                          >
                            Status {getSortIcon('call_status')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Content
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCalls.map((call, index) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleCallClick(call)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">
                              {formatDate(call.timestamp).split(',')[0]}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(call.timestamp)}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 flex items-center gap-1 mb-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {formatPhoneNumber(call.from_number)} → {formatPhoneNumber(call.to_number)}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              ID: {call.call_id.substring(0, 16)}...
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {call.call_agent?.name || getAgentNameLocal(call.agent_id)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {call.agent_id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDuration(getCallDuration(call))}
                            </div>
                            <div className="text-xs text-gray-500">
                              {audioDurations[call.id] ? 
                                `${getCallDuration(call)}s (from audio)` : 
                                `${getCallDuration(call)}s`
                              }
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(calculateCallCostSync(call))}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
                                return agentRate ? 
                                  `${(getCallDuration(call)/60).toFixed(1)}min × ${agentRate}/min` :
                                  `DB: ${formatCurrency(call.cost_usd)}`;
                              })()}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <Badge className={`text-xs ${getStatusColor(call.call_status)}`}>
                                {call.call_status}
                              </Badge>
                              {call.sentiment && (
                                <Badge className={`text-xs ${getSentimentColor(call.sentiment)}`}>
                                  {call.sentiment}
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {call.end_reason ? (
                              <Badge className={`text-xs ${getEndReasonColor(call.end_reason)}`}>
                                {call.end_reason.replace(/_/g, ' ')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">No reason</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {call.transcript && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <FileText className="h-3 w-3" />
                                  Transcript
                                </div>
                              )}
                              {call.call_summary && (
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                  <PlayCircle className="h-3 w-3" />
                                  Summary
                                </div>
                              )}
                              {call.recording_url && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <Volume2 className="h-3 w-3" />
                                  Audio
                                </div>
                              )}
                            </div>
                            {call.call_summary && (
                              <div className="text-xs text-gray-600 mt-1 max-w-xs truncate">
                                {call.call_summary}
                              </div>
                            )}
                          </td>
                          
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallClick(call);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              {call.recording_url && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <a
                                    href={call.recording_url}
                                    download={`call-${call.call_id}.mp3`}
                                  >
                                    <Download className="h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Call Detail Modal */}
          <CallDetailModal 
            call={selectedCall}
            isOpen={isModalOpen}
            onClose={handleModalClose}
            audioDuration={selectedCall ? audioDurations[selectedCall.id] : undefined}
            userAssignedAgents={userAssignedAgents}
            getAgentNameFunction={getAgentNameLocal}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

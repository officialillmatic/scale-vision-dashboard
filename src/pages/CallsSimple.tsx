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
// FUNCIONES DE DESCUENTO AUTOMÁTICO - AGREGAR DESPUÉS DE LOS IMPORTS
// ============================================================================

// FUNCIÓN: Descontar costo de llamada del balance del usuario
// ✅ FUNCIÓN CORREGIDA FINAL: Descontar costo de llamada del balance del usuario
const deductCallCost = async (callId: string, callCost: number, userId: string) => {
  if (!callCost || callCost <= 0) {
    console.log(`⚠️ No se descuenta - costo inválido: $${callCost}`);
    return false;
  }

  try {
    console.log(`💳 Descontando $${callCost.toFixed(4)} del balance del usuario ${userId}`);
    console.log(`🔍 Call ID string recibido: ${callId}`);

    // ✅ PASO 1: Buscar el UUID real de la llamada usando call_id
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('id, call_id')
      .eq('call_id', callId)
      .single();

    if (callError || !callData) {
      console.error('❌ No se encontró la llamada:', callError);
      return false;
    }

    const callUUID = callData.id; // Este es el UUID real
    console.log(`🆔 UUID real de la llamada: ${callUUID}`);

    // ✅ PASO 2: Verificar transacción existente usando el UUID real
    const { data: existingTransaction, error: checkError } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('call_id', callUUID) // Usar UUID, no string
      .eq('transaction_type', 'debit')
      .single();

    if (existingTransaction) {
      console.log(`✅ El costo ya fue descontado para la llamada ${callId}`);
      return true;
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error verificando transacción existente:', checkError);
      return false;
    }

    // ✅ PASO 3: Obtener balance actual del usuario
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

    console.log(`💰 Balance actual: $${currentBalance.toFixed(4)}`);
    console.log(`💰 Nuevo balance: $${newBalance.toFixed(4)}`);

    if (newBalance < 0) {
      console.warn(`⚠️ Balance quedará negativo: $${currentBalance} - $${callCost} = $${newBalance}`);
      // Continuar con el descuento aunque quede negativo (decisión de negocio)
    }

    // ✅ PASO 4: Actualizar balance del usuario
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

    console.log('✅ Balance actualizado exitosamente');

    // ✅ PASO 5: Registrar transacción con UUID real
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        call_id: callUUID, // ¡Ahora usamos el UUID real!
        amount: callCost,
        transaction_type: 'debit',
        description: `Call cost deduction - Call ID: ${callId}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error registrando transacción:', transactionError);
      console.error('❌ Detalles del error:', JSON.stringify(transactionError, null, 2));
      
      // Revertir el balance si falla el registro
      await supabase
        .from('user_credits')
        .update({ current_balance: currentBalance })
        .eq('user_id', userId);
      return false;
    }

    console.log(`🎉 DESCUENTO EXITOSO COMPLETO:`);
    console.log(`   • Balance: $${currentBalance.toFixed(4)} → $${newBalance.toFixed(4)}`);
    console.log(`   • Transacción registrada con UUID: ${callUUID}`);
    console.log(`   • Call ID original: ${callId}`);
    // 🆕 NUEVA LÍNEA: Forzar actualización del balance en tiempo real
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
// FUNCIÓN: Procesar llamadas pendientes CON descuento automático
// 🔧 REEMPLAZAR LA FUNCIÓN processPendingCallCostsWithDeduction EN CallsSimple.tsx (línea ~119)

const processPendingCallCostsWithDeduction = async (
  calls: Call[], 
  setCalls: React.Dispatch<React.SetStateAction<Call[]>>,
  calculateCallCost: (call: Call) => number,
  getCallDuration: (call: Call) => number,
  userId: string
) => {
  console.log('🔍 Procesando costos y descuentos automáticos...');
  console.log('📞 Total calls recibidas:', calls.length);
  console.log('👤 User ID:', userId);

  // 🎯 DEBUG: Analizar todas las llamadas
  calls.forEach((call, index) => {
    const duration = getCallDuration(call);
    const currentCost = call.cost_usd || 0;
    const hasAgentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute || false;
    
    console.log(`📞 Call ${index + 1}:`, {
      id: call.call_id.substring(0, 12),
      status: call.call_status,
      duration: duration,
      currentCost: currentCost,
      agentRate: hasAgentRate,
      passes_filter: call.call_status === 'completed' && duration > 0 && currentCost === 0 && hasAgentRate
    });
  });
  
  // 🔧 FILTRO CORREGIDO Y MÁS PERMISIVO
  const pendingCalls = calls.filter(call => {
    const duration = getCallDuration(call);
    const currentCost = call.cost_usd || 0;
    const hasAgentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
    
    // ✅ INCLUIR TANTO 'completed' COMO 'ended'
    const validStatus = call.call_status === 'completed' || call.call_status === 'ended';
    
    return (
      validStatus &&
      duration > 0 &&
      currentCost === 0 &&
      hasAgentRate > 0  // ✅ Verificar que la tarifa sea > 0
    );
  });

  console.log(`🔍 Llamadas que pasan el filtro: ${pendingCalls.length}`);
  
  if (pendingCalls.length === 0) {
    console.log('✅ Todas las llamadas tienen costos y descuentos procesados');
    return;
  }

  console.log(`🎯 Procesando ${pendingCalls.length} llamadas con descuentos`);

  for (const call of pendingCalls) {
    const calculatedCost = await calculateCallCost(call);
    
    if (calculatedCost > 0) {
      try {
        console.log(`💾 Actualizando costo para llamada ${call.call_id}: $${calculatedCost.toFixed(4)}`);
        
        // Actualizar costo en la base de datos
        const { error: updateError } = await supabase
          .from('calls')
          .update({ 
            cost_usd: calculatedCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', call.id);

        if (!updateError) {
          console.log(`✅ Costo actualizado para llamada ${call.call_id}`);
          
          // 🎯 DESCONTAR DEL BALANCE DEL USUARIO
          const deductionSuccess = await deductCallCost(call.call_id, calculatedCost, userId);
          
          if (deductionSuccess) {
            console.log(`🎉 Descuento aplicado exitosamente para llamada ${call.call_id}`);
          } else {
            console.warn(`⚠️ Falló el descuento para llamada ${call.call_id}`);
          }
          
          // Actualizar estado local
          setCalls(prevCalls => 
            prevCalls.map(c => 
              c.id === call.id 
                ? { ...c, cost_usd: calculatedCost }
                : c
            )
          );
        } else {
          console.error(`❌ Error actualizando costo para llamada ${call.call_id}:`, updateError);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('❌ Excepción procesando llamada:', err);
      }
    }
  }

  console.log('🎉 Finalizó el procesamiento de costos y descuentos');
};
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
// PROCESADOR AUTOMÁTICO DE COSTOS
const processPendingCallCosts = async (
  calls: Call[], 
  setCalls: React.Dispatch<React.SetStateAction<Call[]>>,
  calculateCallCost: (call: Call) => number,
  getCallDuration: (call: Call) => number
) => {
  console.log('🔍 Checking for calls that need cost calculation...');
  
  const pendingCalls = calls.filter(call => {
    const duration = getCallDuration(call);
    const currentCost = call.cost_usd || 0;
    const hasAgentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
    
    return (
      call.call_status === 'completed' &&
      duration > 0 &&
      currentCost === 0 &&
      hasAgentRate
    );
  });

  if (pendingCalls.length === 0) {
    console.log('✅ All calls have proper costs calculated');
    return;
  }

  console.log(`🎯 Found ${pendingCalls.length} calls that need cost calculation`);

  for (const call of pendingCalls) {
    const calculatedCost = await calculateCallCost(call);
    
    if (calculatedCost > 0) {
      try {
        console.log(`💾 Updating cost for call ${call.call_id}: $${calculatedCost.toFixed(4)}`);
        
        const { error } = await supabase
          .from('calls')
          .update({ 
            cost_usd: calculatedCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', call.id);

        if (!error) {
          console.log(`✅ Successfully updated cost for call ${call.call_id}`);
          setCalls(prevCalls => 
            prevCalls.map(c => 
              c.id === call.id 
                ? { ...c, cost_usd: calculatedCost }
                : c
            )
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('❌ Exception updating call cost:', err);
      }
    }
  }

  console.log('🎉 Finished processing pending call costs');
};
// COMPONENTE FILTRO DE AGENTES
const AgentFilter = ({ agents, selectedAgent, onAgentChange, isLoading }: {
  agents: any[];
  selectedAgent: string | null;
  onAgentChange: (agentId: string | null) => void;
  isLoading: boolean;
}) => {
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
export default function CallsSimple() {
  const { user } = useAuth();
  const { getAgentName, getUniqueAgentsFromCalls, isLoadingAgents } = useAgents();
  
  // Estados del componente
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ✅ NUEVAS VARIABLES PARA SISTEMA AUTOMÁTICO
const [isProcessing, setIsProcessing] = useState(false);
const subscriptionRef = useRef(null);

  // Variables derivadas
  const uniqueAgents = getUniqueAgentsFromCalls(calls);
  // 🔍 DEBUGGING DEL FILTRO
console.log("🔍 FILTRO DEBUG - calls.length:", calls.length);
console.log("🔍 FILTRO DEBUG - uniqueAgents:", uniqueAgents);
console.log("🔍 FILTRO DEBUG - uniqueAgents.length:", uniqueAgents.length);
  const selectedAgentName = agentFilter ? getAgentName(agentFilter) : null;
  console.log("🔍 AgentFilter props - agents:", uniqueAgents);
console.log("🔍 AgentFilter props - isLoading:", isLoadingAgents);

  // useEffect hooks
  // 🚨 DEBUGGING CRÍTICO - useEffect modificado
useEffect(() => {
  console.log('🚨 USER CHANGE DETECTED:', {
    userId: user?.id,
    userEmail: user?.email,
    userExists: !!user,
    willFetchCalls: !!user?.id
  });
  
  if (user?.id) {
    console.log('✅ EXECUTING fetchCalls for user:', user.email);
    fetchCalls();
  } else {
    console.log('❌ NOT executing fetchCalls - no user.id');
  }
}, [user?.id]);


  
  // 🔧 REEMPLAZAR EL useEffect QUE ESTÁ EN LA LÍNEA ~300 APROXIMADAMENTE
// Buscar este useEffect y reemplazarlo completamente:


  // 🎯 AGREGAR ESTE useEffect SEPARADO - NO REEMPLAZAR EL ACTUAL
// 🔥 SISTEMA DEFINITIVO - REEMPLAZAR TODO EL useEffect PROBLEMÁTICO
// Buscar AMBOS useEffect que modificaste y reemplazarlos con ESTE ÚNICO:



  // ✅ FUNCIÓN: Maneja las notificaciones de cambios
  const handleCallChange = async (payload) => {
    const { eventType, new: newRecord } = payload;
    
    console.log(`🔔 Tipo de cambio: ${eventType}`);
    console.log('📞 Datos de la llamada:', newRecord);

    // Si es una llamada nueva o actualizada
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      console.log('⏱️ Esperando 3 segundos antes de procesar...');
      
      // Esperar un poco para que todos los datos estén listos
      setTimeout(async () => {
        await processNewCall(newRecord);
        // Recargar llamadas para mostrar cambios
        fetchCalls();
      }, 3000); // 3 segundos de espera
    }
  };

  // ✅ FUNCIÓN: Procesa cada llamada nueva
  const processNewCall = async (callRecord) => {
    // Evitar procesar múltiples llamadas al mismo tiempo
    if (isProcessing) {
      console.log('⏳ Ya estoy procesando otra llamada, esperando...');
      return;
    }

    setIsProcessing(true);
    console.log('🔄 Procesando llamada:', callRecord.call_id);

    try {
      // Verificar si esta llamada necesita descuento
      if (callNeedsProcessing(callRecord)) {
        console.log('✅ Esta llamada necesita descuento automático');
        await calculateAndDeduct(callRecord);
      } else {
        console.log('❌ Esta llamada no necesita procesamiento:', {
          estado: callRecord.call_status,
          duracion: callRecord.duration_sec,
          costo_actual: callRecord.cost_usd
        });
      }
    } catch (error) {
      console.error('❌ Error procesando llamada:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FUNCIÓN: Verificar si la llamada necesita procesamiento
  const callNeedsProcessing = (call) => {
    // Estados que indican que la llamada terminó
    const finishedStates = ['completed', 'ended', 'finished'];
    const isFinished = finishedStates.includes(call.call_status?.toLowerCase());
    
    // Tiene duración (no fue una llamada fallida)
    const hasDuration = call.duration_sec > 0;
    
    // No ha sido procesada (no tiene costo asignado)
    const notProcessed = !call.cost_usd || call.cost_usd === 0;

    console.log('🔍 Verificando si necesita procesamiento:', {
      id: call.call_id,
      estado: call.call_status,
      terminada: isFinished,
      duracion: call.duration_sec,
      tiene_duracion: hasDuration,
      costo_actual: call.cost_usd,
      no_procesada: notProcessed
    });

    return isFinished && hasDuration && notProcessed;
  };

  // ✅ FUNCIÓN: Calcular y descontar automáticamente
  const calculateAndDeduct = async (call) => {
    try {
      console.log('💰 Calculando costo para llamada:', call.call_id);
      
      // Buscar el agente en nuestros datos locales
      const agentData = uniqueAgents.find(agent => 
        agent.id === call.agent_id || agent.retell_agent_id === call.agent_id
      );

      if (!agentData?.rate_per_minute) {
        console.error('❌ No se pudo obtener tarifa del agente para:', call.agent_id);
        return;
      }

      const duration = call.duration_sec;
      const cost = (duration / 60) * agentData.rate_per_minute;

      console.log('📊 Cálculo automático:', {
        agente: agentData.name,
        duracion: `${duration} segundos`,
        tarifa: `$${agentData.rate_per_minute}/minuto`,
        costo_total: `$${cost.toFixed(4)}`
      });

      if (cost > 0) {
        console.log('💳 Ejecutando descuento automático...');
        
        // Usar tu función existente deductCallCost
        const deductionSuccess = await deductCallCost(call.call_id, cost, user.id);
        
        if (deductionSuccess) {
          console.log('✅ ¡Descuento automático exitoso!');
          
          // Actualizar costo en la base de datos
          const { error } = await supabase
            .from('calls')
            .update({ cost_usd: cost })
            .eq('call_id', call.call_id);
            
          if (!error) {
            console.log('💾 Costo actualizado en base de datos');
          }
        } else {
          console.error('❌ Error en descuento automático');
        }
      }

    } catch (error) {
      console.error('❌ Error en calculateAndDeduct:', error);
    }
  };
  
  // 🎯 PASO 2: REEMPLAZAR EL useEffect PROBLEMÁTICO (línea ~578)
// Elimina el useEffect existente y reemplázalo con este:

// 🎯 SISTEMA ÚNICO Y SIMPLE - Reemplazar todos los useEffect anteriores
useEffect(() => {
  if (!calls.length || !user?.id || loading) return;
  
  console.log('🚀 SISTEMA ÚNICO: Procesando llamadas...');
  
  // Aplicar filtros
  applyFiltersAndSort();
  
  // Buscar llamadas que necesitan costo
  const needsProcessing = calls.filter(call => {
    const duration = getCallDuration(call);
    const currentCost = parseFloat(call.cost_usd || 0);
    const hasRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
    const isComplete = call.call_status === 'completed' || call.call_status === 'ended';
    
    return isComplete && duration > 0 && currentCost === 0 && hasRate > 0;
  });
  
  console.log(`🎯 Llamadas a procesar: ${needsProcessing.length}`);
  
  // Procesar cada llamada
  needsProcessing.forEach(async (call) => {
    try {
      const duration = getCallDuration(call);
      const rate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
      const cost = (duration / 60) * rate;
      
      console.log(`💰 Procesando: ${call.call_id} - $${cost.toFixed(4)}`);
      
      // 1. Actualizar costo en BD
      const { error } = await supabase
        .from('calls')
        .update({ cost_usd: cost })
        .eq('call_id', call.call_id);
        
      if (error) {
        console.error(`❌ Error actualizando ${call.call_id}:`, error);
        return;
      }
      
      console.log(`✅ Costo guardado: ${call.call_id}`);
      
      // 2. Descontar del balance
      const success = await deductCallCost(call.call_id, cost, user.id);
      
      if (success) {
        console.log(`🎉 DESCUENTO EXITOSO: ${call.call_id} - $${cost.toFixed(4)}`);
        
        // 3. Actualizar estado local
        setCalls(prev => prev.map(c => 
          c.call_id === call.call_id ? { ...c, cost_usd: cost } : c
        ));
      } else {
        console.error(`❌ Falló descuento: ${call.call_id}`);
      }
      
    } catch (error) {
      console.error(`❌ Error procesando ${call.call_id}:`, error);
    }
  });
  
}, [calls.length, user?.id, loading]); // Solo cuando cambie el número de llamadas

// 🔔 PASO 4: REEMPLAZAR EL SEGUNDO useEffect (línea ~610)
// Elimina el useEffect de "respaldo" y reemplázalo con este detector de llamadas nuevas:

useEffect(() => {
  console.log('🔔 Detector de llamadas nuevas activado');
  
  if (calls.length > 0 && user?.id && !loading) {
    // Encontrar llamadas muy recientes (últimos 5 minutos) sin procesar
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentUnprocessedCalls = calls.filter(call => {
      const callTime = new Date(call.timestamp);
      const isRecent = callTime > fiveMinutesAgo;
      const needsProcessing = (call.cost_usd || 0) === 0 && 
                             getCallDuration(call) > 0 && 
                             (call.call_status === 'completed' || call.call_status === 'ended');
      
      return isRecent && needsProcessing;
    });

    if (recentUnprocessedCalls.length > 0) {
      console.log(`🚨 LLAMADAS NUEVAS DETECTADAS: ${recentUnprocessedCalls.length}`);
      
      recentUnprocessedCalls.forEach(async (call) => {
        console.log(`⚡ PROCESAMIENTO INMEDIATO para llamada nueva: ${call.call_id}`);
        
        const cost = calculateCallCost(call);
        
        if (cost > 0) {
          // Actualizar base de datos y descontar balance
          try {
            // Actualizar costo en la base de datos
            await supabase
              .from('calls')
              .update({ cost_usd: cost })
              .eq('id', call.id);
            
            // Ejecutar descuento del balance
            const deductionSuccess = await deductCallCost(call.call_id, cost, user.id);
            
            if (deductionSuccess) {
              console.log(`🎉 NUEVA LLAMADA PROCESADA AUTOMÁTICAMENTE: ${call.call_id} - $${cost.toFixed(4)}`);
              
              // Actualizar estado local inmediatamente
              setCalls(prevCalls => 
                prevCalls.map(c => 
                  c.id === call.id 
                    ? { ...c, cost_usd: cost }
                    : c
                )
              );
            }
          } catch (error) {
            console.error(`❌ Error procesando llamada nueva:`, error);
          }
        }
      });
    } else {
      console.log('✅ No hay llamadas nuevas sin procesar');
    }
  }
}, [calls.length, user?.id]); // Solo disparar cuando cambie la cantidad de llamadas

  // 🧪 FUNCIÓN DE PRUEBA MANUAL
const testManualDeduction = async () => {
  console.log('🧪 PROBANDO SISTEMA DE BALANCE...');
  
  if (!user?.id) {
    alert('Usuario no identificado');
    return;
  }

  try {
    // Company ID fijo - ajustar si es diferente
    const companyId = '1e3d4267-f288-4921-8360-3855100ff4a';
    
    console.log('🔍 Buscando llamadas sin procesar...');
    
    // Buscar llamadas completadas sin costo asignado
    const { data: unprocessedCalls, error } = await supabase
      .from('calls')
      .select(`
        id,
        call_id,
        duration_sec,
        cost_usd,
        call_status,
        agent_id
      `)
      .eq('call_status', 'completed')
      .gt('duration_sec', 0)
      .eq('cost_usd', 0)
      .limit(5);

    if (error) {
      console.error('❌ Error obteniendo llamadas:', error);
      alert('❌ Error obteniendo llamadas');
      return;
    }

    console.log(`📞 Encontradas ${unprocessedCalls?.length || 0} llamadas sin procesar`);

    if (!unprocessedCalls || unprocessedCalls.length === 0) {
      alert('📞 No hay llamadas sin procesar');
      return;
    }

    // Procesar cada llamada
    for (const call of unprocessedCalls) {
      console.log(`⚙️ Procesando llamada: ${call.call_id}`);
      
      // Usar tu función calculateCallCost para obtener el costo correcto
const costAmount = await calculateCallCost(call);

console.log(`💰 Costo calculado con calculateCallCost: $${costAmount.toFixed(4)}`);
      
      // Actualizar costo en calls - VERSIÓN CORREGIDA
const { error: updateError } = await supabase
  .from('calls')
  .update({ 
    cost_usd: costAmount
  })
  .eq('call_id', call.call_id); // Usar call_id en lugar de id

      if (updateError) {
        console.error('❌ Error actualizando llamada:', updateError);
      } else {
        console.log(`✅ Llamada ${call.call_id} procesada exitosamente`);
      }
    }

    alert(`✅ Procesadas ${unprocessedCalls.length} llamadas! Revisa la consola.`);
    
    // Recargar llamadas
    await fetchCalls();

  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error en el procesamiento');
  }
};

  // 🔍 FUNCIÓN DE VERIFICACIÓN DEL SISTEMA - AGREGAR DESPUÉS DE testManualDeduction
const verifyAutoDeductionSystem = () => {
  console.log('🔍 VERIFICANDO SISTEMA DE DESCUENTOS AUTOMÁTICOS');
  console.log('=====================================');
  
  // Analizar estado actual
  const pendingCalls = calls.filter(call => {
    const duration = getCallDuration(call);
    const currentCost = call.cost_usd || 0;
    const hasAgentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
    const validStatus = call.call_status === 'completed' || call.call_status === 'ended';
    
    return validStatus && duration > 0 && currentCost === 0 && hasAgentRate > 0;
  });
  
  // Analizar llamadas recientes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentCalls = calls.filter(call => {
    const callTime = new Date(call.timestamp);
    return callTime > fiveMinutesAgo;
  });
  
  console.log('📊 ESTADO DEL SISTEMA:', {
    totalCalls: calls.length,
    userId: user?.id,
    loading: loading,
    pendingCallsCount: pendingCalls.length,
    recentCallsCount: recentCalls.length,
    systemActive: calls.length > 0 && user?.id && !loading
  });
  
  console.log('🎯 LLAMADAS PENDIENTES DE PROCESAMIENTO:');
  pendingCalls.forEach((call, index) => {
    const cost = calculateCallCost(call);
    console.log(`${index + 1}. ${call.call_id}:`, {
      status: call.call_status,
      duration: getCallDuration(call),
      currentCost: call.cost_usd,
      calculatedCost: cost,
      agentRate: call.call_agent?.rate_per_minute
    });
  });
  
  console.log('⏰ LLAMADAS RECIENTES (últimos 5 minutos):');
  recentCalls.forEach((call, index) => {
    console.log(`${index + 1}. ${call.call_id}:`, {
      timestamp: call.timestamp,
      status: call.call_status,
      cost: call.cost_usd
    });
  });
  
  // Mostrar resultado en pantalla
  const message = `✅ VERIFICACIÓN COMPLETADA
  
📊 Llamadas totales: ${calls.length}
🎯 Llamadas pendientes: ${pendingCalls.length}
⏰ Llamadas recientes: ${recentCalls.length}
🔧 Sistema activo: ${calls.length > 0 && user?.id && !loading ? 'SÍ' : 'NO'}

${pendingCalls.length > 0 ? 
  '⚠️ HAY LLAMADAS PENDIENTES - El sistema debería procesarlas automáticamente' : 
  '✅ NO HAY LLAMADAS PENDIENTES'}

Revisa la consola para detalles completos.`;
  
  alert(message);
};
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
  
// 🆕 NUEVA FUNCIÓN - Agregar esto ANTES de calculateCallCost
const updateCallCostInDatabase = async (callId: string, calculatedCost: number) => {
  try {
    console.log(`🔄 Actualizando costo en BD para ${callId}: $${calculatedCost.toFixed(2)}`);
    
    const { error } = await supabase
      .from('calls')
      .update({ 
        cost_usd: calculatedCost 
      })
      .eq('call_id', callId);

    if (error) {
      console.error('❌ Error actualizando costo:', error);
      return false;
    }

    console.log(`✅ Costo actualizado en BD: ${callId} → $${calculatedCost.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error('❌ Error en updateCallCostInDatabase:', error);
    return false;
  }
};
  
  /// 🔧 FUNCIÓN MODIFICADA - Reemplazar tu calculateCallCost existente con esta
const calculateCallCost = async (call: Call, forceUpdate = false) => {
  const durationMinutes = getCallDuration(call) / 60;
  let agentRate = 0;
  
  if (call.call_agent?.rate_per_minute) {
    agentRate = call.call_agent.rate_per_minute;
    console.log(`💰 Using call_agent rate: $${agentRate}/min`);
  } else if (call.agents?.rate_per_minute) {
    agentRate = call.agents.rate_per_minute;
    console.log(`💰 Using agents rate: $${agentRate}/min`);
  }
  
  if (agentRate === 0) {
    console.log(`⚠️ No agent rate found, using DB cost: $${call.cost_usd || 0}`);
    return call.cost_usd || 0;
  }
  
  const calculatedCost = durationMinutes * agentRate;
  const currentCost = parseFloat(call.cost_usd || 0);
  
  console.log(`🧮 COST CALCULATION:
    📏 Duration: ${getCallDuration(call)}s = ${durationMinutes.toFixed(2)} min
    💵 Rate: $${agentRate}/min
    🎯 Calculated: $${calculatedCost.toFixed(4)}
    🗄️ DB Cost: $${currentCost} (IGNORED)`);
  
  // 🚀 OPTIMIZACIÓN: Solo actualizar si es necesario
  const needsUpdate = forceUpdate || 
    (calculatedCost > 0 && 
     Math.abs(calculatedCost - currentCost) > 0.01 && // Diferencia mayor a 1 centavo
     currentCost === 0); // Solo si el costo actual es 0 (llamadas nuevas)
  
  if (needsUpdate) {
    console.log(`💾 Actualizando costo necesario: $${currentCost} → $${calculatedCost.toFixed(4)}`);
    await updateCallCostInDatabase(call.call_id, calculatedCost);
  } else {
    console.log(`⏭️ Costo ya actualizado, saltando: ${call.call_id}`);
  }
  
  return calculatedCost;
};

  // 🔧 FUNCIÓN AUXILIAR: Calcular costo solo para mostrar (sin actualizar BD)
const calculateCallCostSync = (call: Call) => {
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
  
  const calculatedCost = durationMinutes * agentRate;
  return calculatedCost;
};

  // 🔧 REEMPLAZAR LA FUNCIÓN getCallDuration EN CallsSimple.tsx (línea ~348)

const getCallDuration = (call: any) => {
  console.log(`🔍 getCallDuration para call ${call.call_id}:`, {
    duration_sec: call.duration_sec,
    audioDuration: audioDurations[call.id],
    id: call.id
  });

  // ✅ PRIORIDAD 1: Usar duration_sec de la base de datos
  if (call.duration_sec && call.duration_sec > 0) {
    console.log(`✅ Usando duration_sec: ${call.duration_sec}s`);
    return call.duration_sec;
  }
  
  // ✅ PRIORIDAD 2: Usar audio duration si está disponible
  if (audioDurations[call.id] && audioDurations[call.id] > 0) {
    console.log(`✅ Usando audioDuration: ${audioDurations[call.id]}s`);
    return audioDurations[call.id];
  }
  
  // ✅ PRIORIDAD 3: Buscar en otros campos posibles
  const possibleFields = ['billing_duration_sec', 'duration', 'call_duration', 'length', 'time_duration', 'total_duration'];
  
  for (const field of possibleFields) {
    if (call[field] && call[field] > 0) {
      console.log(`✅ Usando campo ${field}: ${call[field]}s`);
      return call[field];
    }
  }
  
  console.log(`❌ No se encontró duración válida para call ${call.call_id}`);
  return 0;
};

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
        getAgentName(call.agent_id).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(call => call.call_status === statusFilter);
    }

    if (agentFilter !== null) {
      filtered = filtered.filter(call => call.agent_id === agentFilter);
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

  // ✅ FUNCIÓN formatCurrency CORREGIDA - CAMBIO PRINCIPAL
  const formatCurrency = (amount: number) => {
    // Redondear a 2 decimales para evitar problemas de precisión flotante
    const roundedAmount = Math.round((amount || 0) * 100) / 100;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,  // ✅ CAMBIADO de 4 a 2 decimales
      maximumFractionDigits: 2,  // ✅ CAMBIADO de 4 a 2 decimales
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
  const fetchCalls = async () => {
    console.log("🚀 FETCHCALLS STARTED - DEBUG TEST");
    console.log("🚀 USER ID:", user?.id);
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
  setLoading(true);
  setError(null);

  console.log("🔍 Fetching calls for user:", user.id);
  
  // 🔍 AGREGAR ESTAS LÍNEAS AQUÍ
  console.log("📍 CHECKPOINT 1: About to query user_agent_assignments");
  console.log("📍 CHECKPOINT 1: user.id =", user.id);

  const { data: assignments } = await supabase
  .from('user_agent_assignments')
  .select('agent_id')
  .eq('user_id', user.id)
  .eq('is_primary', true);

if (!assignments || assignments.length === 0) {
  console.log("⚠️ No assignments found");
  setCalls([]);
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
console.log("🎯 Agent IDs from assignments:", agentIds);

const { data: agentDetails, error: agentsError } = await supabase
  .from('agents')
  .select('id, name, rate_per_minute, retell_agent_id')
  .in('id', agentIds);

console.log("🤖 Agent details found:", agentDetails);

// Simular userAgents para el resto del código
const userAgents = agentDetails?.map(agent => ({
  agent_id: agent.id,
  agents: agent
})) || [];

  // 🔍 Y ESTA LÍNEA JUSTO DESPUÉS DE LA CONSULTA
  console.log("📍 CHECKPOINT 2: userAgents query completed");
  console.log("📍 CHECKPOINT 2: userAgents =", userAgents);
  console.log("📍 CHECKPOINT 2: agentsError =", agentsError);

      // 🔍 DEBUGGING CRÍTICO DETALLADO
console.log('🔍 RAW userAgents response:', userAgents);
console.log('🔍 RAW agentsError response:', agentsError);
console.log('🔍 userAgents type:', typeof userAgents);
console.log('🔍 userAgents is array:', Array.isArray(userAgents));
console.log('🔍 userAgents length:', userAgents?.length);

if (agentsError) {
  console.error('❌ DETAILED agentsError:', JSON.stringify(agentsError, null, 2));
}

      // En CallsSimple.tsx, agregar debugging específico para este usuario


      if (agentsError) {
        console.error("❌ Error fetching user agents:", agentsError);
        setError(`Error: ${agentsError.message}`);
        return;
      }

      if (!userAgents || userAgents.length === 0) {
        console.log("⚠️ No agents assigned to this user");
        setCalls([]);
        setStats({
          total: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          completedCalls: 0
        });
        return;
      }

      const userAgentIds = userAgents.map(assignment => assignment.agents.id);
      console.log(`🎯 User has ${userAgentIds.length} assigned agents:`, userAgentIds);

      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select(`
          *,
          call_summary,
          disconnection_reason
        `)
        .in('agent_id', userAgentIds)
        .order('timestamp', { ascending: false});

      if (callsError) {
        console.error("❌ Error fetching calls:", callsError);
        setError(`Error: ${callsError.message}`);
        return;
      }

      console.log("✅ Calls fetched successfully:", callsData?.length || 0);

      const data = callsData?.map(call => {
        let matchedAgent = null;

        const userAgentAssignment = userAgents.find(assignment => 
          assignment.agents.id === call.agent_id ||
          assignment.agents.retell_agent_id === call.agent_id
        );

        if (userAgentAssignment) {
          matchedAgent = {
            id: userAgentAssignment.agents.id,
            name: userAgentAssignment.agents.name,
            rate_per_minute: userAgentAssignment.agents.rate_per_minute
          };
          console.log(`✅ Found agent with rate: ${matchedAgent.name} - $${matchedAgent.rate_per_minute}/min`);
        }

        if (!matchedAgent) {
          console.log(`❌ No agent found for call ${call.call_id} with agent_id: ${call.agent_id}`);
        }

        return {
          ...call,
          end_reason: call.disconnection_reason || null,
          call_agent: matchedAgent
        };
      });

      setCalls(data || []);

      if (data && data.length > 0) {
        // 🚀 OPTIMIZACIÓN: Calcular costo total sin actualizar BD
let totalCost = 0;
for (const call of data) {
  const durationMinutes = getCallDuration(call) / 60;
  const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute || 0;
  
  if (agentRate > 0) {
    totalCost += durationMinutes * agentRate;
  } else {
    totalCost += call.cost_usd || 0;
  }
}
        const totalDuration = data.reduce((sum, call) => sum + getCallDuration(call), 0);
        const avgDuration = data.length > 0 ? Math.round(totalDuration / data.length) : 0;
        const completedCalls = data.filter(call => call.call_status === 'completed').length;

        setStats({
          total: data.length,
          totalCost,
          totalDuration,
          avgDuration,
          completedCalls
        });
      }

    } catch (err: any) {
      console.error("❌ Exception fetching calls:", err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCallClick = (call: Call) => {
    console.log("🎯 CLICKED CALL:", call);
    console.log("🎯 CLICKED CALL SUMMARY:", call.call_summary);
    const originalCall = calls.find(c => c.id === call.id) || call;
    console.log("🎯 ORIGINAL CALL FOUND:", originalCall);
    console.log("🎯 ORIGINAL CALL SUMMARY:", originalCall.call_summary);
    setSelectedCall(originalCall);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCall(null);
  };

  // Variables auxiliares
  const uniqueStatuses = [...new Set(calls.map(call => call.call_status))];

  // Verificación de usuario
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
  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📞 Call Management</h1>
              <p className="text-gray-600">
                Comprehensive call data for your account
                {selectedAgentName && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • Filtered by {selectedAgentName}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <User className="w-3 h-3 mr-1" />
                Active User
              </Badge>
              <Button
                onClick={fetchCalls}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh
              </Button>
              
              {/* Botones de prueba eliminados */}
            </div>
          </div>

          {/* ✅ NUEVO: Indicador de procesamiento automático */}
{isProcessing && (
  <Card className="border-blue-200 bg-blue-50">
    <CardContent className="p-4">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
        <span className="text-blue-700 font-medium">
          🤖 Procesando descuento automático...
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
                                  {getAgentName(call.agent_id)}
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
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CallDetailModal } from "@/components/calls/CallDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Phone, 
  Clock, 
  DollarSign, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Zap,
  CreditCard,
  Search,
  Filter,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  call_status: string;
  start_timestamp: string;
  end_timestamp?: string;
  duration_sec?: number;
  cost_usd?: number;
  recording_url?: string;
  summary?: string;
  agent_id?: string;
  call_analysis?: any;
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
// ============================================================================
// FUNCIÓN DE DESCUENTO SINCRONIZADA CON SUPERADMIN
// ============================================================================

const deductCallCost = async (callId: string, callCost: number, userId: string): Promise<boolean> => {
  try {
    console.log(`💳 INICIANDO DESCUENTO: Call ${callId.substring(0, 8)} - $${callCost.toFixed(4)}`);
    
    // 1. Obtener balance actual desde user_credits
    const { data: currentUser, error: userError } = await supabase
      .from('user_credits')
      .select('current_balance')  // ✅ COLUMNA CORRECTA
      .eq('user_id', userId)
      .single();

    if (userError) {
      console.error('❌ Error obteniendo balance:', userError);
      return false;
    }

    const currentBalance = currentUser?.current_balance || 0;
    console.log(`💰 Balance actual: $${currentBalance.toFixed(4)}`);

    // 2. Verificar fondos suficientes
    if (currentBalance < callCost) {
      console.warn(`⚠️ Fondos insuficientes: $${currentBalance.toFixed(4)} < $${callCost.toFixed(4)}`);
      return false;
    }

    // 3. Calcular nuevo balance
    const newBalance = currentBalance - callCost;
    console.log(`🧮 Nuevo balance: $${newBalance.toFixed(4)}`);

    // 4. Actualizar balance en user_credits (SINCRONIZADO CON ADMIN PANEL)
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        current_balance: newBalance,  // ✅ COLUMNA CORRECTA
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error actualizando balance:', updateError);
      return false;
    }

    console.log(`✅ DESCUENTO COMPLETADO: ${callId.substring(0, 8)} - $${callCost.toFixed(4)}`);
    
    // 5. Emitir evento para actualizar UI
    window.dispatchEvent(new CustomEvent('balanceUpdated', {
      detail: { 
        newBalance, 
        deduction: callCost, 
        callId: callId.substring(0, 8) 
      }
    }));

    return true;

  } catch (error) {
    console.error('❌ Error en descuento:', error);
    return false;
  }
};
// ============================================================================
// COMPONENTE FILTRO DE AGENTES
// ============================================================================

const AgentFilter = ({ agents, selectedAgent, onAgentChange }: {
  agents: any[];
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
}) => (
  <div className="relative">
    <select 
      value={selectedAgent}
      onChange={(e) => onAgentChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer"
    >
      <option value="">All Agents</option>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
  </div>
);
// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CallsSimple() {
  const { user } = useAuth();
  
  // ============================================================================
  // ESTADOS PRINCIPALES
  // ============================================================================
  
  const [calls, setCalls] = useState<CallData[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [uniqueAgents, setUniqueAgents] = useState<any[]>([]);
  
  // Estados para estadísticas
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [completedCalls, setCompletedCalls] = useState(0);
  
  // Estados para balance (CORREGIDOS)
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Referencias
  const lastProcessedRef = useRef<Set<string>>(new Set());
  // ============================================================================
  // FUNCIONES AUXILIARES CORREGIDAS
  // ============================================================================
  
  const getCallDuration = (call: any) => {
    // Prioridad 1: Duración desde el archivo de audio
    if (audioDurations[call.id]) {
      return audioDurations[call.id];
    }
    
    // Prioridad 2: Duración calculada desde timestamps
    if (call.start_timestamp && call.end_timestamp) {
      const start = new Date(call.start_timestamp);
      const end = new Date(call.end_timestamp);
      return Math.max(0, (end.getTime() - start.getTime()) / 1000);
    }
    
    // Prioridad 3: Duración desde la base de datos
    if (call.duration_sec && call.duration_sec > 0) {
      return call.duration_sec;
    }
    
    return 0;
  };

  const calculateCallCost = (call: any): number => {
    try {
      // Obtener duración en segundos
      const durationSec = getCallDuration(call);
      if (durationSec <= 0) return 0;
      
      // Convertir a minutos
      const durationMin = durationSec / 60;
      
      // Obtener tarifa por minuto
      let ratePerMinute = 0;
      if (call.call_agent?.rate_per_minute) {
        ratePerMinute = call.call_agent.rate_per_minute;
      } else if (call.agents?.rate_per_minute) {
        ratePerMinute = call.agents.rate_per_minute;
      }
      
      if (ratePerMinute <= 0) return 0;
      
      // Calcular costo
      const cost = durationMin * ratePerMinute;
      console.log(`🧮 Cálculo: ${durationSec}s (${durationMin.toFixed(2)}min) × $${ratePerMinute}/min = $${cost.toFixed(4)}`);
      
      return cost;
    } catch (error) {
      console.error('Error calculando costo:', error);
      return 0;
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Cargar balance desde user_credits
  const loadUserBalance = async () => {
    if (!user?.id) return;
    
    try {
      setBalanceLoading(true);
      
      const { data: userCredit, error } = await supabase
        .from('user_credits')
        .select('current_balance')  // ✅ COLUMNA CORRECTA
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error cargando balance:', error);
        return;
      }

      const balance = userCredit?.current_balance || 0;  // ✅ COLUMNA CORRECTA
      setUserBalance(balance);
      console.log(`💰 Balance cargado desde user_credits: $${balance.toFixed(4)}`);
      
    } catch (error) {
      console.error('Error en loadUserBalance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // ✅ FUNCIÓN: Escuchar actualizaciones de balance
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { newBalance, deduction, callId } = event.detail;
    console.log(`🎉 Balance actualizado: $${newBalance} (descuento: $${deduction} para ${callId})`);
    setUserBalance(newBalance);
  };
  // ✅ FUNCIÓN MANUAL CORREGIDA PARA SINCRONIZACIÓN
  const processCallsManually = async () => {
    if (!user?.id || !calls.length) {
      console.log('❌ No hay usuario o llamadas');
      alert('No hay usuario autenticado o llamadas disponibles');
      return;
    }

    console.log('🚀 PROCESAMIENTO MANUAL INICIADO');
    setIsProcessing(true);
    
    try {
      // 1. Buscar llamadas completadas sin costo
      const callsToProcess = calls.filter(call => 
        ['completed', 'ended'].includes(call.call_status?.toLowerCase()) &&
        (!call.cost_usd || call.cost_usd === 0) &&
        (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute)
      );

      console.log(`📞 Encontradas ${callsToProcess.length} llamadas para procesar`);

      if (callsToProcess.length === 0) {
        alert('No hay llamadas nuevas para procesar');
        setIsProcessing(false);
        return;
      }

      let processedCount = 0;
      let errors = 0;

      // 2. Procesar cada llamada
      for (const call of callsToProcess) {
        try {
          console.log(`⚡ Procesando: ${call.call_id?.substring(0, 8)}`);
          
          // Calcular costo
          const cost = calculateCallCost(call);
          
          if (cost > 0) {
            console.log(`💰 Costo calculado: $${cost.toFixed(4)}`);
            
            // Actualizar costo en BD
            const { error: updateError } = await supabase
              .from('calls')
              .update({ 
                cost_usd: cost,
                updated_at: new Date().toISOString()
              })
              .eq('call_id', call.call_id);

            if (updateError) {
              console.error('❌ Error actualizando call:', updateError);
              errors++;
              continue;
            }

            // Descontar del balance (SINCRONIZADO CON ADMIN PANEL)
            const deductSuccess = await deductCallCost(call.call_id, cost, user.id);
            
            if (deductSuccess) {
              console.log(`✅ ÉXITO: ${call.call_id?.substring(0, 8)} - $${cost.toFixed(4)}`);
              processedCount++;
            } else {
              console.log(`❌ Error en descuento: ${call.call_id?.substring(0, 8)}`);
              errors++;
            }
          } else {
            console.log(`⚠️ Costo $0 para: ${call.call_id?.substring(0, 8)}`);
          }
          
          // Pausa entre llamadas para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`❌ Error procesando ${call.call_id}:`, error);
          errors++;
        }
      }

      console.log(`🎉 PROCESAMIENTO MANUAL COMPLETADO: ${processedCount} éxitos, ${errors} errores`);
      
      // Recargar datos
      await fetchCalls();
      await loadUserBalance();
      
      // Mostrar resultado
      if (processedCount > 0) {
        alert(`✅ Procesadas ${processedCount} llamadas exitosamente!\n${errors > 0 ? `❌ ${errors} errores` : ''}`);
      } else {
        alert(`❌ No se procesaron llamadas. Revisa la consola para detalles.`);
      }

    } catch (error) {
      console.error('❌ Error general en procesamiento:', error);
      alert('Error durante el procesamiento. Revisa la consola.');
    } finally {
      setIsProcessing(false);
    }
  };
  // ============================================================================
  // FUNCIÓN FETCH CALLS CORREGIDA PARA COSTOS
  // ============================================================================
  
  const fetchCalls = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log('📞 Cargando llamadas...');

      const { data: callsData, error } = await supabase
        .from('calls')
        .select(`
          *,
          call_agent:call_agents(id, name, rate_per_minute),
          agents(id, name, rate_per_minute)
        `)
        .eq('user_id', user.id)
        .order('start_timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching calls:', error);
        return;
      }

      console.log(`✅ Cargadas ${callsData?.length || 0} llamadas`);
      setCalls(callsData || []);

      // Extraer agentes únicos
      const agents = new Set();
      const agentsList: any[] = [];
      
      callsData?.forEach(call => {
        if (call.call_agent && !agents.has(call.call_agent.id)) {
          agents.add(call.call_agent.id);
          agentsList.push(call.call_agent);
        }
        if (call.agents && !agents.has(call.agents.id)) {
          agents.add(call.agents.id);
          agentsList.push(call.agents);
        }
      });
      
      setUniqueAgents(agentsList);

      // Cargar duraciones de audio para llamadas sin duración
      const callsWithoutDuration = callsData?.filter(call => 
        call.recording_url && 
        (!call.duration_sec || call.duration_sec === 0) &&
        !audioDurations[call.id]
      ) || [];

      if (callsWithoutDuration.length > 0) {
        console.log(`🎵 Detectando duraciones de audio para ${callsWithoutDuration.length} llamadas...`);
        
        for (const call of callsWithoutDuration.slice(0, 5)) { // Limitar a 5 para no sobrecargar
          try {
            const audio = new Audio(call.recording_url);
            audio.addEventListener('loadedmetadata', () => {
              if (audio.duration && audio.duration > 0) {
                setAudioDurations(prev => ({
                  ...prev,
                  [call.id]: audio.duration
                }));
                console.log(`🎵 Audio ${call.call_id?.substring(0, 8)}: ${audio.duration.toFixed(1)}s`);
              }
            });
            audio.addEventListener('error', () => {
              console.warn(`⚠️ Error cargando audio: ${call.call_id?.substring(0, 8)}`);
            });
          } catch (error) {
            console.warn(`⚠️ Error procesando audio ${call.call_id}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('Error en fetchCalls:', error);
    } finally {
      setLoading(false);
    }
  };
  // ============================================================================
  // useEffects CORREGIDOS
  // ============================================================================

  // Efecto principal: Cargar datos cuando el usuario está disponible
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 INICIANDO SISTEMA SIMPLIFICADO para:', user.email);
      fetchCalls();
      loadUserBalance(); // ✅ Cargar balance inicial
    }
  }, [user?.id]);

  // ✅ useEffect: Inicializar sistema de balance
  useEffect(() => {
    if (user?.id) {
      console.log('💰 Inicializando sistema de balance...');
      
      // Escuchar eventos de actualización de balance
      window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      };
    }
  }, [user?.id]);

  // Efecto para aplicar filtros y ordenamiento
  useEffect(() => {
    if (calls.length > 0) {
      applyFiltersAndSort();
      calculateStats();
    }
  }, [calls, searchTerm, statusFilter, agentFilter, dateFilter, customDate]);
  // ============================================================================
  // FUNCIONES DE FILTROS Y ESTADÍSTICAS
  // ============================================================================

  const applyFiltersAndSort = () => {
    let filtered = [...calls];

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(call =>
        call.call_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.call_agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.agents?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de estado
    if (statusFilter) {
      filtered = filtered.filter(call => call.call_status === statusFilter);
    }

    // Filtro de agente
    if (agentFilter) {
      filtered = filtered.filter(call => 
        call.call_agent?.id === agentFilter || call.agents?.id === agentFilter
      );
    }

    // Filtro de fecha
    if (dateFilter && dateFilter !== 'custom') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          filterDate.setDate(now.getDate() - 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(call => 
        new Date(call.start_timestamp) >= filterDate
      );
    }

    if (dateFilter === 'custom' && customDate) {
      const selectedDate = new Date(customDate);
      filtered = filtered.filter(call => {
        const callDate = new Date(call.start_timestamp);
        return callDate.toDateString() === selectedDate.toDateString();
      });
    }

    setFilteredCalls(filtered);
  };

  const calculateStats = () => {
    const completed = calls.filter(call => 
      ['completed', 'ended'].includes(call.call_status?.toLowerCase())
    );
    
    const totalDur = calls.reduce((sum, call) => {
      const duration = getCallDuration(call);
      return sum + duration;
    }, 0);
    
    const totalCostCalc = calls.reduce((sum, call) => {
      if (call.cost_usd && call.cost_usd > 0) {
        return sum + call.cost_usd;
      }
      return sum + calculateCallCost(call);
    }, 0);
    
    setTotalCalls(calls.length);
    setCompletedCalls(completed.length);
    setTotalDuration(totalDur);
    setTotalCost(totalCostCalc);
    setAvgDuration(calls.length > 0 ? totalDur / calls.length : 0);
  };
  // ============================================================================
  // FUNCIONES DE FORMATO
  // ============================================================================

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'ended':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
      case 'ongoing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getEndReasonColor = (endReason: string) => {
    if (!endReason) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    switch (endReason.toLowerCase()) {
      case 'user hangup':
      case 'user_hangup':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'agent hangup':
      case 'agent_hangup':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'max_duration_reached':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'inactivity':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handlers para modal
  const handleCallClick = (call: CallData) => {
    setSelectedCall(call);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCall(null);
  };
  // ✅ COMPONENTE DE BALANCE CORREGIDO
  const BalanceDisplay = () => {
    const isLowBalance = userBalance !== null && userBalance < 10;
    const isVeryLowBalance = userBalance !== null && userBalance < 5;
    
    return (
      <Card className={`border-0 shadow-sm ${isVeryLowBalance ? 'bg-gradient-to-br from-red-50 to-red-100/50' : isLowBalance ? 'bg-gradient-to-br from-yellow-50 to-yellow-100/50' : 'bg-gradient-to-br from-green-50 to-green-100/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isVeryLowBalance ? 'bg-red-100' : isLowBalance ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <CreditCard className={`w-4 h-4 ${isVeryLowBalance ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Credit Balance</p>
                <div className="flex items-center gap-2">
                  {balanceLoading ? (
                    <div className="flex items-center gap-1">
                      <LoadingSpinner size="sm" />
                      <span className="text-lg font-bold text-gray-400">Loading...</span>
                    </div>
                  ) : (
                    <p className={`text-lg font-bold ${isVeryLowBalance ? 'text-red-700' : isLowBalance ? 'text-yellow-700' : 'text-green-700'}`}>
                      {userBalance !== null ? formatCurrency(userBalance) : 'N/A'}
                    </p>
                  )}
                  {isProcessing && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
                      <span className="text-xs text-blue-600 font-medium">Processing</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500">
                Manual Processing: ✅ Ready
              </div>
              <div className="text-xs text-gray-400">
                Ready for processing
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============================================================================
  // RENDER DEL COMPONENTE PRINCIPAL
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Calls</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <User className="w-3 h-3 mr-1" />
                  Active User
                </Badge>
                {filteredCalls.length > 0 && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    System Ready
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={processCallsManually}
              disabled={loading || isProcessing}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs">Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs">Process Calls</span>
                </div>
              )}
            </Button>
            
            <Button
              onClick={() => {
                console.log("🔄 REFRESH MANUAL CON BALANCE");
                fetchCalls();
                loadUserBalance();
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
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-xs">Refresh All</span>
                </div>
              )}
            </Button>
          </div>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Calls</p>
                    <p className="text-lg font-bold text-blue-700">{totalCalls}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Completed</p>
                    <p className="text-lg font-bold text-green-700">{completedCalls}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Duration</p>
                    <p className="text-lg font-bold text-purple-700">{formatDuration(totalDuration)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Avg Duration</p>
                    <p className="text-lg font-bold text-orange-700">{formatDuration(avgDuration)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Cost</p>
                    <p className="text-lg font-bold text-indigo-700">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ BALANCE CARD AGREGADA */}
          <BalanceDisplay />
        </div>
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="ended">Ended</option>
                  <option value="in_progress">In Progress</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <AgentFilter 
                  agents={uniqueAgents}
                  selectedAgent={agentFilter}
                  onAgentChange={setAgentFilter}
                />

                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Date</option>
                </select>

                {dateFilter === 'custom' && (
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-auto"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Calls Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              📋 Call History
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredCalls.length} {filteredCalls.length === 1 ? 'call' : 'calls'})
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-500">Loading calls...</span>
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No calls found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {calls.length === 0 ? 'Make your first call to see it here' : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCalls.map((call, index) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleCallClick(call)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Phone className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {call.call_id?.substring(0, 16)}...
                                </div>
                                <div className="text-sm text-gray-500">
                                  {call.summary ? (call.summary.length > 30 ? `${call.summary.substring(0, 30)}...` : call.summary) : 'No summary'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {call.call_agent?.name || call.agents?.name || 'Unknown Agent'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
                                return agentRate ? `$${agentRate.toFixed(3)}/min` : 'No rate';
                              })()}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(call.call_status)} text-xs`}>
                              {call.call_status || 'unknown'}
                            </Badge>
                            {call.call_analysis?.call_end_reason && (
                              <div className="mt-1">
                                <Badge className={`${getEndReasonColor(call.call_analysis.call_end_reason)} text-xs`}>
                                  {call.call_analysis.call_end_reason.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDuration(getCallDuration(call))}
                            </div>
                            <div className="text-xs text-gray-500">
                              {audioDurations[call.id] ? '🎵 Audio' : call.duration_sec ? '📊 DB' : '⏱️ Calc'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {call.cost_usd && call.cost_usd > 0 
                                ? formatCurrency(call.cost_usd)
                                : (() => {
                                    const calculatedCost = calculateCallCost(call);
                                    return calculatedCost > 0 ? (
                                      <span className="text-orange-600">
                                        {formatCurrency(calculatedCost)} *
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">$0.0000</span>
                                    );
                                  })()
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {call.cost_usd && call.cost_usd > 0 ? '✅ Processed' : '⏳ Pending'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(call.start_timestamp)}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {call.recording_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(call.recording_url, '_blank');
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallClick(call);
                                }}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                View Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    </DashboardLayout>
  );
}

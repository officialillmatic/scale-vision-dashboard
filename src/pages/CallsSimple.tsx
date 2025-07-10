// ============================================================================
// 🚀 INICIO PARTE 1: IMPORTS Y INTERFACES - CALLSSIMPLE.TSX CORREGIDO
// ============================================================================

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
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";

// ============================================================================
// 🔧 INTERFACES Y TIPOS CORREGIDOS - CON VALIDACIONES
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
  processed_for_cost?: boolean;
  audioDuration?: number; // 🆕 Para duración de audio cargada
}

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'custom';

// ============================================================================
// 🔒 FUNCIÓN DE VALIDACIÓN ANTI-CRASH GLOBAL
// ============================================================================
const validateCall = (call: any): call is Call => {
  if (!call || typeof call !== 'object') {
    console.warn('validateCall: call is not an object', call);
    return false;
  }
  
  if (!call.call_id || typeof call.call_id !== 'string') {
    console.warn('validateCall: invalid call_id', call);
    return false;
  }
  
  return true;
};

// ============================================================================
// 🔚 FINAL PARTE 1: IMPORTS Y INTERFACES
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 2: COMPONENTES AUXILIARES - SIN CAMBIOS MAYORES
// ============================================================================

// ============================================================================
// COMPONENTE FILTRO DE AGENTES (SIN CAMBIOS)
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
// 🆕 COMPONENTE DE PAGINACIÓN (SIN CAMBIOS)
// ============================================================================
const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  pageSize, 
  totalItems, 
  onPageChange, 
  onPageSizeChange 
}) => {
  const pageSizeOptions = [10, 25, 50, 100];
  
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span>per page</span>
        </div>
        
        <div className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {totalItems} calls
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// 🔚 FINAL PARTE 2: COMPONENTES AUXILIARES
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 3: COMPONENTE PRINCIPAL Y ESTADOS
// ============================================================================

export default function CallsSimple() {
  const { user } = useAuth();
  const { getAgentName, isLoadingAgents } = useAgents();
  
  // ============================================================================
  // 🔧 ESTADOS BÁSICOS DEL COMPONENTE - CORREGIDOS
  // ============================================================================
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [userAssignedAgents, setUserAssignedAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreCalls, setHasMoreCalls] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
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

  // 🆕 Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedCalls, setPaginatedCalls] = useState<Call[]>([]);

  // 🔒 Estados para procesamiento automático (SOLO VISUAL AHORA)
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedRef = useRef<Set<string>>(new Set());

  // Variables auxiliares
  const uniqueAgents = userAssignedAgents || [];

  // ============================================================================
  // 🔧 FUNCIÓN getAgentNameLocal CORREGIDA CON VALIDACIONES
  // ============================================================================
  const getAgentNameLocal = (agentId: string) => {
    // 🛡️ VALIDACIÓN CRÍTICA
    if (!agentId || typeof agentId !== 'string') {
      console.warn('getAgentNameLocal: invalid agentId', agentId);
      return 'Unknown Agent';
    }

    // Buscar en userAssignedAgents
    if (Array.isArray(userAssignedAgents)) {
      const agent = userAssignedAgents.find(a => 
        a && (a.id === agentId || a.retell_agent_id === agentId)
      );
      
      if (agent && agent.name) {
        return agent.name;
      }
    }
    
    // Fallback a getAgentName si está disponible
    if (getAgentName && typeof getAgentName === 'function') {
      try {
        const agentName = getAgentName(agentId);
        if (agentName && agentName !== agentId) {
          return agentName;
        }
      } catch (error) {
        console.warn('Error calling getAgentName:', error);
      }
    }
    
    // Fallback final
    return `Agent ${agentId.substring(0, 8)}...`;
  };

// ============================================================================
// 🔚 FINAL PARTE 3: COMPONENTE PRINCIPAL Y ESTADOS
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 4: FUNCIONES AUXILIARES CORREGIDAS - CRÍTICAS
// ============================================================================

  // ============================================================================
  // ✅ FUNCIÓN getCallDuration CORREGIDA CON VALIDACIONES ANTI-CRASH
  // ============================================================================
  const getCallDuration = (call: any) => {
    // 🛡️ VALIDACIÓN CRÍTICA
    if (!validateCall(call)) {
      console.warn('getCallDuration: invalid call object', call);
      return 0;
    }

    // ✅ PRIORIZAR duración del audio (más precisa)
    if (call.id && audioDurations[call.id] && audioDurations[call.id] > 0) {
      console.log(`🎵 Usando duración de audio: ${audioDurations[call.id]}s para ${call.call_id?.substring(0, 8)}`);
      return audioDurations[call.id];
    }
    
    // Fallback a duration_sec de la BD
    if (call.duration_sec && call.duration_sec > 0) {
      console.log(`📊 Usando duración de BD: ${call.duration_sec}s para ${call.call_id?.substring(0, 8)}`);
      return call.duration_sec;
    }
    
    console.log(`⚠️ Sin duración disponible para ${call.call_id?.substring(0, 8)}`);
    return 0;
  };

  // ============================================================================
  // ✅ FUNCIÓN calculateCallCost CORREGIDA CON VALIDACIONES ANTI-CRASH
  // ============================================================================
  const calculateCallCost = (call: Call) => {
    // 🛡️ VALIDACIÓN CRÍTICA
    if (!validateCall(call)) {
      console.warn('calculateCallCost: invalid call object', call);
      return 0;
    }

    console.log(`💰 Calculando costo para llamada ${call.call_id?.substring(0, 8)}:`, {
      existing_cost: call.cost_usd,
      duration_sec: call.duration_sec,
      agent_id: call.agent_id,
      call_agent_rate: call.call_agent?.rate_per_minute,
      agents_rate: call.agents?.rate_per_minute
    });
    
    // 1. Obtener duración
    const duration = getCallDuration(call);
    if (duration === 0) {
      console.log(`⚠️ Sin duración, costo = $0`);
      return 0;
    }
    
    const durationMinutes = duration / 60;
    
    // 2. Buscar tarifa del agente (priorizar call_agent, luego agents)
    let agentRate = 0;
    
    if (call.call_agent?.rate_per_minute) {
      agentRate = call.call_agent.rate_per_minute;
      console.log(`✅ Usando tarifa de call_agent: $${agentRate}/min`);
    } else if (call.agents?.rate_per_minute) {
      agentRate = call.agents.rate_per_minute;
      console.log(`✅ Usando tarifa de agents: $${agentRate}/min`);
    } else {
      // Buscar en userAssignedAgents como fallback
      const userAgent = userAssignedAgents.find(agent => 
        agent && (
          agent.id === call.agent_id || 
          agent.retell_agent_id === call.agent_id
        )
      );
      
      if (userAgent?.rate_per_minute) {
        agentRate = userAgent.rate_per_minute;
        console.log(`✅ Usando tarifa de userAssignedAgents: $${agentRate}/min`);
      } else {
        console.log(`❌ Sin tarifa disponible, costo = $0`);
        return 0;
      }
    }
    
    // 3. Calcular costo
    const calculatedCost = Math.round(((duration / 60.0) * agentRate) * 10000) / 10000;
    console.log(`🧮 Costo calculado: ${durationMinutes.toFixed(2)}min × $${agentRate}/min = $${calculatedCost.toFixed(4)}`);
    
    return calculatedCost;
  };

  // ============================================================================
  // ✅ FUNCIÓN loadAudioDuration CORREGIDA CON VALIDACIONES ANTI-CRASH
  // ============================================================================
  const loadAudioDuration = async (call: Call) => {
    // 🛡️ VALIDACIÓN CRÍTICA
    if (!validateCall(call)) {
      console.warn('loadAudioDuration: invalid call object', call);
      return;
    }

    if (!call.recording_url || !call.id) {
      console.warn('loadAudioDuration: missing recording_url or id', call);
      return;
    }

    if (audioDurations[call.id]) {
      console.log(`loadAudioDuration: audio already loaded for ${call.call_id?.substring(0, 8)}`);
      return;
    }
    
    try {
      console.log(`🎵 Cargando duración de audio para ${call.call_id?.substring(0, 8)}...`);
      const audio = new Audio(call.recording_url);
      
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          // ✅ VALIDACIÓN ANTES DE UPDATE
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            const duration = Math.round(audio.duration);
            console.log(`✅ Audio cargado: ${duration}s para ${call.call_id?.substring(0, 8)}`);
            setAudioDurations(prev => ({
              ...prev,
              [call.id]: duration
            }));
          } else {
            console.warn(`⚠️ Duración de audio inválida para ${call.call_id?.substring(0, 8)}: ${audio.duration}`);
          }
          resolve();
        });
        
        audio.addEventListener('error', (e) => {
          console.log(`❌ Error cargando audio para ${call.call_id?.substring(0, 8)}:`, e);
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

  // ============================================================================
  // ✅ FUNCIÓN loadAudioForVisibleCalls CORREGIDA CON VALIDACIONES
  // ============================================================================
  const loadAudioForVisibleCalls = async (visibleCalls: Call[]) => {
    // 🛡️ VALIDACIÓN CRÍTICA
    if (!Array.isArray(visibleCalls)) {
      console.warn('loadAudioForVisibleCalls: visibleCalls is not an array', visibleCalls);
      return;
    }

    const validCalls = visibleCalls.filter(call => validateCall(call));
    const callsWithAudio = validCalls.filter(call => 
      call.recording_url && call.id && !audioDurations[call.id]
    );
    
    if (callsWithAudio.length === 0) return;
    
    console.log(`🎵 Cargando audio para ${callsWithAudio.length} llamadas visibles...`);
    
    // Cargar en pequeños lotes para no bloquear
    for (let i = 0; i < callsWithAudio.length; i += 2) {
      const batch = callsWithAudio.slice(i, i + 2);
      await Promise.all(batch.map(call => loadAudioDuration(call)));
      if (i + 2 < callsWithAudio.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

// ============================================================================
// 🔚 FINAL PARTE 4: FUNCIONES AUXILIARES CORREGIDAS
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 5: FUNCIONES DE PROCESAMIENTO - CORREGIDAS
// ============================================================================

  // ============================================================================
  // 🆕 FUNCIÓN: Descuento de balance EXACTO (CORREGIDA)
  // ============================================================================
  const processCallCostAndDeduct = async (call: Call) => {
    console.log(`💰 PROCESANDO DESCUENTO EXACTO para llamada ${call.call_id?.substring(0, 8)}:`);
    
    try {
      // 🛡️ VALIDACIÓN CRÍTICA
      if (!validateCall(call)) {
        console.error('processCallCostAndDeduct: invalid call object', call);
        return { success: false, error: 'Invalid call object' };
      }

      // 🛡️ NUEVA PROTECCIÓN ANTI-DUPLICADOS - VERIFICAR TRANSACCIONES EXISTENTES
      console.log(`🔍 Verificando si llamada ya fue procesada: ${call.call_id?.substring(0, 8)}`);
      
      const { data: existingTx, error: checkError } = await supabase
        .from('credit_transactions')
        .select('id, description, amount, created_at')
        .eq('user_id', user.id)
        .ilike('description', `%${call.call_id}%`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error verificando duplicados para ${call.call_id}:`, checkError);
      }

      if (existingTx && !checkError) {
        console.log(`✅ LLAMADA YA PROCESADA: ${call.call_id?.substring(0, 8)}`);
        return { 
          success: true, 
          message: 'Ya procesada', 
          existingTransaction: existingTx.id,
          alreadyDeducted: Math.abs(existingTx.amount),
          processedAt: existingTx.created_at
        };
      }

      console.log(`🆕 NUEVA LLAMADA - Procediendo con descuento: ${call.call_id?.substring(0, 8)}`);

      // 🛡️ VERIFICACIÓN ADICIONAL: Campo processed_for_cost en BD
      if (call.processed_for_cost) {
        console.log(`✅ Llamada marcada como procesada en BD: ${call.call_id?.substring(0, 8)}`);
        return { success: true, message: 'Ya procesada en BD' };
      }

      // 2. Obtener duración EXACTA (priorizar audio)
      const exactDuration = getCallDuration(call);
      if (exactDuration === 0) {
        console.log(`❌ Sin duración válida para ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'Sin duración válida' };
      }

      // 3. Calcular costo EXACTO
      const exactCost = calculateCallCost(call);
      if (exactCost === 0) {
        console.log(`❌ Sin costo válido para ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'Sin tarifa válida' };
      }

      const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
      console.log(`🧮 CÁLCULO EXACTO: ${exactDuration}s × $${agentRate}/min = $${exactCost.toFixed(4)}`);

      // 4. Descontar balance del usuario
      console.log(`💳 DESCONTANDO BALANCE EXACTO para user: ${user.id}`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user.id,
        p_amount: -exactCost,
        p_description: `Exact call cost: ${call.call_id} (${(exactDuration/60).toFixed(2)}min @ $${agentRate}/min)`,
        p_admin_id: 'callssimple-exact-deduct'
      });

      let deductSuccess = false;
      let deductMethod = '';

      if (!rpcError) {
        console.log(`✅ Descuento RPC exitoso: $${exactCost.toFixed(4)}`);
        deductSuccess = true;
        deductMethod = 'rpc';
      } else {
        console.log(`❌ Error RPC, intentando descuento directo:`, rpcError);
        
        const { data: currentCredit, error: creditError } = await supabase
          .from('user_credits')
          .select('current_balance')
          .eq('user_id', user.id)
          .single();

        if (!creditError && currentCredit) {
          const currentBalance = currentCredit.current_balance || 0;
          const newBalance = Math.max(0, currentBalance - exactCost);
          
          console.log(`💰 Balance directo: $${currentBalance} → $${newBalance}`);
          
          const { error: updateError } = await supabase
            .from('user_credits')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (!updateError) {
            await supabase.from('credit_transactions').insert({
              user_id: user.id,
              amount: -exactCost,
              transaction_type: 'call_charge_exact',
              description: `Exact call cost: ${call.call_id} (${(exactDuration/60).toFixed(2)}min @ $${agentRate}/min)`,
              balance_after: newBalance,
              created_by: 'callssimple-exact',
              reference_id: call.call_id,
              created_at: new Date().toISOString()
            });

            console.log(`✅ Descuento directo exitoso: $${exactCost.toFixed(4)}`);
            deductSuccess = true;
            deductMethod = 'direct';
          } else {
            console.error(`❌ Error actualizando balance directo:`, updateError);
          }
        } else {
          console.error(`❌ Error obteniendo balance actual:`, creditError);
        }
      }

      if (!deductSuccess) {
        return { success: false, error: 'Falló descuento de balance' };
      }

      // 5. Actualizar llamada como procesada con costo exacto
      console.log(`📝 ACTUALIZANDO LLAMADA CON COSTO EXACTO: $${exactCost.toFixed(4)}`);
      
      const { error: updateCallError } = await supabase
        .from('calls')
        .update({
          cost_usd: exactCost,
          duration_sec: exactDuration,
          processed_for_cost: true,
        })
        .eq('call_id', call.call_id);

      if (updateCallError) {
        console.error(`❌ Error actualizando llamada:`, updateCallError);
        return { success: false, error: 'Error actualizando llamada' };
      }

      // 6. Actualizar estado local
      setCalls(prevCalls => 
        prevCalls.map(c => 
          c.call_id === call.call_id 
            ? { 
                ...c, 
                cost_usd: exactCost, 
                duration_sec: exactDuration,
                processed_for_cost: true 
              }
            : c
        )
      );

      console.log(`🎉 DESCUENTO EXACTO COMPLETADO:`);
      console.log(`   📞 Call: ${call.call_id?.substring(0, 8)}`);
      console.log(`   ⏱️ Duración: ${exactDuration}s`);
      console.log(`   💰 Costo: $${exactCost.toFixed(4)}`);
      console.log(`   🔧 Método: ${deductMethod}`);

      return { 
        success: true, 
        cost: exactCost, 
        duration: exactDuration,
        method: deductMethod 
      };

    } catch (error) {
      console.error(`❌ Error crítico en descuento exacto:`, error);
      return { success: false, error: error.message };
    }
  };

  // ============================================================================
  // 🛡️ FUNCIÓN: Verificación robusta sin errores SQL
  // ============================================================================
  const shouldProcessCalls = async () => {
    if (loading || backgroundLoading || isProcessing) {
      console.log(`🛑 No procesar: loading=${loading}, backgroundLoading=${backgroundLoading}, isProcessing=${isProcessing}`);
      return false;
    }
    
    // Filtrar llamadas que parecen pendientes
    const potentiallyPendingCalls = calls.filter(call => 
      validateCall(call) &&
      ['completed', 'ended'].includes(call.call_status?.toLowerCase()) && 
      (call.duration_sec > 0 || call.recording_url) &&
      (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute) > 0
    );
    
    if (potentiallyPendingCalls.length === 0) {
      console.log(`✅ Sin llamadas completadas para verificar`);
      return false;
    }
    
    console.log(`🔍 Verificando ${potentiallyPendingCalls.length} llamadas contra transacciones...`);
    
    try {
      const processedCallIds = new Set();
      
      for (const call of potentiallyPendingCalls) {
        const callIdShort = call.call_id.substring(0, 16);
        
        const { data: existingTx, error } = await supabase
          .from('credit_transactions')
          .select('id, description')
          .eq('user_id', user.id)
          .ilike('description', `%${callIdShort}%`)
          .limit(1);
        
        if (error) {
          console.log(`⚠️ Error verificando ${callIdShort}:`, error.message);
          continue;
        }
        
        if (existingTx && existingTx.length > 0) {
          processedCallIds.add(call.call_id);
          console.log(`✅ Transacción encontrada para: ${callIdShort}`);
        } else {
          console.log(`🔄 Sin transacción para: ${callIdShort} - PENDIENTE`);
        }
      }
      
      const trulyPendingCalls = potentiallyPendingCalls.filter(call => 
        !processedCallIds.has(call.call_id)
      );
      
      if (trulyPendingCalls.length === 0) {
        console.log(`✅ Todas las llamadas ya tienen transacciones procesadas`);
        return false;
      }
      
      console.log(`🎯 ${trulyPendingCalls.length} llamadas REALMENTE pendientes:`);
      trulyPendingCalls.forEach(call => {
        console.log(`   - ${call.call_id.substring(0, 16)} (sin transacción)`);
      });
      
      return trulyPendingCalls.length > 0;
      
    } catch (error) {
      console.error('❌ Excepción verificando transacciones:', error);
      console.log('🔄 Error en verificación - procesando por seguridad');
      return true;
    }
  };

// ============================================================================
// 🔚 FINAL PARTE 5: FUNCIONES DE PROCESAMIENTO
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 6: FUNCIÓN FETCHCALLS OPTIMIZADA CON CARGA PROGRESIVA
// ============================================================================

  const fetchCalls = async () => {
    console.log("🚀 FETCH CALLS OPTIMIZADO - Carga progresiva iniciada");
    
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadingProgress('Getting agent configuration...');

      // PASO 1: Obtener agentes asignados al usuario
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
        setLoading(false);
        return;
      }

      const agentIds = assignments.map(a => a.agent_id);
      console.log("🎯 IDs de agentes asignados:", agentIds);

      setLoadingProgress('Loading agent information...');

      // PASO 2: Obtener detalles de los agentes asignados
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

      // PASO 3: Preparar IDs para búsqueda
      const agentUUIDs = agentDetails.map(agent => agent.id).filter(Boolean);
      const retellAgentIds = agentDetails.map(agent => agent.retell_agent_id).filter(Boolean);
      const allAgentIds = [...agentUUIDs, ...retellAgentIds].filter(Boolean);

      setLoadingProgress('Loading recent calls...');

      // 🚀 PASO 4: CARGA PROGRESIVA - Primero las más recientes
      const INITIAL_BATCH = 50;

      console.log('📊 LOADING ALL CALLS - Complete history mode');
      console.log(`🔍 AGENT DEBUG - UUIDs:`, agentUUIDs);
      console.log(`🔍 AGENT DEBUG - Retell:`, retellAgentIds);

      let query = supabase.from('calls').select('*');

      if (allAgentIds.length === 0) {
        console.error("❌ No agent IDs found");
        setCalls([]);
        setLoading(false);
        return;
      }

      console.log('🔧 QUERY DEBUG - All Agent IDs:', allAgentIds);
      query = query.in('agent_id', allAgentIds);
      console.log('📊 CARGANDO TODAS LAS LLAMADAS - Sin filtros automáticos');

      // 🔍 EJECUTAR CONSULTA CON DEBUG DETALLADO
      console.log('🚀 EJECUTANDO CONSULTA...');
      const { data: initialCalls, error: callsError } = await query
        .order('timestamp', { ascending: false })
        .limit(INITIAL_BATCH);

      // 🔍 DEBUG RESULTADO
      console.log(`📊 SQL QUERY RESULT:`, {
        found: initialCalls?.length || 0,
        hasError: !!callsError,
        errorMessage: callsError?.message
      });

      if (initialCalls && initialCalls.length > 0) {
        console.log('📋 SQL RESULT - Primera llamada:', {
          call_id: initialCalls[0].call_id?.substring(0, 16),
          agent_id: initialCalls[0].agent_id?.substring(0, 12),
          status: initialCalls[0].call_status,
          processed: initialCalls[0].processed_for_cost
        });
      }

      if (callsError) {
        console.error("❌ Error obteniendo llamadas iniciales:", callsError);
        setError(`Error obteniendo llamadas: ${callsError.message}`);
        return;
      }

      console.log(`📞 Llamadas iniciales cargadas: ${initialCalls?.length || 0}`);

      // PASO 5: Mapear llamadas iniciales con información del agente
      const userAgents = agentDetails?.map(agent => ({
        agent_id: agent.id,
        agents: agent
      })) || [];

      const mapCalls = (calls) => {
        return (calls || []).map(call => {
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
            call_agent: matchedAgent,
            agents: matchedAgent
          };
        });
      };

      const mappedInitialCalls = mapCalls(initialCalls);
      console.log("🔍 RAW CALLS FROM DB:", initialCalls?.length || 0);
      console.log("🔍 MAPPED CALLS TOTAL:", mappedInitialCalls?.length || 0);

      // ✅ MOSTRAR DATOS INICIALES RÁPIDAMENTE
      setCalls(mappedInitialCalls);
      setLoading(false);
      setLoadingProgress('');

      console.log("🎉 PRIMERA CARGA COMPLETADA - Mostrando datos iniciales");

      // 🔄 PASO 6: CARGAR EL RESTO EN BACKGROUND
      if (initialCalls.length === INITIAL_BATCH) {
        setBackgroundLoading(true);
        setHasMoreCalls(true);
        
        setTimeout(async () => {
          try {
            console.log("📦 Cargando llamadas adicionales en background...");
            
            const lastTimestamp = initialCalls[initialCalls.length - 1]?.timestamp;
            
            let remainingQuery = supabase
              .from('calls')
              .select('*')
              .in('agent_id', allAgentIds);

            const { data: remainingCalls, error: remainingError } = await remainingQuery
              .order('timestamp', { ascending: false })
              .lt('timestamp', lastTimestamp);

            if (!remainingError && remainingCalls) {
              const mappedRemainingCalls = mapCalls(remainingCalls);
              const allCalls = [...mappedInitialCalls, ...mappedRemainingCalls];
              
              console.log(`📞 Llamadas adicionales cargadas: ${remainingCalls.length}`);
              console.log(`📊 Total de llamadas: ${allCalls.length}`);
              
              setCalls(allCalls);
              setHasMoreCalls(false);
            }
          } catch (err) {
            console.error("❌ Error cargando llamadas adicionales:", err);
          } finally {
            setBackgroundLoading(false);
          }
        }, 1000);
      } else {
        setHasMoreCalls(false);
      }

      // 🎵 PASO 7: CARGAR AUDIO SOLO DE LAS PRIMERAS LLAMADAS VISIBLES
      setTimeout(() => {
        loadAudioForVisibleCalls(mappedInitialCalls.slice(0, 10));
      }, 500);

    } catch (err: any) {
      console.error("❌ Excepción en fetch calls:", err);
      setError(`Exception: ${err.message}`);
      setLoading(false);
    }
  };

// ============================================================================
// 🔚 FINAL PARTE 6: FUNCIÓN FETCHCALLS OPTIMIZADA
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 7: FUNCIONES DE FILTROS Y PAGINACIÓN
// ============================================================================

  // ============================================================================
  // 🆕 FUNCIÓN DE PAGINACIÓN
  // ============================================================================
  const applyPagination = () => {
    const totalPages = Math.ceil(filteredCalls.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredCalls.slice(startIndex, endIndex);
    
    console.log(`📄 Paginación aplicada: Página ${currentPage}/${totalPages}, mostrando ${startIndex + 1}-${Math.min(endIndex, filteredCalls.length)} de ${filteredCalls.length}`);
    
    setPaginatedCalls(paginatedData);
    return totalPages;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    console.log(`📄 Cambio de página: ${newPage}`);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    console.log(`📄 Cambio de tamaño de página: ${newPageSize}`);
  };

  // ============================================================================
  // FUNCIONES DE FILTROS Y ESTADÍSTICAS CORREGIDAS
  // ============================================================================
  const applyFiltersAndSort = () => {
    console.log("🔍 BEFORE FILTERS - Total calls:", calls.length);
    
    let filtered = [...calls];

    // Filtro por búsqueda
    if (searchTerm) {
      const beforeSearch = filtered.length;
      filtered = filtered.filter(call => 
        validateCall(call) && (
          call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.from_number.includes(searchTerm) ||
          call.to_number.includes(searchTerm) ||
          call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (call.call_agent?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      console.log(`🔍 SEARCH FILTER: ${beforeSearch} → ${filtered.length} (term: "${searchTerm}")`);
    }

    // Filtro por estado
    if (statusFilter !== "all") {
      const beforeStatus = filtered.length;
      filtered = filtered.filter(call => validateCall(call) && call.call_status === statusFilter);
      console.log(`🔍 STATUS FILTER: ${beforeStatus} → ${filtered.length} (status: "${statusFilter}")`);
    }

    // ✅ FILTRO POR AGENTE CON DEBUG DETALLADO
    if (agentFilter !== null) {
      const beforeAgent = filtered.length;
      const selectedAgent = userAssignedAgents.find(agent => agent && agent.id === agentFilter);
      
      console.log(`🔍 AGENT FILTER DEBUG:`, {
        agentFilter,
        selectedAgent: selectedAgent ? {
          id: selectedAgent.id,
          name: selectedAgent.name,
          retell_agent_id: selectedAgent.retell_agent_id
        } : null
      });
      
      if (selectedAgent) {
        console.log(`🔍 Filtrando por agente: ${selectedAgent.name}`);
        
        filtered = filtered.filter(call => {
          if (!validateCall(call)) return false;
          
          const matchesId = call.agent_id === selectedAgent.id;
          const matchesRetell = call.agent_id === selectedAgent.retell_agent_id;
          const matchesCallAgent = call.call_agent?.id === selectedAgent.id;
          
          return matchesId || matchesRetell || matchesCallAgent;
        });
      } else {
        filtered = [];
      }
      
      console.log(`🔍 AGENT FILTER: ${beforeAgent} → ${filtered.length}`);
    }

    // Filtro por fecha
    const beforeDate = filtered.length;
    filtered = filtered.filter(call => validateCall(call) && isDateInRange(call.timestamp));
    console.log(`🔍 DATE FILTER: ${beforeDate} → ${filtered.length} (filter: "${dateFilter}")`);

    // Ordenamiento
    filtered.sort((a, b) => {
      if (!validateCall(a) || !validateCall(b)) return 0;
      
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

    console.log("🔍 AFTER ALL FILTERS - Total:", filtered.length);
    
    setFilteredCalls(filtered);
  };

  const calculateStats = () => {
    let totalCost = 0;
    let totalDuration = 0;
    let completedCalls = 0;

    calls.forEach((call) => {
      if (!validateCall(call)) return;
      
      const duration = getCallDuration(call);
      totalDuration += duration;
      const callCost = calculateCallCost(call);
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
  };

  // ============================================================================
  // FUNCIONES DE UTILIDAD CORREGIDAS
  // ============================================================================
  const isDateInRange = (callTimestamp: string): boolean => {
    if (!callTimestamp) return false;
    
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

// ============================================================================
// 🔚 FINAL PARTE 7: FUNCIONES DE FILTROS Y PAGINACIÓN
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 8: USEEFFECTS CORREGIDOS
// ============================================================================

  // ============================================================================
  // useEffects CORREGIDOS
  // ============================================================================

  // Efecto principal: Cargar datos cuando el usuario está disponible
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 INITIATING CORRECTED SYSTEM for:', user.email);
      console.log('💡 MODE: Read-only and visualization - Webhook handles deductions');
      fetchCalls();
    }
  }, [user?.id]);

  // Efecto para aplicar filtros y ordenamiento
  useEffect(() => {
    if (calls.length > 0) {
      applyFiltersAndSort();
      calculateStats();
    }
  }, [calls, searchTerm, statusFilter, agentFilter, dateFilter, customDate]);

  // 🆕 Efecto para aplicar paginación y cargar audio de página actual
  useEffect(() => {
    const totalPages = applyPagination();
    
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }

    // 🎵 Cargar audio solo para las llamadas de la página actual
    if (paginatedCalls.length > 0) {
      loadAudioForVisibleCalls(paginatedCalls);
    }
  }, [filteredCalls, currentPage, pageSize]);

  // 🆕 Efecto para resetear página cuando cambien filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, agentFilter, dateFilter, customDate]);

  // ✅ useEffect CON LOGS DETALLADOS para debugging
  useEffect(() => {
    console.log(`🔥 useEffect EJECUTADO - Navegación detectada`);
    console.log(`📊 Estado actual:`, {
      callsLength: calls.length,
      loading,
      backgroundLoading,
      isProcessing,
      userId: user?.id
    });
    
    if (calls.length > 0) {
      console.log(`📋 Llamadas actuales:`, calls.map(call => ({
        id: call.call_id?.substring(0, 12),
        processed: call.processed_for_cost,
        cost: call.cost_usd,
        status: call.call_status
      })));
    }
    
    if (calls.length > 0 && !loading && !backgroundLoading && !isProcessing) {
      setTimeout(async () => {
        console.log(`⏰ setTimeout EJECUTÁNDOSE después de navegación`);
        if (!isProcessing && await shouldProcessCalls()) {
          console.log(`🚀 INICIANDO processCallCostAndDeduct por navegación`);
          // Aquí iría la función de procesamiento si fuera necesaria
        } else {
          console.log("🛡️ shouldProcessCalls() impidió procesamiento duplicado");
        }
      }, 1000);
      
      const interval = setInterval(async () => {
        console.log(`⏰ Intervalo ejecutándose...`);
        if (!backgroundLoading && !isProcessing && await shouldProcessCalls()) {
          console.log(`⏰ Intervalo: Procesando llamadas pendientes`);
          // Aquí iría la función de procesamiento si fuera necesaria
        } else {
          console.log("⏰ Intervalo: No hay llamadas realmente pendientes");
        }
      }, 30000);
      
      return () => {
        console.log(`🧹 useEffect cleanup - desmontando componente`);
        clearInterval(interval);
      };
    }
  }, [
    user?.id,
    calls.length,
    loading,
    backgroundLoading
  ]);

// ============================================================================
// 🔚 FINAL PARTE 8: USEEFFECTS CORREGIDOS
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 9: FUNCIONES DE FORMATO Y HANDLERS
// ============================================================================

  // ============================================================================
  // FUNCIONES DE FORMATO CORREGIDAS
  // ============================================================================
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'ended': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    if (!sentiment) return 'bg-gray-50 text-gray-600 border-gray-200';
    
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
    if (!timestamp) return 'Invalid Date';
    
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
    if (!timestamp) return 'Invalid Time';
    
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
  // HANDLERS DE EVENTOS CORREGIDOS
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
    if (!validateCall(call)) {
      console.warn('handleCallClick: invalid call', call);
      return;
    }
    
    const originalCall = calls.find(c => c.id === call.id) || call;
    setSelectedCall(originalCall);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCall(null);
  };

  // Variables auxiliares para la UI
  const uniqueStatuses = [...new Set(calls.filter(validateCall).map(call => call.call_status))];
  const selectedAgentName = agentFilter ? getAgentNameLocal(agentFilter) : null;
  const totalPages = Math.ceil(filteredCalls.length / pageSize);

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
// 🔚 FINAL PARTE 9: FUNCIONES DE FORMATO Y HANDLERS
// ============================================================================
// ============================================================================
// 🚀 INICIO PARTE 10: RENDER DEL COMPONENTE PRINCIPAL - FINAL
// ============================================================================

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <div className="space-y-6">
          {/* Header CORREGIDO */}
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
                
                <div className="flex items-center gap-3">
                  {isProcessing && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <span className="text-xs font-medium text-blue-600">Visual Update</span>
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
                  console.log("🔄 REFRESH MANUAL - Solo lectura");
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
                    <span className="text-xs">Refresh</span>
                  </div>
                )}
              </Button>
              
              <div className="text-right">
                <div className="text-xs font-medium text-green-600">🟢 System Active</div>
                <div className="text-xs text-gray-500">Updated</div>
              </div>
            </div>
          </div>

          {/* 🆕 MENSAJE INFORMATIVO ACTUALIZADO */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700 text-sm font-medium">
                  💰 Exact cost deduction system active - Real calls durations processed.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 🆕 INDICADOR DE PROCESAMIENTO EXACTO */}
          {isProcessing && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-3"></div>
                  <span className="text-green-700 font-medium">
                    💰 Processing exact costs with real calls durations...
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

          {/* 🚨 FILTROS CORREGIDOS */}
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
                  Showing {paginatedCalls.length} of {filteredCalls.length} calls
                  {filteredCalls.length !== calls.length && (
                    <span className="text-gray-400"> (filtered from {calls.length})</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calls Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  📋 Call History ({filteredCalls.length})
                  
                  {totalPages > 1 && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      - Página {currentPage} de {totalPages}
                    </span>
                  )}
                </CardTitle>
                
                {backgroundLoading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading more calls...</span>
                  </div>
                )}
                
                {hasMoreCalls && !backgroundLoading && (
                  <div className="text-sm text-gray-500">
                    ⏳ Hay más llamadas disponibles
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                  <div className="ml-3">
                    <span className="text-gray-600 block">Loading calls...</span>
                    {loadingProgress && (
                      <span className="text-sm text-gray-500 mt-1 block">{loadingProgress}</span>
                    )}
                  </div>
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
                <>
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
                              Cost (Visual) {getSortIcon('cost_usd')}
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
                            Process Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedCalls.filter(validateCall).map((call, index) => (
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
                                  `${getCallDuration(call)}s (audio)` : 
                                  `${getCallDuration(call)}s (db)`
                                }
                              </div>
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(calculateCallCost(call))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
                                  return agentRate ? 
                                    `$${agentRate}/min` :
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
                              <div className="flex flex-col gap-1">
                                {call.processed_for_cost ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs border-green-200">
                                    ✅ Processed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs border-yellow-200">
                                    ⏳ Pending
                                  </Badge>
                                )}
                                <div className="text-xs text-gray-500">
                                  {call.processed_for_cost ? 'Cost applied' : 'Awaiting process'}
                                </div>
                              </div>
                            </td>

                            {/* 🚨 ACTIONS COLUMN - CORREGIDO */}
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
                                // ✅ CÓDIGO CORREGIDO 
{call.recording_url && (
  
    href={call.recording_url}
    download={`call-${call.call_id}.mp3`}
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center justify-center h-6 w-6 p-0 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
  >
    <Download className="h-3 w-3" />
  </a>
)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 🆕 Controles de Paginación */}
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={filteredCalls.length}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </>
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

// ============================================================================
// 🔚 FINAL PARTE 10: RENDER DEL COMPONENTE PRINCIPAL - FINAL
// ============================================================================

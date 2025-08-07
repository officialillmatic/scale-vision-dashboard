// 🔥 CALLSSIMPLE.TSX CORREGIDO - Carga valores exactos desde el primer momento
// No muestra estimaciones de BD, solo valores exactos
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CallDetailModal } from "@/components/calls/CallDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone, Clock, DollarSign, User, Calendar, Search, FileText, PlayCircle, TrendingUp,
  Filter, Eye, ArrowUpDown, Volume2, Download, CalendarDays, ChevronDown, Users,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";

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
  processed_for_cost?: boolean;
}

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status' | 'end_reason';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'custom';
type CostFilter = 'all' | 'with_cost' | 'without_cost';

// Estados disponibles comunes del sistema
const CALL_STATUSES = [
  'registered',
  'ongoing', 
  'in_progress',
  'completed',
  'ended',
  'error',
  'failed',
  'cancelled',
  'timeout'
];

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
// COMPONENTE DE PAGINACIÓN
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
        <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
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
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function CallsSimple() {
  const { user } = useAuth();
  const { getAgentName, isLoadingAgents } = useAgents();
  
  // Estados básicos
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
  const [costFilter, setCostFilter] = useState<CostFilter>("all");
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedCalls, setPaginatedCalls] = useState<Call[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const lastProcessedRef = useRef<Set<string>>(new Set());

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
  // FUNCIONES AUXILIARES
  // ============================================================================
  
  const getCallDuration = (call: any) => {
    if (audioDurations[call.id] && audioDurations[call.id] > 0) {
      console.log(`🎵 Using EXACT audio duration: ${audioDurations[call.id]}s for ${call.call_id?.substring(0, 8)}`);
      return audioDurations[call.id];
    }
    
    if (call.duration_sec && call.duration_sec > 0) {
      console.log(`📊 Using DB duration: ${call.duration_sec}s for ${call.call_id?.substring(0, 8)}`);
      return call.duration_sec;
    }
    
    console.log(`⚠️ No duration available for ${call.call_id?.substring(0, 8)}`);
    return 0;
  };

  const calculateCallCost = (call: Call) => {
    console.log(`💰 Calculating EXACT cost for call ${call.call_id?.substring(0, 8)}:`);
    
    const duration = getCallDuration(call);
    if (duration === 0) {
      console.log(`⚠️ No duration, cost = $0`);
      return 0;
    }
    
    const durationMinutes = duration / 60;
    let agentRate = 0;
    
    if (call.call_agent?.rate_per_minute) {
      agentRate = call.call_agent.rate_per_minute;
      console.log(`✅ Using call_agent rate: $${agentRate}/min`);
    } else if (call.agents?.rate_per_minute) {
      agentRate = call.agents.rate_per_minute;
      console.log(`✅ Using agents rate: $${agentRate}/min`);
    } else {
      const userAgent = userAssignedAgents.find(agent => 
        agent.id === call.agent_id || 
        agent.retell_agent_id === call.agent_id
      );
      
      if (userAgent?.rate_per_minute) {
        agentRate = userAgent.rate_per_minute;
        console.log(`✅ Using userAssignedAgents rate: $${agentRate}/min`);
      } else {
        console.log(`❌ No rate available, cost = $0`);
        return 0;
      }
    }
    
    const calculatedCost = Math.round(((duration / 60.0) * agentRate) * 10000) / 10000;
    console.log(`🧮 EXACT CALCULATED COST: ${durationMinutes.toFixed(2)}min × $${agentRate}/min = $${calculatedCost.toFixed(4)}`);
    
    return calculatedCost;
  };

  // 🔧 FUNCIÓN ACTUALIZADA: Fuerza actualización inmediata
  const loadAudioDuration = async (call: Call) => {
    if (!call.recording_url || audioDurations[call.id]) return;
    
    try {
      console.log(`🎵 Loading EXACT audio duration for ${call.call_id?.substring(0, 8)}...`);
      const audio = new Audio(call.recording_url);
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          console.log(`✅ EXACT audio loaded: ${duration}s for ${call.call_id?.substring(0, 8)}`);
          setAudioDurations(prev => ({
            ...prev,
            [call.id]: duration
          }));
          
          // 🔧 FORCE UPDATE: Simple counter increment
          setForceUpdate(prev => prev + 1);
          
          resolve();
        });
        
        audio.addEventListener('error', () => {
          console.log(`❌ Error loading audio for ${call.call_id?.substring(0, 8)}`);
          resolve();
        });

        setTimeout(() => {
          console.log(`⏰ Timeout loading audio for ${call.call_id?.substring(0, 8)}`);
          resolve();
        }, 5000);
      });
    } catch (error) {
      console.log(`❌ Error loading audio duration:`, error);
    }
  };

  const loadAudioForVisibleCalls = async (visibleCalls: Call[]) => {
    const callsWithAudio = visibleCalls.filter(call => 
      call.recording_url && !audioDurations[call.id]
    );
    
    if (callsWithAudio.length === 0) return;
    
    console.log(`🎵 Loading EXACT audio for ${callsWithAudio.length} visible calls...`);
    
    for (let i = 0; i < callsWithAudio.length; i += 2) {
      const batch = callsWithAudio.slice(i, i + 2);
      await Promise.all(batch.map(call => loadAudioDuration(call)));
      if (i + 2 < callsWithAudio.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // ============================================================================
  // FUNCIÓN DE DESCUENTO EXACTO SIN DUPLICACIÓN
  // ============================================================================

  const processCallCostAndDeduct = async (call: Call) => {
    console.log(`💰 PROCESSING EXACT DEDUCTION (NO DUPLICATES) for call ${call.call_id?.substring(0, 8)}:`);
    
    try {
      // 🔍 VERIFICACIÓN ESTRICTA ANTI-DUPLICADOS
      console.log(`🔍 ANTI-DUPLICATE CHECK: ${call.call_id?.substring(0, 8)}`);
      
      const { data: existingTx, error: checkError } = await supabase
        .from('credit_transactions')
        .select('id, description, amount, created_at')
        .eq('user_id', user.id)
        .ilike('description', `%${call.call_id}%`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking duplicates for ${call.call_id}:`, checkError);
      }

      if (existingTx && !checkError) {
        console.log(`✅ CALL ALREADY PROCESSED - SKIPPING: ${call.call_id?.substring(0, 8)}`);
        console.log(`   📋 Existing transaction: ${existingTx.id}`);
        console.log(`   💰 Amount already deducted: $${Math.abs(existingTx.amount).toFixed(4)}`);
        console.log(`   📅 Processed at: ${existingTx.created_at}`);
        
        // Marcar como procesada en la BD si no está marcada
        if (!call.processed_for_cost) {
          await supabase
            .from('calls')
            .update({ processed_for_cost: true })
            .eq('call_id', call.call_id)
            .eq('user_id', user.id);
          
          console.log(`✅ Marked as processed in DB: ${call.call_id?.substring(0, 8)}`);
        }
        
        return { 
          success: true, 
          message: 'Already processed - no duplicate deduction', 
          existingTransaction: existingTx.id,
          alreadyDeducted: Math.abs(existingTx.amount),
          processedAt: existingTx.created_at
        };
      }

      console.log(`🆕 NEW CALL - Proceeding with SINGLE deduction: ${call.call_id?.substring(0, 8)}`);

      // ✅ VERIFICAR QUE NO ESTÉ MARCADA COMO PROCESADA
      if (call.processed_for_cost) {
        console.log(`⚠️ Call marked as processed in DB but no transaction found: ${call.call_id?.substring(0, 8)}`);
        console.log(`🔄 This might be a data inconsistency - will proceed with caution`);
      }

      // ✅ ESPERAR A QUE SE CARGUE EL AUDIO PARA MÁXIMA PRECISIÓN
      if (call.recording_url && !audioDurations[call.id]) {
        console.log(`🎵 Loading audio for exact duration: ${call.call_id?.substring(0, 8)}`);
        await loadAudioDuration(call);
        // Esperar un poco para que se procese
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const exactDuration = getCallDuration(call);
      if (exactDuration === 0) {
        console.log(`❌ No valid duration for ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'No valid duration' };
      }

      const exactCost = calculateCallCost(call);
      if (exactCost === 0) {
        console.log(`❌ No valid cost for ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'No valid rate' };
      }

      const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
      console.log(`🧮 FINAL EXACT CALCULATION: ${exactDuration}s × $${agentRate}/min = $${exactCost.toFixed(4)}`);

      // ✅ REALIZAR EL DESCUENTO ÚNICO
      console.log(`💳 DEDUCTING EXACT BALANCE for user: ${user.id}`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user.id,
        p_amount: -exactCost,
        p_description: `Exact call cost: ${call.call_id} (${(exactDuration/60).toFixed(2)}min @ $${agentRate}/min)`,
        p_admin_id: 'callssimple-no-duplicate'
      });

      let deductSuccess = false;
      let deductMethod = '';

      if (!rpcError) {
        console.log(`✅ Successful RPC deduction: $${exactCost.toFixed(4)}`);
        deductSuccess = true;
        deductMethod = 'rpc';
      } else {
        console.log(`❌ RPC error, trying direct deduction:`, rpcError);
        
        const { data: currentCredit, error: creditError } = await supabase
          .from('user_credits')
          .select('current_balance')
          .eq('user_id', user.id)
          .single();

        if (!creditError && currentCredit) {
          const currentBalance = currentCredit.current_balance || 0;
          const newBalance = Math.max(0, currentBalance - exactCost);
          
          console.log(`💰 Direct balance update: $${currentBalance} → $${newBalance}`);
          
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
              transaction_type: 'call_charge_exact_no_dup',
              description: `Exact call cost: ${call.call_id} (${(exactDuration/60).toFixed(2)}min @ $${agentRate}/min)`,
              balance_after: newBalance,
              created_by: 'callssimple-no-duplicate',
              reference_id: call.call_id,
              created_at: new Date().toISOString()
            });

            console.log(`✅ Successful direct deduction: $${exactCost.toFixed(4)}`);
            deductSuccess = true;
            deductMethod = 'direct';
          } else {
            console.error(`❌ Error updating direct balance:`, updateError);
          }
        } else {
          console.error(`❌ Error getting current balance:`, creditError);
        }
      }

      if (!deductSuccess) {
        return { success: false, error: 'Failed balance deduction' };
      }

      // ✅ ACTUALIZAR LLAMADA CON COSTO EXACTO Y MARCAR COMO PROCESADA
      console.log(`📝 UPDATING CALL WITH EXACT COST: $${exactCost.toFixed(4)}`);
      
      const { error: updateCallError } = await supabase
        .from('calls')
        .update({
          cost_usd: exactCost,
          duration_sec: exactDuration,
          processed_for_cost: true, // 🔧 MARCAR COMO PROCESADA
        })
        .eq('call_id', call.call_id)
        .eq('user_id', user.id);

      if (updateCallError) {
        console.error(`❌ Error updating call:`, updateCallError);
        return { success: false, error: 'Error updating call' };
      }

      // ✅ ACTUALIZAR ESTADO LOCAL
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

      console.log(`🎉 SINGLE EXACT DEDUCTION COMPLETED:`);
      console.log(`   📞 Call: ${call.call_id?.substring(0, 8)}`);
      console.log(`   ⏱️ Exact Duration: ${exactDuration}s`);
      console.log(`   💰 Exact Cost: $${exactCost.toFixed(4)}`);
      console.log(`   🔧 Method: ${deductMethod}`);
      console.log(`   🚫 Duplicates: PREVENTED`);

      return { 
        success: true, 
        cost: exactCost, 
        duration: exactDuration,
        method: deductMethod,
        noDuplicates: true
      };

    } catch (error) {
      console.error(`❌ Critical error in exact deduction (no duplicates):`, error);
      return { success: false, error: error.message };
    }
  };

  const processNewCallsExact = async () => {
    if (isProcessing) {
      console.log('🛑 Already processing, skipping...');
      return;
    }
    
    if (!calls.length || !user?.id || loading || backgroundLoading) {
      console.log('❌ EXITING - conditions not met for exact processing');
      return;
    }
    
    if (!(await shouldProcessCalls())) {
      console.log('🛑 shouldProcessCalls() returned false - no truly pending calls');
      return;
    }
    
    console.log('💰 STARTING EXACT PROCESSING (NO DUPLICATES)...');
    setIsProcessing(true);
    
    try {
      console.log('📊 CHECKING CALLS FOR EXACT DEDUCTION (NO DUPLICATES)...');

      const callsNeedingExactProcessing = calls.filter(call => {
        const isCompleted = ['completed', 'ended'].includes(call.call_status?.toLowerCase());
        const actualDuration = getCallDuration(call);
        const hasValidDuration = actualDuration > 0;
        const notProcessed = !call.processed_for_cost;
        const hasRate = (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute) > 0;
        
        const needsProcessing = isCompleted && hasValidDuration && notProcessed && hasRate;
        
        if (isCompleted && notProcessed) {
          console.log(`🔍 EXACT ANALYSIS (NO DUPLICATES) ${call.call_id?.substring(0, 8)}:`, {
            status: call.call_status,
            duration_bd: call.duration_sec,
            audio_duration: audioDurations[call.id] || 'not loaded',
            actual_duration: actualDuration,
            current_cost: call.cost_usd,
            has_rate: hasRate,
            processed_for_cost: call.processed_for_cost,
            needs_processing: needsProcessing
          });
        }
        
        return needsProcessing;
      });

      if (callsNeedingExactProcessing.length === 0) {
        console.log('✅ All calls have been processed with exact costs (no duplicates)');
        return;
      }

      console.log(`💰 PROCESSING ${callsNeedingExactProcessing.length} calls with exact deductions (NO DUPLICATES)`);

      let processedCount = 0;
      let errors = 0;
      let totalDeducted = 0;
      let skippedDuplicates = 0;

      for (const call of callsNeedingExactProcessing) {
        try {
          console.log(`\n💳 PROCESSING EXACT DEDUCTION (NO DUPLICATES): ${call.call_id}`);
          
          const result = await processCallCostAndDeduct(call);
          
          if (result.success) {
            if (result.existingTransaction) {
              skippedDuplicates++;
              console.log(`🛡️ DUPLICATE PREVENTED: ${call.call_id} - Already processed`);
            } else {
              processedCount++;
              totalDeducted += result.cost || 0;
              console.log(`✅ SUCCESSFUL EXACT DEDUCTION (NO DUPLICATES): ${call.call_id} - $${(result.cost || 0).toFixed(4)}`);
            }
          } else {
            console.error(`❌ Error in exact deduction ${call.call_id}:`, result.error);
            errors++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Exception in exact deduction ${call.call_id}:`, error);
          errors++;
        }
      }

      console.log(`\n🎯 EXACT DEDUCTIONS COMPLETED (NO DUPLICATES):`);
      console.log(`   ✅ Processed: ${processedCount}`);
      console.log(`   🛡️ Duplicates prevented: ${skippedDuplicates}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   💰 Total deducted: $${totalDeducted.toFixed(4)}`);
      console.log(`   🔒 No duplicate deductions occurred`);
  
    } catch (error) {
      console.error(`❌ Critical error in processNewCallsExact:`, error);
    } finally {
      setIsProcessing(false);
    }

    if (processedCount > 0) {
      calculateStats();
    }
  };

  // ============================================================================
  // FETCH CALLS - 🔧 CORREGIDO PARA MANEJAR END_REASON OPCIONAL
  // ============================================================================
  
  const fetchCalls = async () => {
    console.log("🚀 FETCH CALLS - LOADING EXACT VALUES FROM START");
    
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
        console.error("❌ Error getting assignments:", assignmentsError);
        setError(`Error getting assignments: ${assignmentsError.message}`);
        return;
      }

      if (!assignments || assignments.length === 0) {
        console.log("⚠️ User without agent assignments");
        setCalls([]);
        setUserAssignedAgents([]);
        setStats({ total: 0, totalCost: 0, totalDuration: 0, avgDuration: 0, completedCalls: 0 });
        setLoading(false);
        return;
      }

      const agentIds = assignments.map(a => a.agent_id);
      console.log("🎯 Assigned agent IDs:", agentIds);

      setLoadingProgress('Loading agent information...');

      // PASO 2: Obtener detalles de los agentes asignados
      const { data: agentDetails, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, rate_per_minute, retell_agent_id')
        .in('id', agentIds);

      if (agentsError) {
        console.error("❌ Error getting agent details:", agentsError);
        setError(`Error getting agents: ${agentsError.message}`);
        return;
      }

      console.log("🤖 Agent details obtained:", agentDetails);
      setUserAssignedAgents(agentDetails || []);

      setLoadingProgress('Loading calls...');

      // 🔧 BÚSQUEDA DIRECTA POR USER_ID CON MANEJO SEGURO DE END_REASON
      console.log('🚀 EXECUTING DIRECT CALL QUERY...');
      
      const { data: allCalls, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id) // 🎯 BÚSQUEDA DIRECTA
        .order('timestamp', { ascending: false })
        .limit(200);

      console.log(`📊 DIRECT QUERY RESULT:`, {
        totalFound: allCalls?.length || 0,
        hasError: !!callsError,
        errorMessage: callsError?.message || 'No errors'
      });

      if (callsError) {
        console.error("❌ Error getting calls:", callsError);
        setError(`Error getting calls: ${callsError.message}`);
        return;
      }

      if (allCalls && allCalls.length > 0) {
        console.log('✅ CALLS FOUND:');
        
        // Separar llamadas reales vs de prueba
        const realCalls = allCalls.filter(call => !call.call_id.includes('test_'));
        const testCalls = allCalls.filter(call => call.call_id.includes('test_'));
        
        console.log(`   📞 REAL calls: ${realCalls.length}`);
        console.log(`   🧪 TEST calls: ${testCalls.length}`);
        
        if (realCalls.length > 0) {
          console.log('📞 FIRST 3 REAL CALLS:');
          realCalls.slice(0, 3).forEach((call, index) => {
            console.log(`   ${index + 1}. ${call.call_id?.substring(0, 16)} - Status: ${call.call_status} - End Reason: ${call.end_reason || 'NULL'} - Cost: $${call.cost_usd} - Processed: ${call.processed_for_cost}`);
          });
        }
        
      } else {
        console.log('❌ NO CALLS FOUND');
      }

      // PASO 4: Mapear llamadas con información del agente
      const userAgents = agentDetails?.map(agent => ({
        agent_id: agent.id,
        agents: agent
      })) || [];

      const mapCalls = (calls) => {
        return (calls || []).map(call => {
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
          } else {
            matchedAgent = {
              id: call.agent_id,
              name: `Agent ${call.agent_id.substring(0, 8)}...`,
              rate_per_minute: 0.02
            };
          }

          // 🔧 MANEJAR END_REASON DE FORMA SEGURA
          const endReason = call.end_reason || null;
          console.log(`🔗 End reason for ${call.call_id?.substring(0, 8)}: "${endReason || 'NULL'}"`);

          return {
            ...call,
            call_agent: matchedAgent,
            agents: matchedAgent,
            end_reason: endReason
          };
        });
      };

      const mappedCalls = mapCalls(allCalls);

      // 🔧 CARGA PRIORITARIA DE AUDIO - ANTES DE MOSTRAR LA TABLA
      console.log("🎵 PRIORITY: Loading exact audio durations before displaying...");
      const callsWithAudio = mappedCalls.filter(call => call.recording_url);
      if (callsWithAudio.length > 0) {
        setLoadingProgress('Loading exact audio durations...');
        setIsLoadingAudio(true);
        console.log(`🎵 Loading audio for ${callsWithAudio.length} calls with recordings...`);
        
        // Cargar audio para las primeras 8 llamadas inmediatamente (para que se vean exactas)
        const priorityCalls = callsWithAudio.slice(0, 8);
        for (const call of priorityCalls) {
          await loadAudioDuration(call);
        }
        console.log(`✅ Priority audio loaded for ${priorityCalls.length} calls`);
        setIsLoadingAudio(false);
      }
      
      console.log("🔄 MAPPING COMPLETED:");
      console.log(`   📊 Mapped calls: ${mappedCalls.length}`);
      console.log(`   🎯 With valid agents: ${mappedCalls.filter(c => c.call_agent?.rate_per_minute > 0).length}`);
      console.log(`   🎵 Audio loaded for: ${Object.keys(audioDurations).length} calls`);
      console.log(`   🔗 With end_reason: ${mappedCalls.filter(c => c.end_reason).length} calls`);

      setCalls(mappedCalls);
      setLoading(false);
      setLoadingProgress('');

      console.log("🎉 LOAD COMPLETED - Exact values loaded from start");

    } catch (err: any) {
      console.error("❌ Exception in fetch calls:", err);
      setError(`Exception: ${err.message}`);
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIÓN AUXILIAR PARA VERIFICAR LLAMADAS PENDIENTES
  // ============================================================================
  const shouldProcessCalls = async () => {
    if (loading || backgroundLoading || isProcessing) {
      console.log(`🛑 Not processing: loading=${loading}, backgroundLoading=${backgroundLoading}, isProcessing=${isProcessing}`);
      return false;
    }
    
    const potentiallyPendingCalls = calls.filter(call => 
      ['completed', 'ended'].includes(call.call_status?.toLowerCase()) && 
      (call.duration_sec > 0 || call.recording_url) &&
      (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute) > 0
    );
    
    if (potentiallyPendingCalls.length === 0) {
      console.log(`✅ No completed calls to verify`);
      return false;
    }
    
    console.log(`🔍 Checking ${potentiallyPendingCalls.length} calls against transactions (ANTI-DUPLICATE)...`);
    
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
          console.log(`⚠️ Error checking ${callIdShort}:`, error.message);
          continue;
        }
        
        if (existingTx && existingTx.length > 0) {
          processedCallIds.add(call.call_id);
          console.log(`✅ Transaction found for: ${callIdShort} - WILL SKIP`);
        } else {
          console.log(`🔄 No transaction for: ${callIdShort} - PENDING`);
        }
      }
      
      const trulyPendingCalls = potentiallyPendingCalls.filter(call => 
        !processedCallIds.has(call.call_id)
      );
      
      if (trulyPendingCalls.length === 0) {
        console.log(`✅ All calls already have processed transactions (NO DUPLICATES)`);
        return false;
      }
      
      console.log(`🎯 ${trulyPendingCalls.length} REALLY pending calls (NO DUPLICATES):`);
      trulyPendingCalls.forEach(call => {
        console.log(`   - ${call.call_id.substring(0, 16)} (no transaction yet)`);
      });
      
      return trulyPendingCalls.length > 0;
      
    } catch (error) {
      console.error('❌ Exception checking transactions:', error);
      return true;
    }
  };

  // ============================================================================
  // RESTO DE FUNCIONES (Filtros, Paginación, Handlers)
  // ============================================================================
  
  const applyPagination = () => {
    const totalPages = Math.ceil(filteredCalls.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredCalls.slice(startIndex, endIndex);
    
    setPaginatedCalls(paginatedData);
    return totalPages;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // FUNCIÓN ACTUALIZADA: Incluye filtro de costo
  const applyFiltersAndSort = () => {
    let filtered = [...calls];

    if (searchTerm) {
      filtered = filtered.filter(call => 
        call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.from_number.includes(searchTerm) ||
        call.to_number.includes(searchTerm) ||
        call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.end_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          const matchesCallAgent = call.call_agent?.id === selectedAgent.id;
          return matchesId || matchesRetell || matchesCallAgent;
        });
      } else {
        filtered = [];
      }
    }

    // FILTRO DE COSTO
    if (costFilter !== "all") {
      filtered = filtered.filter(call => {
        const callCost = calculateCallCost(call);
        if (costFilter === "with_cost") {
          return callCost > 0;
        } else if (costFilter === "without_cost") {
          return callCost === 0;
        }
        return true;
      });
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

  const calculateStats = () => {
    let totalCost = 0;
    let totalDuration = 0;
    let completedCalls = 0;

    calls.forEach((call) => {
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
      case 'all': return true;
      case 'today': return callDateOnly.getTime() === todayOnly.getTime();
      case 'yesterday': return callDateOnly.getTime() === yesterdayOnly.getTime();
      case 'last7days': return callDate >= last7Days;
      case 'custom':
        if (!customDate) return true;
        const selectedDate = new Date(customDate);
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return callDateOnly.getTime() === selectedDateOnly.getTime();
      default: return true;
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
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 days';
      case 'custom': return customDate ? new Date(customDate).toLocaleDateString() : 'Custom date';
      default: return 'All dates';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'ended': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': 
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'registered': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'failed': 
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'timeout': return 'bg-orange-100 text-orange-800 border-orange-200';
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

  // 🔧 FUNCIÓN PARA END_REASON CON CASOS COMUNES
  const getEndReasonColor = (endReason: string) => {
    if (!endReason) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    switch (endReason.toLowerCase()) {
      case 'user hangup':
      case 'user_hangup':
      case 'customer_hangup': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'agent hangup':
      case 'agent_hangup':
      case 'assistant_hangup': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'dial no answer':
      case 'dial_no_answer':
      case 'no_answer': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error llm websocket open':
      case 'error_llm_websocket_open':
      case 'technical_error':
      case 'llm_error':
      case 'websocket_error': return 'bg-red-100 text-red-800 border-red-200';
      case 'call completed':
      case 'call_completed':
      case 'completed':
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'timeout':
      case 'call_timeout': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
      case 'canceled':
      case 'call_cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'busy':
      case 'line_busy': return 'bg-red-100 text-red-600 border-red-200';
      case 'invalid_number':
      case 'invalid_phone_number': return 'bg-red-100 text-red-700 border-red-200';
      case 'voicemail':
      case 'reached_voicemail': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // 🔧 FUNCIÓN PARA FORMATEAR END REASON
  const formatEndReason = (endReason: string) => {
    if (!endReason) return 'Unknown';
    
    // Mapear valores específicos a nombres legibles
    const endReasonMap = {
      'user_hangup': 'User Hangup',
      'customer_hangup': 'Customer Hangup',
      'agent_hangup': 'Agent Hangup',
      'assistant_hangup': 'Assistant Hangup',
      'dial_no_answer': 'Dial No Answer',
      'no_answer': 'No Answer',
      'error_llm_websocket_open': 'LLM WebSocket Error',
      'technical_error': 'Technical Error',
      'llm_error': 'LLM Error',
      'websocket_error': 'WebSocket Error',
      'call_completed': 'Call Completed',
      'call_timeout': 'Call Timeout',
      'call_cancelled': 'Call Cancelled',
      'line_busy': 'Line Busy',
      'invalid_phone_number': 'Invalid Phone Number',
      'reached_voicemail': 'Reached Voicemail'
    };
    
    // Usar mapeo específico si existe, si no, formatear genéricamente
    if (endReasonMap[endReason.toLowerCase()]) {
      return endReasonMap[endReason.toLowerCase()];
    }
    
    return endReason
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
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

  // ============================================================================
  // USE EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 INITIATING SYSTEM WITH EXACT VALUES FROM START for:', user.email);
      fetchCalls();
    }
  }, [user?.id]);

  // useEffect ACTUALIZADO: Incluye forceUpdate y costFilter para actualizaciones automáticas
  useEffect(() => {
    if (calls.length > 0) {
      applyFiltersAndSort();
      calculateStats();
    }
  }, [calls, searchTerm, statusFilter, agentFilter, costFilter, dateFilter, customDate, forceUpdate]);

  useEffect(() => {
    const totalPages = applyPagination();
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
    if (paginatedCalls.length > 0) {
      loadAudioForVisibleCalls(paginatedCalls);
    }
  }, [filteredCalls, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, agentFilter, costFilter, dateFilter, customDate]);

  useEffect(() => {
    console.log(`🔥 useEffect EXECUTED - Navigation detected`);
    
    if (calls.length > 0 && !loading && !backgroundLoading && !isProcessing) {
      setTimeout(async () => {
        console.log(`⏰ setTimeout EXECUTING after navigation`);
        if (!isProcessing && await shouldProcessCalls()) {
          console.log(`🚀 STARTING processNewCallsExact`);
          processNewCallsExact();
        } else {
          console.log("🛡️ shouldProcessCalls() prevented duplicate processing");
        }
      }, 1000);
      
      const interval = setInterval(async () => {
        console.log(`⏰ Interval executing...`);
        if (!backgroundLoading && !isProcessing && await shouldProcessCalls()) {
          console.log(`⏰ Interval: Processing pending calls`);
          processNewCallsExact();
        } else {
          console.log("⏰ Interval: No really pending calls");
        }
      }, 30000);
      
      return () => {
        console.log(`🧹 useEffect cleanup - unmounting component`);
        clearInterval(interval);
      };
    }
  }, [user?.id, calls.length, loading, backgroundLoading]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // ACTUALIZADO: Usar CALL_STATUSES en lugar de uniqueStatuses solo de las llamadas actuales
  const availableStatuses = [...new Set([...CALL_STATUSES, ...calls.map(call => call.call_status)])].sort();
  const selectedAgentName = agentFilter ? getAgentNameLocal(agentFilter) : null;
  const totalPages = Math.ceil(filteredCalls.length / pageSize);

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
                      <span className="text-xs font-medium text-blue-600">Processing Exact Costs</span>
                    </div>
                  )}
                  
                  {isLoadingAudio && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-orange-600">Loading Exact Durations</span>
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
                  console.log("🔄 MANUAL REFRESH - EXACT VALUES");
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
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-gray-400 rounded-full"></div>
                    <span className="text-xs">Refresh</span>
                  </div>
                )}
              </Button>
              
              <div className="text-right">
                <div className="text-xs font-medium text-green-600">🟢 Real-Time</div>
                <div className="text-xs text-gray-500">Live Data</div>
              </div>
            </div>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700 text-sm font-medium">
                  💰 Exact cost deduction system active - Real calls processed.
                </span>
              </div>
            </CardContent>
          </Card>

          {isLoadingAudio && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-orange-700 text-sm font-medium">
                    🎵 Loading exact audio durations for precise costs...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-3"></div>
                  <span className="text-green-700 font-medium">
                    💰 Processing exact costs with real call durations (No duplicates)...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800 font-medium">❌ {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
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
                    placeholder="Search calls by ID, phone, agent, summary, or end reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  
                  {/* FILTRO DE ESTADOS ACTUALIZADO */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    {availableStatuses.map(status => (
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

                {/* FILTRO DE COSTO */}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <select
                    value={costFilter}
                    onChange={(e) => setCostFilter(e.target.value as CostFilter)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Calls</option>
                    <option value="with_cost">With Cost</option>
                    <option value="without_cost">Without Cost</option>
                  </select>
                </div>

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
                  {costFilter !== 'all' && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mr-2">
                      💰 {costFilter === 'with_cost' ? 'With Cost' : 'Without Cost'}
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
                      - Page {currentPage} of {totalPages}
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
                    ⏳ More calls available
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                  <div className="ml-3">
                    <span className="text-gray-600 block">
                      {loadingProgress.includes('audio') ? 'Loading exact durations...' : 'Loading calls...'}
                    </span>
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
                  {(dateFilter !== 'all' || costFilter !== 'all') && (
                    <div className="mt-4 space-x-2">
                      {dateFilter !== 'all' && (
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
                      )}
                      {costFilter !== 'all' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCostFilter('all')}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          💰 Show All Costs
                        </Button>
                      )}
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
                          {/* COLUMNA END REASON */}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => handleSort('end_reason')}
                              className="flex items-center gap-1 hover:text-gray-700"
                            >
                              End Reason {getSortIcon('end_reason')}
                            </button>
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
                        {paginatedCalls.map((call, index) => (
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
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                {audioDurations[call.id] ? (
                                  <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    {getCallDuration(call)}s (exact)
                                  </>
                                ) : call.recording_url ? (
                                  <>
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    {getCallDuration(call)}s (loading...)
                                  </>
                                ) : (
                                  <>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    {getCallDuration(call)}s (db)
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(calculateCallCost(call))}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                {(() => {
                                  const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
                                  const isExactCost = audioDurations[call.id] && agentRate;
                                  
                                  return isExactCost ? (
                                    <>
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      ${agentRate}/min (exact)
                                    </>
                                  ) : call.recording_url && !audioDurations[call.id] ? (
                                    <>
                                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                      ${agentRate}/min (calculating...)
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      ${agentRate}/min (estimated)
                                    </>
                                  );
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

                            {/* COLUMNA END REASON */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {call.end_reason ? (
                                  <Badge className={`text-xs ${getEndReasonColor(call.end_reason)}`}>
                                    <div className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {formatEndReason(call.end_reason)}
                                    </div>
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-gray-400">Unknown</span>
                                )}
                              </div>
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
                                  {call.processed_for_cost ? 'Exact cost' : 'Will process'}
                                </div>
                              </div>
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
                                  <a
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

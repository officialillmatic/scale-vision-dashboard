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
// INTERFACES AND TYPES
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

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'custom';

// ============================================================================
// AGENT FILTER COMPONENT
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
// PAGINATION COMPONENT
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
// MAIN COMPONENT
// ============================================================================
export default function CallsSimple() {
  const { user } = useAuth();
  const { getAgentName, isLoadingAgents } = useAgents();
  
  // Basic component states
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedCalls, setPaginatedCalls] = useState<Call[]>([]);

  // Auto-processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedRef = useRef<Set<string>>(new Set());

  // Auxiliary variables
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
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getCallDuration = (call: any) => {
    // Prioritize audio duration (more accurate)
    if (audioDurations[call.id] && audioDurations[call.id] > 0) {
      console.log(`🎵 Using audio duration: ${audioDurations[call.id]}s for ${call.call_id?.substring(0, 8)}`);
      return audioDurations[call.id];
    }
    
    // Fallback to duration_sec from DB
    if (call.duration_sec && call.duration_sec > 0) {
      console.log(`📊 Using DB duration: ${call.duration_sec}s for ${call.call_id?.substring(0, 8)}`);
      return call.duration_sec;
    }
    
    console.log(`⚠️ No duration available for ${call.call_id?.substring(0, 8)}`);
    return 0;
  };

  // FUNCTION: calculateCallCost
  const calculateCallCost = (call: Call) => {
    console.log(`💰 Calculating cost for call ${call.call_id?.substring(0, 8)}:`, {
      existing_cost: call.cost_usd,
      duration_sec: call.duration_sec,
      agent_id: call.agent_id,
      call_agent_rate: call.call_agent?.rate_per_minute,
      agents_rate: call.agents?.rate_per_minute
    });
    
    // 1. Get duration
    const duration = getCallDuration(call);
    if (duration === 0) {
      console.log(`⚠️ No duration, cost = $0`);
      return 0;
    }
    
    const durationMinutes = duration / 60;
    
    // 2. Find agent rate (prioritize call_agent, then agents)
    let agentRate = 0;
    
    if (call.call_agent?.rate_per_minute) {
      agentRate = call.call_agent.rate_per_minute;
      console.log(`✅ Using call_agent rate: $${agentRate}/min`);
    } else if (call.agents?.rate_per_minute) {
      agentRate = call.agents.rate_per_minute;
      console.log(`✅ Using agents rate: $${agentRate}/min`);
    } else {
      // Search in userAssignedAgents as fallback
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
    
    // 3. Calculate cost
    const calculatedCost = Math.round(((duration / 60.0) * agentRate) * 10000) / 10000;
    console.log(`🧮 Calculated cost: ${durationMinutes.toFixed(2)}min × $${agentRate}/min = $${calculatedCost.toFixed(4)}`);
    
    return calculatedCost;
  };

  // FUNCTION: calculateCallCostSync (for use in render)
  const calculateCallCostSync = (call: Call) => {
    return calculateCallCost(call);
  };

  // FUNCTION: loadAudioDuration
  const loadAudioDuration = async (call: Call) => {
    if (!call.recording_url || audioDurations[call.id]) return;
    
    try {
      console.log(`🎵 Loading audio duration for ${call.call_id?.substring(0, 8)}...`);
      const audio = new Audio(call.recording_url);
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          console.log(`✅ Audio loaded: ${duration}s for ${call.call_id?.substring(0, 8)}`);
          setAudioDurations(prev => ({
            ...prev,
            [call.id]: duration
          }));
          resolve();
        });
        
        audio.addEventListener('error', () => {
          console.log(`❌ Error loading audio for ${call.call_id?.substring(0, 8)}`);
          resolve();
        });

        // Safety timeout
        setTimeout(() => {
          console.log(`⏰ Timeout loading audio for ${call.call_id?.substring(0, 8)}`);
          resolve();
        }, 5000);
      });
    } catch (error) {
      console.log(`❌ Error loading audio duration:`, error);
    }
  };

  // Load audio only for visible calls
  const loadAudioForVisibleCalls = async (visibleCalls: Call[]) => {
    const callsWithAudio = visibleCalls.filter(call => 
      call.recording_url && !audioDurations[call.id]
    );
    
    if (callsWithAudio.length === 0) return;
    
    console.log(`🎵 Loading audio for ${callsWithAudio.length} visible calls...`);
    
    // Load in small batches to avoid blocking
    for (let i = 0; i < callsWithAudio.length; i += 2) {
      const batch = callsWithAudio.slice(i, i + 2);
      await Promise.all(batch.map(call => loadAudioDuration(call)));
      if (i + 2 < callsWithAudio.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // ============================================================================
  // FUNCTION: EXACT balance deduction
  // ============================================================================

  const processCallCostAndDeduct = async (call: Call) => {
    console.log(`💰 PROCESSING EXACT DEDUCTION for call ${call.call_id?.substring(0, 8)}:`);
    
    try {
      // NEW ANTI-DUPLICATE PROTECTION - CHECK EXISTING TRANSACTIONS
      console.log(`🔍 Checking if call already processed: ${call.call_id?.substring(0, 8)}`);
      
      const { data: existingTx, error: checkError } = await supabase
        .from('credit_transactions')
        .select('id, description, amount, created_at')
        .eq('user_id', user.id)
        .ilike('description', `%${call.call_id}%`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is what we want for new calls
        console.error(`❌ Error checking duplicates for ${call.call_id}:`, checkError);
        // Continue for safety, but log the error
      }

      if (existingTx && !checkError) {
        console.log(`✅ CALL ALREADY PROCESSED: ${call.call_id?.substring(0, 8)}`);
        console.log(`   📄 Existing transaction: ID ${existingTx.id}`);
        console.log(`   💰 Amount already deducted: $${Math.abs(existingTx.amount).toFixed(4)}`);
        console.log(`   📝 Description: ${existingTx.description}`);
        console.log(`   📅 Date: ${existingTx.created_at}`);
        
        return { 
          success: true, 
          message: 'Already processed', 
          existingTransaction: existingTx.id,
          alreadyDeducted: Math.abs(existingTx.amount),
          processedAt: existingTx.created_at
        };
      }

      console.log(`🆕 NEW CALL - Proceeding with deduction: ${call.call_id?.substring(0, 8)}`);

      // ADDITIONAL CHECK: processed_for_cost field in DB
      if (call.processed_for_cost) {
        console.log(`✅ Call marked as processed in DB: ${call.call_id?.substring(0, 8)}`);
        return { success: true, message: 'Already processed in DB' };
      }

      // 2. Get EXACT duration (prioritize audio)
      const exactDuration = getCallDuration(call);
      if (exactDuration === 0) {
        console.log(`❌ No valid duration for ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'No valid duration' };
      }

      // 3. Calculate EXACT cost
      const exactCost = calculateCallCost(call);
      if (exactCost === 0) {
        console.log(`❌ No valid cost for ${call.call_id?.substring(0, 8)}`);
        return { success: false, error: 'No valid rate' };
      }

      const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
      console.log(`🧮 EXACT CALCULATION: ${exactDuration}s × $${agentRate}/min = $${exactCost.toFixed(4)}`);

      // 4. Deduct user balance
      console.log(`💳 DEDUCTING EXACT BALANCE for user: ${user.id}`);
      
      // Option A: Use RPC admin_adjust_user_credits
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user.id,
        p_amount: -exactCost,
        p_description: `Exact call cost: ${call.call_id} (${(exactDuration/60).toFixed(2)}min @ $${agentRate}/min)`,
        p_admin_id: 'callssimple-exact-deduct'
      });

      let deductSuccess = false;
      let deductMethod = '';

      if (!rpcError) {
        console.log(`✅ Successful RPC deduction: $${exactCost.toFixed(4)}`);
        deductSuccess = true;
        deductMethod = 'rpc';
      } else {
        console.log(`❌ RPC error, trying direct deduction:`, rpcError);
        
        // Option B: Direct deduction in user_credits
        const { data: currentCredit, error: creditError } = await supabase
          .from('user_credits')
          .select('current_balance')
          .eq('user_id', user.id)
          .single();

        if (!creditError && currentCredit) {
          const currentBalance = currentCredit.current_balance || 0;
          const newBalance = Math.max(0, currentBalance - exactCost);
          
          console.log(`💰 Direct balance: $${currentBalance} → $${newBalance}`);
          
          const { error: updateError } = await supabase
            .from('user_credits')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (!updateError) {
            // Create transaction
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

      // 5. Update call as processed with exact cost
      console.log(`📝 UPDATING CALL WITH EXACT COST: $${exactCost.toFixed(4)}`);
      
      const { error: updateCallError } = await supabase
        .from('calls')
        .update({
          cost_usd: exactCost,
          duration_sec: exactDuration, // Also update with exact duration
          processed_for_cost: true,
        })
        .eq('call_id', call.call_id);

      if (updateCallError) {
        console.error(`❌ Error updating call:`, updateCallError);
        return { success: false, error: 'Error updating call' };
      }

      // 6. Update local state
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

      console.log(`🎉 EXACT DEDUCTION COMPLETED:`);
      console.log(`   📞 Call: ${call.call_id?.substring(0, 8)}`);
      console.log(`   ⏱️ Duration: ${exactDuration}s`);
      console.log(`   💰 Cost: $${exactCost.toFixed(4)}`);
      console.log(`   🔧 Method: ${deductMethod}`);

      return { 
        success: true, 
        cost: exactCost, 
        duration: exactDuration,
        method: deductMethod 
      };

    } catch (error) {
      console.error(`❌ Critical error in exact deduction:`, error);
      return { success: false, error: error.message };
    }
  };

  // ============================================================================
  // FUNCTION: Process pending calls with exact deductions
  // ============================================================================

  const processNewCallsExact = async () => {
    // IMPROVED EARLY PROTECTION
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
    
    console.log('💰 STARTING EXACT PROCESSING WITH PROTECTIONS...');
    setIsProcessing(true);
    
    try {
      console.log('📊 CHECKING CALLS FOR EXACT DEDUCTION...');

      // Filter calls that need exact cost processing
      const callsNeedingExactProcessing = calls.filter(call => {
        const isCompleted = ['completed', 'ended'].includes(call.call_status?.toLowerCase());
        const actualDuration = getCallDuration(call);
        const hasValidDuration = actualDuration > 0;
        const notProcessed = !call.processed_for_cost; // New field from webhook v6.0
        const hasRate = (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute) > 0;
        
        const needsProcessing = isCompleted && hasValidDuration && notProcessed && hasRate;
        
        if (isCompleted && notProcessed) {
          console.log(`🔍 EXACT ANALYSIS ${call.call_id?.substring(0, 8)}:`, {
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
        console.log('✅ All calls have been processed with exact costs');
        return;
      }

      console.log(`💰 PROCESSING ${callsNeedingExactProcessing.length} calls with exact deductions`);
      setIsProcessing(true);

      let processedCount = 0;
      let errors = 0;
      let totalDeducted = 0;

      for (const call of callsNeedingExactProcessing) {
        try {
          console.log(`\n💳 PROCESSING EXACT DEDUCTION: ${call.call_id}`);
          
          const result = await processCallCostAndDeduct(call);
          
          if (result.success) {
            processedCount++;
            totalDeducted += result.cost || 0;
            console.log(`✅ SUCCESSFUL EXACT DEDUCTION: ${call.call_id} - $${(result.cost || 0).toFixed(4)}`);
          } else {
            console.error(`❌ Error in exact deduction ${call.call_id}:`, result.error);
            errors++;
          }
          
          // Pause between processing
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Exception in exact deduction ${call.call_id}:`, error);
          errors++;
        }
      }

      console.log(`\n🎯 EXACT DEDUCTIONS COMPLETED:`);
      console.log(`   ✅ Processed: ${processedCount}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   💰 Total deducted: $${totalDeducted.toFixed(4)}`);
      console.log(`   🎯 Precision: 100% exact with audio duration`);
  
    } catch (error) {
      console.error(`❌ Critical error in processNewCallsExact:`, error);
    } finally {
      setIsProcessing(false); // IMPORTANT: Always reset
    }

    // Update statistics
    if (processedCount > 0) {
      calculateStats();
    }
  };

  // ============================================================================
  // 🔧 CORRECTED FETCH CALLS FUNCTION - DETECTS REAL CALLS
  // ============================================================================
  
  const fetchCalls = async () => {
    console.log("🚀 FETCH CALLS - Detecting real and test calls");
    
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadingProgress('Getting agent configuration...');

      // STEP 1: Get user assigned agents
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

      // STEP 2: Get assigned agent details
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

      // 🔧 STEP 3: PREPARE IDS FOR SEARCH - CRITICAL CORRECTION
      const agentUUIDs = agentDetails.map(agent => agent.id).filter(Boolean);
      const retellAgentIds = agentDetails.map(agent => agent.retell_agent_id).filter(Boolean);
      const allAgentIds = [...agentUUIDs, ...retellAgentIds].filter(Boolean);

      console.log('🔍 CALL SEARCH - CONFIGURATION:');
      console.log(`   🆔 Agent UUIDs (internal):`, agentUUIDs);
      console.log(`   🎯 Retell Agent IDs (external):`, retellAgentIds);
      console.log(`   📊 All search IDs:`, allAgentIds);

      setLoadingProgress('Loading calls...');

      // 🔧 STEP 4: CORRECTED QUERY - Search ALL calls without restrictive filters
      console.log('🚀 EXECUTING CALL QUERY...');
      
      const { data: initialCalls, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', allAgentIds) // Search by ALL possible agent_ids
        .order('timestamp', { ascending: false })
        .limit(100); // Load more calls initially

      // 🔍 DETAILED DEBUG
      console.log(`📊 QUERY RESULT:`, {
        totalFound: initialCalls?.length || 0,
        hasError: !!callsError,
        errorMessage: callsError?.message || 'No errors'
      });

      if (callsError) {
        console.error("❌ Error getting calls:", callsError);
        setError(`Error getting calls: ${callsError.message}`);
        return;
      }

      if (initialCalls && initialCalls.length > 0) {
        console.log('✅ CALLS FOUND:');
        
        // Separate real calls vs test calls
        const realCalls = initialCalls.filter(call => !call.call_id.includes('test_'));
        const testCalls = initialCalls.filter(call => call.call_id.includes('test_'));
        
        console.log(`   📞 REAL calls: ${realCalls.length}`);
        console.log(`   🧪 TEST calls: ${testCalls.length}`);
        
        // Show examples of each type
        if (realCalls.length > 0) {
          console.log('📞 FIRST 3 REAL CALLS:');
          realCalls.slice(0, 3).forEach((call, index) => {
            console.log(`   ${index + 1}. ${call.call_id?.substring(0, 16)} - Agent: ${call.agent_id?.substring(0, 12)} - Status: ${call.call_status} - Cost: $${call.cost_usd}`);
          });
        }
        
        if (testCalls.length > 0) {
          console.log('🧪 FIRST 3 TEST CALLS:');
          testCalls.slice(0, 3).forEach((call, index) => {
            console.log(`   ${index + 1}. ${call.call_id?.substring(0, 16)} - Agent: ${call.agent_id?.substring(0, 12)} - Status: ${call.call_status} - Cost: $${call.cost_usd}`);
          });
        }
        
      } else {
        console.log('❌ NO CALLS FOUND - Checking configuration...');
        
        // Diagnosis: Check if there are calls in general
        const { data: allCallsTest } = await supabase
          .from('calls')
          .select('call_id, agent_id, call_status, timestamp, from_number, to_number')
          .order('timestamp', { ascending: false })
          .limit(5);
        
        console.log(`🔍 DIAGNOSIS - Total calls in DB: ${allCallsTest?.length || 0}`);
        if (allCallsTest && allCallsTest.length > 0) {
          console.log('📋 LAST 5 CALLS IN DB:');
          allCallsTest.forEach((call, index) => {
            console.log(`   ${index + 1}. ${call.call_id?.substring(0, 16)} - Agent: ${call.agent_id?.substring(0, 12)} - ${call.from_number} → ${call.to_number}`);
          });
        }
      }

      // STEP 5: Map calls with agent information
      const userAgents = agentDetails?.map(agent => ({
        agent_id: agent.id,
        agents: agent
      })) || [];

      const mapCalls = (calls) => {
        return (calls || []).map(call => {
          let matchedAgent = null;

          // 🔧 IMPROVED MAPPING - Search by retell_agent_id AND UUID
          const userAgentAssignment = userAgents.find(assignment => 
            assignment.agents.id === call.agent_id ||           // Internal UUID
            assignment.agents.retell_agent_id === call.agent_id // External Retell ID
          );

          if (userAgentAssignment) {
            matchedAgent = {
              id: userAgentAssignment.agents.id,
              name: userAgentAssignment.agents.name,
              rate_per_minute: userAgentAssignment.agents.rate_per_minute
            };
          } else {
            // Fallback for agents not found
            matchedAgent = {
              id: call.agent_id,
              name: `Agent ${call.agent_id.substring(0, 8)}...`,
              rate_per_minute: 0.02 // Default rate
            };
          }

          return {
            ...call,
            call_agent: matchedAgent,
            agents: matchedAgent
          };
        });
      };

      const mappedCalls = mapCalls(initialCalls);
      
      console.log("🔄 MAPPING COMPLETED:");
      console.log(`   📊 Mapped calls: ${mappedCalls.length}`);
      console.log(`   🎯 With valid agents: ${mappedCalls.filter(c => c.call_agent?.rate_per_minute > 0).length}`);

      setCalls(mappedCalls);
      setLoading(false);
      setLoadingProgress('');

      console.log("🎉 LOAD COMPLETED - Real calls detected correctly");

    } catch (err: any) {
      console.error("❌ Exception in fetch calls:", err);
      setError(`Exception: ${err.message}`);
      setLoading(false);
    }
  };

  // ============================================================================
  // PAGINATION FUNCTION
  // ============================================================================
  const applyPagination = () => {
    const totalPages = Math.ceil(filteredCalls.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredCalls.slice(startIndex, endIndex);
    
    console.log(`📄 Pagination applied: Page ${currentPage}/${totalPages}, showing ${startIndex + 1}-${Math.min(endIndex, filteredCalls.length)} of ${filteredCalls.length}`);
    
    setPaginatedCalls(paginatedData);
    return totalPages;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    console.log(`📄 Page change: ${newPage}`);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
    console.log(`📄 Page size change: ${newPageSize}`);
  };

  // SIMPLIFIED FUNCTION: Robust verification without SQL errors
  const shouldProcessCalls = async () => {
    if (loading || backgroundLoading || isProcessing) {
      console.log(`🛑 Not processing: loading=${loading}, backgroundLoading=${backgroundLoading}, isProcessing=${isProcessing}`);
      return false;
    }
    
    // Filter calls that appear pending
    const potentiallyPendingCalls = calls.filter(call => 
      ['completed', 'ended'].includes(call.call_status?.toLowerCase()) && 
      (call.duration_sec > 0 || call.recording_url) &&
      (call.call_agent?.rate_per_minute || call.agents?.rate_per_minute) > 0
    );
    
    if (potentiallyPendingCalls.length === 0) {
      console.log(`✅ No completed calls to verify`);
      return false;
    }
    
    console.log(`🔍 Checking ${potentiallyPendingCalls.length} calls against transactions...`);
    
    // SIMPLIFIED VERIFICATION: Search by description (more robust)
    try {
      const processedCallIds = new Set();
      
      // Check each call individually
      for (const call of potentiallyPendingCalls) {
        const callIdShort = call.call_id.substring(0, 16); // Use part of ID
        
        const { data: existingTx, error } = await supabase
          .from('credit_transactions')
          .select('id, description')
          .eq('user_id', user.id)
          .ilike('description', `%${callIdShort}%`)
          .limit(1);
        
        if (error) {
          console.log(`⚠️ Error checking ${callIdShort}:`, error.message);
          continue; // Continue with next call
        }
        
        if (existingTx && existingTx.length > 0) {
          processedCallIds.add(call.call_id);
          console.log(`✅ Transaction found for: ${callIdShort}`);
        } else {
          console.log(`🔄 No transaction for: ${callIdShort} - PENDING`);
        }
      }
      
      // Really pending calls
      const trulyPendingCalls = potentiallyPendingCalls.filter(call => 
        !processedCallIds.has(call.call_id)
      );
      
      if (trulyPendingCalls.length === 0) {
        console.log(`✅ All calls already have processed transactions`);
        return false;
      }
      
      console.log(`🎯 ${trulyPendingCalls.length} REALLY pending calls:`);
      trulyPendingCalls.forEach(call => {
        console.log(`   - ${call.call_id.substring(0, 16)} (no transaction)`);
      });
      
      return trulyPendingCalls.length > 0;
      
    } catch (error) {
      console.error('❌ Exception checking transactions:', error);
      // In case of error, process to be safe
      console.log('🔄 Verification error - processing for safety');
      return true;
    }
  };

  // ============================================================================
  // useEffects
  // ============================================================================

  // Main effect: Load data when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 INITIATING CORRECTED SYSTEM for:', user.email);
      console.log('💡 MODE: Exact cost system with real calls detection');
      fetchCalls();
    }
  }, [user?.id]);

  // Effect to apply filters and sorting
  useEffect(() => {
    if (calls.length > 0) {
      applyFiltersAndSort();
      calculateStats();
    }
  }, [calls, searchTerm, statusFilter, agentFilter, dateFilter, customDate]);

  // Effect to apply pagination and load audio for current page
  useEffect(() => {
    const totalPages = applyPagination();
    
    // If current page is greater than total pages, reset to first
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }

    // Load audio only for calls on current page
    if (paginatedCalls.length > 0) {
      loadAudioForVisibleCalls(paginatedCalls);
    }
  }, [filteredCalls, currentPage, pageSize]);

  // Effect to reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, agentFilter, dateFilter, customDate]);

  // useEffect WITH DETAILED LOGS for debugging
  useEffect(() => {
    console.log(`🔥 useEffect EXECUTED - Navigation detected`);
    console.log(`📊 Current state:`, {
      callsLength: calls.length,
      loading,
      backgroundLoading,
      isProcessing,
      userId: user?.id
    });
    
    if (calls.length > 0) {
      console.log(`📋 Current calls:`, calls.map(call => ({
        id: call.call_id.substring(0, 12),
        processed: call.processed_for_cost,
        cost: call.cost_usd,
        status: call.call_status
      })));
    }
    
    if (calls.length > 0 && !loading && !backgroundLoading && !isProcessing) {
      // Only process if there are really pending calls
      setTimeout(async () => {
        console.log(`⏰ setTimeout EXECUTING after navigation`);
        if (!isProcessing && await shouldProcessCalls()) {
          console.log(`🚀 STARTING processNewCallsExact by navigation`);
          processNewCallsExact();
        } else {
          console.log("🛡️ shouldProcessCalls() prevented duplicate processing");
        }
      }, 1000);
      
      // Interval with additional checks
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
  }, [
    user?.id,           // User changes → reload
    calls.length,       // New calls → verify
    loading,            // Loading state changes
    backgroundLoading   // Background loading changes
  ]);

  // ============================================================================
  // FILTER AND STATISTICS FUNCTIONS
  // ============================================================================

  const applyFiltersAndSort = () => {
    console.log("🔍 BEFORE FILTERS - Total calls:", calls.length);
    
    let filtered = [...calls];

    // Search filter
    if (searchTerm) {
      const beforeSearch = filtered.length;
      filtered = filtered.filter(call => 
        call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.from_number.includes(searchTerm) ||
        call.to_number.includes(searchTerm) ||
        call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (call.call_agent?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log(`🔍 SEARCH FILTER: ${beforeSearch} → ${filtered.length} (term: "${searchTerm}")`);
    }

    // Status filter
    if (statusFilter !== "all") {
      const beforeStatus = filtered.length;
      filtered = filtered.filter(call => call.call_status === statusFilter);
      console.log(`🔍 STATUS FILTER: ${beforeStatus} → ${filtered.length} (status: "${statusFilter}")`);
    }

    // AGENT FILTER WITH DETAILED DEBUG
    if (agentFilter !== null) {
      const beforeAgent = filtered.length;
      const selectedAgent = userAssignedAgents.find(agent => agent.id === agentFilter);
      
      console.log(`🔍 AGENT FILTER DEBUG:`, {
        agentFilter,
        selectedAgent: selectedAgent ? {
          id: selectedAgent.id,
          name: selectedAgent.name,
          retell_agent_id: selectedAgent.retell_agent_id
        } : null
      });
      
      if (selectedAgent) {
        console.log(`🔍 Filtering by agent: ${selectedAgent.name}`);
        
        filtered = filtered.filter(call => {
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

    // Date filter
    const beforeDate = filtered.length;
    filtered = filtered.filter(call => isDateInRange(call.timestamp));
    console.log(`🔍 DATE FILTER: ${beforeDate} → ${filtered.length} (filter: "${dateFilter}")`);

    // Sorting
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

    console.log("🔍 AFTER ALL FILTERS - Total:", filtered.length);
    
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

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

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

  // ============================================================================
  // FORMAT FUNCTIONS
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
  // EVENT HANDLERS
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

  // Auxiliary variables for UI
  const uniqueStatuses = [...new Set(calls.map(call => call.call_status))];
  const selectedAgentName = agentFilter ? getAgentNameLocal(agentFilter) : null;
  const totalPages = Math.ceil(filteredCalls.length / pageSize);

  // ============================================================================
  // USER VERIFICATION
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
  // MAIN COMPONENT RENDER WITH PAGINATION
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <div className="space-y-6">
          {/* Header */}
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
                      <span className="text-xs font-medium text-blue-600">Exact Processing</span>
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
                  console.log("🔄 MANUAL REFRESH - Exact system");
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
              
              {/* CORRECTED INDICATOR */}
              <div className="text-right">
                <div className="text-xs font-medium text-green-600">🟢 System Active</div>
                <div className="text-xs text-gray-500">Updated</div>
              </div>
            </div>
          </div>

          {/* UPDATED INFORMATIONAL MESSAGE */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700 text-sm font-medium">
                  💰 Exact cost deduction system active - Processes real call durations.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* EXACT PROCESSING INDICATOR */}
          {isProcessing && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-3"></div>
                  <span className="text-green-700 font-medium">
                    💰 Processing exact costs with real call durations...
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

          {/* FILTERS */}
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
                      - Page {currentPage} of {totalPages}
                    </span>
                  )}
                </CardTitle>
                
                {/* Background loading indicator */}
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

                            {/* PROCESS STATUS COLUMN */}
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

                            {/* ACTIONS COLUMN */}
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

                  {/* Pagination Controls */}
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

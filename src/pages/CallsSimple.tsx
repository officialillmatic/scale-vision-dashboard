import React, { useState, useEffect } from "react";
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
  CalendarDays
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

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
export default function CallsSimple() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // FUNCIÓN: Calcular costo usando tarifa del agente
  const calculateCallCost = (call: Call) => {
    const durationMinutes = getCallDuration(call) / 60;
    let agentRate = 0;
    
    // ORDEN DE PRIORIDAD para obtener la tarifa
    if (call.call_agent?.rate_per_minute) {
      agentRate = call.call_agent.rate_per_minute;
      console.log(`💰 Using call_agent rate: $${agentRate}/min`);
    } else if (call.agents?.rate_per_minute) {
      agentRate = call.agents.rate_per_minute;
      console.log(`💰 Using agents rate: $${agentRate}/min`);
    }
    
    // Si NO encontramos tarifa del agente, usar costo de la DB
    if (agentRate === 0) {
      console.log(`⚠️ No agent rate found, using DB cost: $${call.cost_usd || 0}`);
      return call.cost_usd || 0;
    }
    
    const calculatedCost = durationMinutes * agentRate;
    
    console.log(`🧮 COST CALCULATION:
      📏 Duration: ${getCallDuration(call)}s = ${durationMinutes.toFixed(2)} min
      💵 Rate: $${agentRate}/min
      🎯 Calculated: $${calculatedCost.toFixed(4)}
      🗄️ DB Cost: $${call.cost_usd || 0} (IGNORED)`);
    
    return calculatedCost;
  };

  // useEffect hooks
  useEffect(() => {
    if (user?.id) {
      fetchCalls();
    }
  }, [user?.id]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [calls, searchTerm, statusFilter, sortField, sortOrder, dateFilter, customDate]);
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

  const getCallDuration = (call: any) => {
    if (audioDurations[call.id]) {
      return audioDurations[call.id];
    }
    
    const possibleFields = ['duration_sec', 'duration', 'call_duration', 'length', 'time_duration', 'total_duration'];
    
    for (const field of possibleFields) {
      if (call[field] && call[field] > 0) {
        return call[field];
      }
    }
    
    return 0;
  };
  const fetchCalls = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching calls for user:", user.id);

      // PASO 1: Obtener llamadas básicas
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (callsError) {
        console.error("❌ Error fetching calls:", callsError);
        setError(`Error: ${callsError.message}`);
        return;
      }

      console.log("✅ Calls fetched successfully:", callsData?.length || 0);
      
      // DIAGNÓSTICO SIMPLE: Si no hay llamadas, verificar con user_id fijo
      if (!callsData || callsData.length === 0) {
        console.log("⚠️ No calls found, trying with fixed user_id for debugging...");
        const { data: debugCalls } = await supabase
          .from('calls')
          .select('id, call_id, user_id, timestamp')
          .eq('user_id', 'efe4f9c1-8322-4ce7-8193-69b0dc982d03')
          .order('timestamp', { ascending: false });
        
        console.log("🔍 Debug calls with fixed ID:", debugCalls?.length || 0);
        if (debugCalls && debugCalls.length > 0) {
          console.log("🚨 FOUND CALLS WITH FIXED ID - USER ID MISMATCH!");
          console.log("   Frontend user.id:", user.id);
          console.log("   Fixed user_id:   ", 'efe4f9c1-8322-4ce7-8193-69b0dc982d03');
          console.log("   Are they equal?  ", user.id === 'efe4f9c1-8322-4ce7-8193-69b0dc982d03');
          
          
        }
      }

      // PASO 2: Obtener agentes para el cálculo de costos
      const { data: allAgents, error: allAgentsError } = await supabase
        .from('agents')
        .select('*');

      if (allAgentsError) {
        console.error("⚠️ Error fetching agents:", allAgentsError);
      }

      // PASO 3: Conectar agentes con llamadas
      const agentIds = [...new Set(callsData?.map(call => call.agent_id).filter(Boolean))];
      let agentsData = [];

      if (agentIds.length > 0 && allAgents) {
        agentsData = allAgents.filter(agent => 
          agentIds.includes(agent.id) || agentIds.includes(agent.retell_agent_id)
        );
      }

      // PASO 4: Mapear agentes a llamadas
      const data = callsData?.map(call => {
        let matchedAgent = null;

        if (agentsData && agentsData.length > 0) {
          matchedAgent = agentsData.find(agent => 
            agent.id === call.agent_id ||
            agent.retell_agent_id === call.agent_id
          );

          if (!matchedAgent && agentsData.length === 1) {
            matchedAgent = agentsData[0];
          }
        }

        return {
          ...call,
          call_agent: matchedAgent ? {
            id: matchedAgent.id,
            name: matchedAgent.name,
            rate_per_minute: matchedAgent.rate_per_minute
          } : null
        };
      });
      
      setCalls(data || []);
      // DIAGNÓSTICO DE AGENTES
console.log("🔍 DIAGNÓSTICO DE AGENTES:");
if (data && data.length > 0) {
  data.slice(0, 3).forEach((call, index) => {
    console.log(`📞 Call ${index + 1}:`);
    console.log(`   Call ID: ${call.call_id}`);
    console.log(`   Agent ID: ${call.agent_id}`);
    console.log(`   call_agent:`, call.call_agent);
    console.log(`   agents:`, call.agents);
    console.log(`   DB cost: $${call.cost_usd}`);
    console.log(`   ---`);
  });

  console.log("📊 AGENTES ÚNICOS:");
  const uniqueAgentIds = [...new Set(data.map(call => call.agent_id))];
  console.log("Agent IDs encontrados:", uniqueAgentIds);

  console.log("🎯 AGENTES CON TARIFAS:");
  const agentsWithRates = data.filter(call => 
    call.call_agent?.rate_per_minute || call.agents?.rate_per_minute
  );
  console.log(`Llamadas con tarifas: ${agentsWithRates.length}/${data.length}`);
}

      // Calcular estadísticas
      if (data && data.length > 0) {
        const totalCost = data.reduce((sum, call) => sum + calculateCallCost(call), 0);
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

  const applyFiltersAndSort = () => {
    let filtered = [...calls];

    if (searchTerm) {
      filtered = filtered.filter(call => 
        call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.from_number.includes(searchTerm) ||
        call.to_number.includes(searchTerm) ||
        call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(call => call.call_status === statusFilter);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const uniqueStatuses = [...new Set(calls.map(call => call.call_status))];
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
              <p className="text-gray-600">Comprehensive call data for your account</p>
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
</div>
          </div>

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
          {/* Filtros */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search calls by ID, phone, or summary..."
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
                              {formatCurrency(calculateCallCost(call))}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                const agentRate = call.call_agent?.rate_per_minute || call.agents?.rate_per_minute;
                                return agentRate ? 
                                  `${(getCallDuration(call)/60).toFixed(1)}min × $${agentRate}/min` :
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

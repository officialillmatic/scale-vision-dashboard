import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
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
  Download,
  Eye,
  ArrowUpDown
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

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
}

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status';
type SortOrder = 'asc' | 'desc';

export default function CallsSimple() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [stats, setStats] = useState({
    total: 0,
    totalCost: 0,
    totalDuration: 0,
    avgDuration: 0,
    completedCalls: 0
  });

  // User ID for alexbuenhombre2012@gmail.com
  const USER_ID = "efe4f9c1-8322-4ce7-8193-69bd8c982d03";

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [calls, searchTerm, statusFilter, sortField, sortOrder]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching calls for user:", USER_ID);

      const { data, error: fetchError } = await supabase
        .from('calls')
        .select(`
          id,
          call_id,
          user_id,
          agent_id,
          company_id,
          timestamp,
          duration_sec,
          cost_usd,
          call_status,
          from_number,
          to_number,
          transcript,
          call_summary,
          sentiment
        `)
        .eq('user_id', USER_ID)
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error("❌ Error fetching calls:", fetchError);
        setError(`Error: ${fetchError.message}`);
        return;
      }

      console.log("✅ Calls fetched successfully:", data?.length || 0);
      setCalls(data || []);

      // Calculate statistics
      if (data && data.length > 0) {
        const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const totalDuration = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
        const avgDuration = totalDuration / data.length;
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

  const applyFiltersAndSort = () => {
    let filtered = [...calls];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(call => 
        call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.from_number.includes(searchTerm) ||
        call.to_number.includes(searchTerm) ||
        call.call_summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(call => call.call_status === statusFilter);
    }

    // Apply sorting
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  const maskPhoneNumber = (phone: string) => {
    if (!phone || phone === 'unknown') return 'Unknown';
    if (phone.length >= 10) {
      return `${phone.substring(0, 4)}****${phone.substring(phone.length - 3)}`;
    }
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

  return (
    <ProductionDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📞 Call Management</h1>
            <p className="text-gray-600">Comprehensive call data for alexbuenhombre2012@gmail.com</p>
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

        {/* Filters and Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
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
              <div className="text-sm text-gray-500">
                Showing {filteredCalls.length} of {calls.length} calls
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Calls Table */}
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
                <p className="text-sm">No calls match your current filters</p>
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
                      <tr key={call.id} className="hover:bg-gray-50 transition-colors">
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
                            {maskPhoneNumber(call.from_number)} → {maskPhoneNumber(call.to_number)}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            ID: {call.call_id.substring(0, 16)}...
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDuration(call.duration_sec)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {call.duration_sec}s
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(call.cost_usd)}
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
                          </div>
                          {call.call_summary && (
                            <div className="text-xs text-gray-600 mt-1 max-w-xs truncate">
                              {call.call_summary}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Download className="h-3 w-3" />
                            </Button>
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
      </div>
    </ProductionDashboardLayout>
  );
}
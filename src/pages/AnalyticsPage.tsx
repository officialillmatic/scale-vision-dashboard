import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  RefreshCw,
  Zap,
  Target,
  Activity,
  Phone,
  Smile,
  Frown,
  Meh,
  TrendingDown
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

interface Call {
  id: string;
  call_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  sentiment?: string;
  recording_url?: string;
  from_number: string;
  to_number: string;
}

interface AnalyticsData {
  hourlyData: Array<{hour: string, calls: number, avgDuration: number, cost: number}>;
  dailyData: Array<{date: string, calls: number, cost: number, success: number}>;
  sentimentTrend: Array<{date: string, positive: number, negative: number, neutral: number}>;
  costEfficiency: Array<{duration: number, cost: number, status: string}>;
}
export default function AnalyticsPage() {
  const { user } = useAuth(); // 🔒 CAMBIO DE SEGURIDAD: Usar usuario autenticado
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    hourlyData: [],
    dailyData: [],
    sentimentTrend: [],
    costEfficiency: []
  });
  const [audioDurations, setAudioDurations] = useState<{[key: string]: number}>({});
  const [dateRange, setDateRange] = useState<string>("7"); // days

  // 🔒 CAMBIO DE SEGURIDAD: Solo cargar datos si hay usuario autenticado
  useEffect(() => {
    if (user?.id) {
      fetchAnalyticsData();
    }
  }, [dateRange, user?.id]);
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
        audio.addEventListener('error', () => resolve());
      });
    } catch (error) {
      console.log('Error loading audio duration:', error);
    }
  };

  const getCallDuration = (call: Call) => {
    if (audioDurations[call.id]) {
      return audioDurations[call.id];
    }
    return call.duration_sec || 0;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  const fetchAnalyticsData = async () => {
    // 🔒 CAMBIO DE SEGURIDAD: Verificar que el usuario esté autenticado
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // 🔒 CAMBIO DE SEGURIDAD: Usar user.id en lugar del ID hardcodeado
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id) // ⬅️ CAMBIO AQUÍ
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (fetchError) {
        setError(`Error: ${fetchError.message}`);
        return;
      }

      setCalls(data || []);

      // Load audio durations for analysis
      if (data && data.length > 0) {
        const callsWithAudio = data.filter(call => call.recording_url);
        await Promise.all(callsWithAudio.map(call => loadAudioDuration(call)));
      }

      // Generate analytics data
      if (data && data.length > 0) {
        setAnalyticsData({
          hourlyData: generateHourlyData(data),
          dailyData: generateDailyData(data),
          sentimentTrend: generateSentimentTrend(data),
          costEfficiency: generateCostEfficiency(data)
        });
      }

    } catch (err: any) {
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const generateHourlyData = (callsData: Call[]) => {
    const hourlyStats: {[key: string]: {calls: number, totalDuration: number, totalCost: number}} = {};
    
    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      hourlyStats[hour] = { calls: 0, totalDuration: 0, totalCost: 0 };
    }

    callsData.forEach(call => {
      const hour = new Date(call.timestamp).getHours().toString().padStart(2, '0') + ':00';
      if (hourlyStats[hour]) {
        hourlyStats[hour].calls += 1;
        hourlyStats[hour].totalDuration += getCallDuration(call);
        hourlyStats[hour].totalCost += call.cost_usd || 0;
      }
    });

    return Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour,
      calls: stats.calls,
      avgDuration: stats.calls > 0 ? stats.totalDuration / stats.calls : 0,
      cost: stats.totalCost
    }));
  };

  const generateDailyData = (callsData: Call[]) => {
    const dailyStats: {[key: string]: {calls: number, cost: number, success: number}} = {};
    
    callsData.forEach(call => {
      const date = call.timestamp.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { calls: 0, cost: 0, success: 0 };
      }
      
      dailyStats[date].calls += 1;
      dailyStats[date].cost += call.cost_usd || 0;
      if (call.call_status === 'completed' || call.call_status === 'ended') {
        dailyStats[date].success += 1;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls: stats.calls,
        cost: stats.cost,
        success: (stats.success / stats.calls) * 100
      }))
      .slice(-14); // Last 14 days
  };

  const generateSentimentTrend = (callsData: Call[]) => {
    const sentimentStats: {[key: string]: {positive: number, negative: number, neutral: number}} = {};
    
    callsData.forEach(call => {
      const date = call.timestamp.split('T')[0];
      if (!sentimentStats[date]) {
        sentimentStats[date] = { positive: 0, negative: 0, neutral: 0 };
      }
      
      if (call.sentiment === 'positive') sentimentStats[date].positive += 1;
      else if (call.sentiment === 'negative') sentimentStats[date].negative += 1;
      else sentimentStats[date].neutral += 1;
    });

    return Object.entries(sentimentStats)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive: stats.positive,
        negative: stats.negative,
        neutral: stats.neutral
      }))
      .slice(-7); // Last 7 days
  };

  const generateCostEfficiency = (callsData: Call[]) => {
    return callsData.map(call => ({
      duration: getCallDuration(call),
      cost: call.cost_usd || 0,
      status: call.call_status
    })).filter(item => item.duration > 0);
  };
  // Calculate key metrics
  const totalCalls = calls.length;
  const avgCallDuration = calls.length > 0 ? calls.reduce((sum, call) => sum + getCallDuration(call), 0) / calls.length : 0;
  const totalCost = calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const successRate = calls.length > 0 ? (calls.filter(call => call.call_status === 'completed' || call.call_status === 'ended').length / calls.length) * 100 : 0;
  const sentimentDistribution = {
    positive: calls.filter(call => call.sentiment === 'positive').length,
    negative: calls.filter(call => call.sentiment === 'negative').length,
    neutral: calls.filter(call => call.sentiment === 'neutral').length,
  };

  // 🔒 CAMBIO DE SEGURIDAD: Verificar autenticación antes de mostrar contenido
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Please log in to view analytics</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📈 Analytics</h1>
              <p className="text-gray-600">Deep insights into your call performance and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Button
                onClick={fetchAnalyticsData}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />} Refresh
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

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Calls Analyzed</p>
                    <p className="text-3xl font-bold text-gray-900">{totalCalls}</p>
                    <p className="text-xs text-blue-600 mt-1">Last {dateRange} days</p>
                  </div>
                  <BarChart3 className="h-12 w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
                    <div className="flex items-center mt-1">
                      {successRate >= 80 ? (
                        <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
                      )}
                      <p className="text-xs text-gray-600">Completion rate</p>
                    </div>
                  </div>
                  <Target className="h-12 w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
                    <p className="text-3xl font-bold text-gray-900">{formatDuration(avgCallDuration)}</p>
                    <p className="text-xs text-purple-600 mt-1">Per conversation</p>
                  </div>
                  <Clock className="h-12 w-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                    <p className="text-xs text-orange-600 mt-1">Period total</p>
                  </div>
                  <DollarSign className="h-12 w-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Daily Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Daily Call Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="calls" 
                          stroke="#3b82f6" 
                          fill="#93c5fd"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Daily Cost Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                        />
                        <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Hourly Activity */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Hourly Activity Pattern
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={analyticsData.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar yAxisId="left" dataKey="calls" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgDuration" stroke="#f59e0b" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Success Rate Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Success Rate']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="success" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Completed Calls</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {calls.filter(call => call.call_status === 'completed').length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Ended Calls</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {calls.filter(call => call.call_status === 'ended').length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Error Calls</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {calls.filter(call => call.call_status === 'error').length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">With Recording</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {calls.filter(call => call.recording_url).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="sentiment" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      Sentiment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Positive', value: sentimentDistribution.positive, color: '#10B981' },
                            { name: 'Neutral', value: sentimentDistribution.neutral, color: '#6B7280' },
                            { name: 'Negative', value: sentimentDistribution.negative, color: '#EF4444' },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Positive', value: sentimentDistribution.positive, color: '#10B981' },
                            { name: 'Neutral', value: sentimentDistribution.neutral, color: '#6B7280' },
                            { name: 'Negative', value: sentimentDistribution.negative, color: '#EF4444' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Sentiment Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.sentimentTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Area type="monotone" dataKey="positive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="neutral" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Sentiment Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardContent className="p-6 text-center">
                    <Smile className="h-10 w-10 text-green-600 mx-auto mb-3" />
                    <p className="text-2xl font-bold text-gray-900">{sentimentDistribution.positive}</p>
                    <p className="text-sm text-gray-600">Positive Calls</p>
                    <p className="text-xs text-green-600 mt-1">
                      {totalCalls > 0 ? ((sentimentDistribution.positive / totalCalls) * 100).toFixed(1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100/50">
                  <CardContent className="p-6 text-center">
                    <Meh className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-2xl font-bold text-gray-900">{sentimentDistribution.neutral}</p>
                    <p className="text-sm text-gray-600">Neutral Calls</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {totalCalls > 0 ? ((sentimentDistribution.neutral / totalCalls) * 100).toFixed(1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
                  <CardContent className="p-6 text-center">
                    <Frown className="h-10 w-10 text-red-600 mx-auto mb-3" />
                    <p className="text-2xl font-bold text-gray-900">{sentimentDistribution.negative}</p>
                    <p className="text-sm text-gray-600">Negative Calls</p>
                    <p className="text-xs text-red-600 mt-1">
                      {totalCalls > 0 ? ((sentimentDistribution.negative / totalCalls) * 100).toFixed(1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="efficiency" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Cost vs Duration Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [formatCurrency(Number(value)), 'Daily Cost']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cost" 
                          stroke="#8b5cf6" 
                          fill="#c4b5fd"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      Call Efficiency Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Average Cost per Call</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {totalCalls > 0 ? formatCurrency(totalCost / totalCalls) : '$0.00'}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Cost per Minute</p>
                        <p className="text-2xl font-bold text-green-600">
                          {avgCallDuration > 0 ? formatCurrency((totalCost / totalCalls) / (avgCallDuration / 60)) : '$0.00'}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-green-600" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">ROI Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {successRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-purple-600">Based on success rate</p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Quality Score</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {totalCalls > 0 ? (
                            ((sentimentDistribution.positive * 1 + sentimentDistribution.neutral * 0.5) / totalCalls * 100).toFixed(0)
                          ) : 0}%
                        </p>
                        <p className="text-xs text-yellow-600">Based on sentiment</p>
                      </div>
                      <Zap className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Efficiency Summary */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                    Efficiency Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium">Total Conversations</p>
                      <p className="text-2xl font-bold text-indigo-600">{totalCalls}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium">Avg Talk Time</p>
                      <p className="text-2xl font-bold text-cyan-600">{formatDuration(avgCallDuration)}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                      <p className="text-2xl font-bold text-emerald-600">{successRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium">Total Investment</p>
                      <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalCost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Zap,
  Target,
  BarChart3
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CreditBalance } from "@/components/credits/CreditBalance";

interface Call {
  id: string;
  call_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  sentiment?: string;
  recording_url?: string;
}

interface DashboardStats {
  totalCalls: number;
  totalCost: number;
  totalDuration: number;
  avgDuration: number;
  successRate: number;
  positiveRatio: number;
  callsToday: number;
  costToday: number;
}

export default function DashboardPage() {
  const { user } = useAuth(); // 🔒 CAMBIO DE SEGURIDAD: Usar usuario autenticado
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalCost: 0,
    totalDuration: 0,
    avgDuration: 0,
    successRate: 0,
    positiveRatio: 0,
    callsToday: 0,
    costToday: 0
  });
  const [audioDurations, setAudioDurations] = useState<{[key: string]: number}>({});

  // 🔒 CAMBIO DE SEGURIDAD: Solo cargar datos si hay usuario autenticado
  useEffect(() => {
    if (user?.id) {
      fetchCallsData();
    }
  }, [user?.id]);
  // Load audio durations for better metrics
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
  const fetchCallsData = async () => {
    // 🔒 CAMBIO DE SEGURIDAD: Verificar que el usuario esté autenticado
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 🔒 CAMBIO DE SEGURIDAD: Usar user.id en lugar del ID hardcodeado
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id) // ⬅️ CAMBIO AQUÍ
        .order('timestamp', { ascending: false });

      if (fetchError) {
        setError(`Error: ${fetchError.message}`);
        return;
      }

      setCalls(data || []);

      // Load audio durations for recent calls
      if (data && data.length > 0) {
        const recentCalls = data.slice(0, 10).filter(call => call.recording_url);
        await Promise.all(recentCalls.map(call => loadAudioDuration(call)));
      }

      // Calculate comprehensive stats
      if (data && data.length > 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const totalCalls = data.length;
        const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const totalDuration = data.reduce((sum, call) => sum + getCallDuration(call), 0);
        const avgDuration = totalDuration / totalCalls;
        
        const completedCalls = data.filter(call => call.call_status === 'completed' || call.call_status === 'ended').length;
        const successRate = (completedCalls / totalCalls) * 100;
        
        const callsWithSentiment = data.filter(call => call.sentiment);
        const positiveCalls = data.filter(call => call.sentiment === 'positive').length;
        const positiveRatio = callsWithSentiment.length > 0 ? (positiveCalls / callsWithSentiment.length) * 100 : 0;
        
        const todayCalls = data.filter(call => new Date(call.timestamp) >= today);
        const callsToday = todayCalls.length;
        const costToday = todayCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);

        setStats({
          totalCalls,
          totalCost,
          totalDuration,
          avgDuration,
          successRate,
          positiveRatio,
          callsToday,
          costToday
        });
      }

    } catch (err: any) {
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // Prepare chart data
  const getChartData = () => {
    if (!calls.length) return [];
    
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daysCalls = calls.filter(call => 
        call.timestamp.split('T')[0] === date
      );
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        calls: daysCalls.length,
        cost: daysCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0),
        avgDuration: daysCalls.length > 0 
          ? daysCalls.reduce((sum, call) => sum + getCallDuration(call), 0) / daysCalls.length 
          : 0
      };
    });
  };

  const getSentimentData = () => {
    const sentimentCounts = {
      positive: calls.filter(call => call.sentiment === 'positive').length,
      negative: calls.filter(call => call.sentiment === 'negative').length,
      neutral: calls.filter(call => call.sentiment === 'neutral').length,
    };

    return [
      { name: 'Positive', value: sentimentCounts.positive, color: '#10B981' },
      { name: 'Neutral', value: sentimentCounts.neutral, color: '#6B7280' },
      { name: 'Negative', value: sentimentCounts.negative, color: '#EF4444' },
    ].filter(item => item.value > 0);
  };

  const chartData = getChartData();
  const sentimentData = getSentimentData();
  // 🔒 CAMBIO DE SEGURIDAD: Verificar autenticación antes de mostrar contenido
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Please log in to view dashboard</p>
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
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
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
              <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
              <p className="text-gray-600">Real-time analytics for your AI call system</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
              <Button
                onClick={fetchCallsData}
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
          {/* Key Metrics - Updated with CreditBalance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Credit Balance Widget */}
            <div className="lg:col-span-1">
              <CreditBalance 
                onRequestRecharge={() => {
                  alert('Please contact support to recharge your account: support@drscale.com');
                }}
                showActions={true}
              />
            </div>

            {/* Existing metrics cards */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Calls</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-green-600 font-medium">+{stats.callsToday} today</span>
                    </div>
                  </div>
                  <Phone className="h-12 w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
                    <div className="flex items-center mt-2">
                      {stats.successRate >= 80 ? (
                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                      )}
                      <span className="text-xs text-gray-600">Call completion</span>
                    </div>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-purple-600 font-medium">{formatCurrency(stats.costToday)} today</span>
                    </div>
                  </div>
                  <DollarSign className="h-12 w-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
                    <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
                    <div className="flex items-center mt-2">
                      <Clock className="w-4 h-4 text-orange-600 mr-1" />
                      <span className="text-xs text-gray-600">Per call</span>
                    </div>
                  </div>
                  <Clock className="h-12 w-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Call Trend Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Call Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
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
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sentiment Analysis */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-lg font-bold text-green-600">
                    {stats.positiveRatio.toFixed(1)}% Positive Sentiment
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Cost Analysis */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Cost Analysis (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
              <CardContent className="p-6 text-center">
                <Users className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
                <p className="text-sm text-gray-600">Total Conversations</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50">
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 text-pink-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
                <p className="text-sm text-gray-600">Total Talk Time</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-teal-100/50">
              <CardContent className="p-6 text-center">
                <Activity className="h-10 w-10 text-teal-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900">
                  {calls.filter(call => call.recording_url).length}
                </p>
                <p className="text-sm text-gray-600">Recorded Calls</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

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
  BarChart3,
  Bot,
  Building2,
  UserCheck,
  CreditCard,
  PieChart,
  Settings,
  ArrowRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
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
  agent_id?: string;
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

interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalCompanies: number;
  totalCredits: number;
  totalCalls: number;
  activeUsers: number;
  totalCreditTransactions: number;
  avgCreditsPerUser: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { user } = useAuth();
  
  // ✅ VERIFICAR SI ES SUPER ADMIN
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  
  console.log('=== DASHBOARD DEBUG ===');
  console.log('User:', user);
  console.log('User metadata role:', user?.user_metadata?.role);
  console.log('Is super admin:', isSuperAdmin);
  console.log('========================');
  
  // Estados para usuarios normales
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

  // Estados para super admin
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalCompanies: 0,
    totalCredits: 0,
    totalCalls: 0,
    activeUsers: 0,
    totalCreditTransactions: 0,
    avgCreditsPerUser: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [userDistribution, setUserDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      if (isSuperAdmin) {
        fetchAdminStats();
      } else {
        fetchCallsData();
      }
    }
  }, [user?.id, isSuperAdmin]);

  // 🤖 FUNCIONES DEL SUPER ADMIN
  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching admin statistics...');

      // Ejecutar todas las consultas en paralelo
      const [
        usersResult,
        agentsResult,
        companiesResult,
        creditsResult,
        callsResult,
        creditTransactionsResult
      ] = await Promise.all([
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        supabase.from('agents').select('id', { count: 'exact' }),
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('user_credits').select('current_balance'),
        supabase.from('calls').select('id', { count: 'exact' }),
        supabase.from('credit_transactions').select('id', { count: 'exact' })
      ]);

      console.log('📊 Admin raw results:', {
        users: usersResult,
        agents: agentsResult,
        companies: companiesResult,
        credits: creditsResult,
        calls: callsResult,
        transactions: creditTransactionsResult
      });

      // Calcular estadísticas administrativas
      const totalUsers = usersResult.count || 0;
      const totalAgents = agentsResult.count || 0;
      const totalCompanies = companiesResult.count || 0;
      const totalCalls = callsResult.count || 0;
      const totalCreditTransactions = creditTransactionsResult.count || 0;

      const totalCredits = creditsResult.data?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;
      const avgCreditsPerUser = totalUsers > 0 ? totalCredits / totalUsers : 0;
      const activeUsers = creditsResult.data?.filter(credit => (credit.current_balance || 0) > 0).length || 0;

      const calculatedAdminStats = {
        totalUsers,
        totalAgents,
        totalCompanies,
        totalCredits,
        totalCalls,
        activeUsers,
        totalCreditTransactions,
        avgCreditsPerUser
      };

      setAdminStats(calculatedAdminStats);
      prepareAdminChartData(usersResult.data || [], creditsResult.data || []);

      console.log('✅ Admin stats calculated:', calculatedAdminStats);

    } catch (err: any) {
      console.error('💥 Error fetching admin stats:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prepareAdminChartData = (users: any[], credits: any[]) => {
    // Datos para gráfico de líneas - usuarios registrados por mes
    const usersByMonth = users.reduce((acc, user) => {
      const month = new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(usersByMonth).map(([month, count]) => ({
      month,
      users: count
    }));

    setChartData(chartData);

    // Distribución de usuarios por estado de créditos
    const usersWithCredits = credits.filter(c => (c.current_balance || 0) > 0).length;
    const usersWithoutCredits = credits.length - usersWithCredits;
    
    setUserDistribution([
      { name: 'With Credits', value: usersWithCredits, color: COLORS[1] },
      { name: 'Without Credits', value: usersWithoutCredits, color: COLORS[3] }
    ]);
  };

  // 👤 FUNCIONES DE USUARIOS NORMALES (CÓDIGO ORIGINAL RESTAURADO)
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

  const fetchCallsData = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching calls data for regular user...');

      // 👤 USUARIO NORMAL: Ver solo llamadas de sus agentes asignados
      const { data: userAgents, error: agentsError } = await supabase
        .from('user_agent_assignments')
        .select(`
          agent_id,
          agents!inner (
            id,
            retell_agent_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_primary', true);

      if (agentsError) {
        console.error('❌ Error fetching user agents:', agentsError);
        setError(`Error fetching agents: ${agentsError.message}`);
        return;
      }

      if (!userAgents || userAgents.length === 0) {
        console.log('⚠️ No agents assigned to user');
        setCalls([]);
        setStats({
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          positiveRatio: 0,
          callsToday: 0,
          costToday: 0
        });
        setLoading(false);
        return;
      }

      const userAgentIds = userAgents.map(assignment => assignment.agents.id);
      console.log('👤 User agent IDs:', userAgentIds);

      // Obtener llamadas de esos agentes
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', userAgentIds)
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching calls for user:', fetchError);
        setError(`Error: ${fetchError.message}`);
        return;
      }

      const callsData = data || [];
      console.log('✅ User calls loaded:', callsData.length);

      setCalls(callsData);

      // Load audio durations for recent calls
      if (callsData && callsData.length > 0) {
        const recentCalls = callsData.slice(0, 10).filter(call => call.recording_url);
        await Promise.all(recentCalls.map(call => loadAudioDuration(call)));
      }

      // Calculate comprehensive stats
      if (callsData && callsData.length > 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const totalCalls = callsData.length;
        const totalCost = callsData.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const totalDuration = callsData.reduce((sum, call) => sum + getCallDuration(call), 0);
        const avgDuration = totalDuration / totalCalls;
        
        const completedCalls = callsData.filter(call => call.call_status === 'completed' || call.call_status === 'ended').length;
        const successRate = (completedCalls / totalCalls) * 100;
        
        const callsWithSentiment = callsData.filter(call => call.sentiment);
        const positiveCalls = callsData.filter(call => call.sentiment === 'positive').length;
        const positiveRatio = callsWithSentiment.length > 0 ? (positiveCalls / callsWithSentiment.length) * 100 : 0;
        
        const todayCalls = callsData.filter(call => new Date(call.timestamp) >= today);
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

        console.log('✅ User stats calculated:', {
          totalCalls,
          totalCost,
          completedCalls,
          successRate: successRate.toFixed(1) + '%'
        });
      } else {
        // No calls found
        setStats({
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          positiveRatio: 0,
          callsToday: 0,
          costToday: 0
        });
      }

    } catch (err: any) {
      console.error('💥 Exception fetching calls data:', err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for regular users
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

  // 🤖 RENDER SUPER ADMIN DASHBOARD
  if (isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="w-full space-y-4 sm:space-y-6">
          {/* Super Admin Account Balance */}
          <div className="w-full">
            <CreditBalance 
              onRequestRecharge={() => {
                alert('Super admins can manage all user credits in the Admin Credits section');
              }}
              showActions={true}
            />
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                🛡️ Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                System-wide analytics and management overview
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                <Activity className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <Button
                onClick={fetchAdminStats}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50 w-full">
              <CardContent className="p-3 sm:p-4">
                <p className="text-red-800 font-medium text-sm sm:text-base">❌ {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Main Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Users */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Users</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalUsers}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                      <span className="text-xs text-green-600 font-medium">{adminStats.activeUsers} active</span>
                    </div>
                  </div>
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Agents */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Agents</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalAgents}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                      <span className="text-xs text-gray-600">AI Agents</span>
                    </div>
                  </div>
                  <Bot className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Credits */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Credits</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(adminStats.totalCredits)}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <span className="text-xs text-purple-600 font-medium">
                        {formatCurrency(adminStats.avgCreditsPerUser)} avg/user
                      </span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Companies */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Companies</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCompanies}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 mr-1" />
                      <span className="text-xs text-gray-600">Organizations</span>
                    </div>
                  </div>
                  <Building2 className="h-8 w-8 sm:h-12 sm:w-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total System Calls</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCalls}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 mr-1" />
                      <span className="text-xs text-gray-600">All users</span>
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Credit Transactions</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCreditTransactions}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600 mr-1" />
                      <span className="text-xs text-gray-600">Total transactions</span>
                    </div>
                  </div>
                  <CreditCard className="h-8 w-8 sm:h-12 sm:w-12 text-pink-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Registration Trend */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  User Registration Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/team'}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Users</div>
                      <div className="text-xs text-gray-500">User management</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/admin/credits'}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-green-600" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Credits</div>
                      <div className="text-xs text-gray-500">Credit administration</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/settings'}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-purple-600" />
                    <div className="text-left">
                      <div className="font-semibold">System Settings</div>
                      <div className="text-xs text-gray-500">Configuration</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // 👤 RENDER REGULAR USER DASHBOARD (CÓDIGO ORIGINAL RESTAURADO)
  const regularChartData = getChartData();
  const sentimentData = getSentimentData();

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Independent Account Balance Section - Full Width */}
        <div className="w-full">
          <CreditBalance 
            onRequestRecharge={() => {
              alert('Please contact support to recharge your account: support@drscaleai.com');
            }}
            showActions={true}
          />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Real-time analytics for your AI call system</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            <Button
              onClick={fetchCallsData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
            >
              {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50 w-full">
            <CardContent className="p-3 sm:p-4">
              <p className="text-red-800 font-medium text-sm sm:text-base">❌ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics - Full Width Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 w-full">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Calls</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <span className="text-xs text-green-600 font-medium">+{stats.callsToday} today</span>
                  </div>
                </div>
                <Phone className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Success Rate</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    {stats.successRate >= 80 ? (
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mr-1" />
                    )}
                    <span className="text-xs text-gray-600">Call completion</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Cost</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <span className="text-xs text-purple-600 font-medium">{formatCurrency(stats.costToday)} today</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Duration</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 mr-1" />
                    <span className="text-xs text-gray-600">Per call</span>
                  </div>
                </div>
                <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Full Width Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* Call Trend Chart */}
          <Card className="border-0 shadow-sm w-full">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Call Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={regularChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card className="border-0 shadow-sm w-full">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                Sentiment Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 sm:mt-4 text-center">
                <p className="text-base sm:text-lg font-bold text-green-600">
                  {stats.positiveRatio.toFixed(1)}% Positive Sentiment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Analysis - Full Width */}
        <Card className="border-0 shadow-sm w-full">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              Cost Analysis (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regularChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats - Full Width Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 w-full">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
              <p className="text-xs sm:text-sm text-gray-600">Total Conversations</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 text-pink-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
              <p className="text-xs sm:text-sm text-gray-600">Total Talk Time</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-teal-100/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-teal-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {calls.filter(call => call.recording_url).length}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">Recorded Calls</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
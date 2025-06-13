import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Bot,
  DollarSign,
  Building2,
  Activity,
  TrendingUp,
  CreditCard,
  UserCheck,
  BarChart3,
  PieChart,
  Settings,
  ArrowRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { CreditBalance } from "@/components/credits/CreditBalance";

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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  
  // Verificar si es super admin
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  
  console.log('=== ADMIN DASHBOARD DEBUG ===');
  console.log('User:', user);
  console.log('Is super admin:', isSuperAdmin);
  console.log('============================');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats>({
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
    if (user?.id && isSuperAdmin) {
      fetchAdminStats();
    }
  }, [user?.id, isSuperAdmin]);

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
        // Total usuarios
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        
        // Total agentes
        supabase.from('agents').select('id', { count: 'exact' }),
        
        // Total empresas
        supabase.from('companies').select('id', { count: 'exact' }),
        
        // Total créditos
        supabase.from('user_credits').select('current_balance'),
        
        // Total llamadas
        supabase.from('calls').select('id', { count: 'exact' }),
        
        // Transacciones de créditos
        supabase.from('credit_transactions').select('id', { count: 'exact' })
      ]);

      console.log('📊 Raw results:', {
        users: usersResult,
        agents: agentsResult,
        companies: companiesResult,
        credits: creditsResult,
        calls: callsResult,
        transactions: creditTransactionsResult
      });

      // Calcular estadísticas
      const totalUsers = usersResult.count || 0;
      const totalAgents = agentsResult.count || 0;
      const totalCompanies = companiesResult.count || 0;
      const totalCalls = callsResult.count || 0;
      const totalCreditTransactions = creditTransactionsResult.count || 0;

      // Calcular total de créditos
      const totalCredits = creditsResult.data?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;
      
      // Calcular promedio de créditos por usuario
      const avgCreditsPerUser = totalUsers > 0 ? totalCredits / totalUsers : 0;

      // Calcular usuarios activos (usuarios con créditos > 0)
      const activeUsers = creditsResult.data?.filter(credit => (credit.current_balance || 0) > 0).length || 0;

      const calculatedStats = {
        totalUsers,
        totalAgents,
        totalCompanies,
        totalCredits,
        totalCalls,
        activeUsers,
        totalCreditTransactions,
        avgCreditsPerUser
      };

      setStats(calculatedStats);

      // Preparar datos para gráficos
      prepareChartData(usersResult.data || [], creditsResult.data || []);

      console.log('✅ Admin stats calculated:', calculatedStats);

    } catch (err: any) {
      console.error('💥 Error fetching admin stats:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (users: any[], credits: any[]) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Si no es super admin, mostrar dashboard normal (lógica existente)
  if (!isSuperAdmin) {
    // Aquí iría la lógica del dashboard normal para usuarios regulares
    // (el código existente del DashboardPage)
    return (
      <DashboardLayout>
        <div className="w-full space-y-4 sm:space-y-6">
          <div className="w-full">
            <CreditBalance 
              onRequestRecharge={() => {
                alert('Please contact support to recharge your account: support@drscaleai.com');
              }}
              showActions={true}
            />
          </div>
          
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Regular User Dashboard</h2>
            <p className="text-gray-600">This would show the regular user dashboard with their calls data.</p>
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
          <span className="ml-3 text-gray-600">Loading admin dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                    <span className="text-xs text-green-600 font-medium">{stats.activeUsers} active</span>
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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalAgents}</p>
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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalCredits)}</p>
                  <div className="flex items-center mt-1 sm:mt-2">
                    <span className="text-xs text-purple-600 font-medium">
                      {formatCurrency(stats.avgCreditsPerUser)} avg/user
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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalCompanies}</p>
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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
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
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalCreditTransactions}</p>
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
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  History, 
  Filter,
  RefreshCw,
  Plus,
  Edit3,
  TrendingDown,
  TrendingUp,
  Phone,
  Shield,
  Eye,
  Download,
  Minus,
  User,
  Activity
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface UserCredit {
  user_id: string;
  email: string;
  name: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  balance_status: string;
  total_spent: number;
  total_calls: number;
  recent_calls: number;
  last_call_date: string | null;
  balance_updated_at: string;
  user_created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
  created_by: string;
}

export default function SuperAdminCreditPage() {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Modales
  const [adjustmentModal, setAdjustmentModal] = useState<{
    open: boolean;
    userId?: string;
    currentBalance?: number;
  }>({ open: false });
  const [bulkModal, setBulkModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState<{
    open: boolean;
    userId?: string;
  }>({ open: false });

  const { user } = useAuth();

  // Super admin emails
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching user credit data...');

      // Obtener usuarios con créditos
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*');

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        toast.error('Error al cargar créditos de usuarios');
        return;
      }

      // Obtener perfiles de usuarios
      const userIds = creditsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, email, name')
        .in('id', userIds);

      // Fallback a users si no hay user_profiles
      let userProfiles = profilesData || [];
      if (!profilesData || profilesData.length === 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, name, full_name')
          .in('id', userIds);
        
        userProfiles = usersData?.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name || u.full_name
        })) || [];
      }

      // Obtener estadísticas de llamadas
      const { data: callsData } = await supabase
        .from('calls')
        .select('user_id, cost_usd, timestamp')
        .in('user_id', userIds);

      // Combinar datos
      const combinedData: UserCredit[] = creditsData.map(credit => {
        const profile = userProfiles.find(p => p.id === credit.user_id);
        const userCalls = callsData?.filter(c => c.user_id === credit.user_id) || [];
        
        const totalSpent = userCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const recentCalls = userCalls.filter(call => {
          const callDate = new Date(call.timestamp);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return callDate >= weekAgo;
        }).length;

        const lastCall = userCalls.length > 0 
          ? userCalls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : null;

        const balance = credit.current_balance || 0;
        const criticalThreshold = credit.critical_threshold || 5;
        const warningThreshold = credit.warning_threshold || 10;
        
        let balanceStatus = 'normal';
        if (credit.is_blocked) balanceStatus = 'blocked';
        else if (balance <= criticalThreshold) balanceStatus = 'critical';
        else if (balance <= warningThreshold) balanceStatus = 'warning';

        return {
          user_id: credit.user_id,
          email: profile?.email || `user-${credit.user_id.slice(0, 8)}@unknown.com`,
          name: profile?.name || 'Usuario Desconocido',
          current_balance: balance,
          warning_threshold: warningThreshold,
          critical_threshold: criticalThreshold,
          is_blocked: credit.is_blocked || false,
          balance_status: balanceStatus,
          total_spent: totalSpent,
          total_calls: userCalls.length,
          recent_calls: recentCalls,
          last_call_date: lastCall?.timestamp || null,
          balance_updated_at: credit.updated_at || credit.created_at,
          user_created_at: credit.created_at
        };
      });

      console.log('✅ Loaded users with credits:', combinedData.length);
      setUsers(combinedData);

    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        user.user_id.includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.balance_status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleUserSelection = (userId: string, selected: boolean) => {
    setSelectedUsers(prev => 
      selected 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? filteredUsers.map(u => u.user_id) : []);
  };

  const handleAdjustCredit = async (userId: string, amount: number, description: string, type: 'add' | 'subtract') => {
    try {
      const adjustmentAmount = type === 'subtract' ? -Math.abs(amount) : Math.abs(amount);
      
      // Usar la función RPC de Supabase
      const { data, error } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: userId,
        p_amount: adjustmentAmount,
        p_description: description,
        p_admin_id: user?.id || 'system'
      });

      if (error) {
        throw error;
      }

      toast.success(`Créditos ${type === 'add' ? 'agregados' : 'descontados'} exitosamente`);
      fetchUsers(); // Recargar datos
      
    } catch (error: any) {
      console.error('Error adjusting credits:', error);
      toast.error(`Error al ajustar créditos: ${error.message}`);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'blocked': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'normal': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'blocked': return <AlertTriangle className="w-3 h-3" />;
      case 'critical': return <TrendingDown className="w-3 h-3" />;
      case 'warning': return <AlertTriangle className="w-3 h-3" />;
      case 'normal': return <TrendingUp className="w-3 h-3" />;
      default: return null;
    }
  };

  const exportData = () => {
    const csvContent = [
      'Email,Name,Current Balance,Status,Total Spent,Total Calls,Last Updated',
      ...users.map(user => 
        `"${user.email}","${user.name}","${user.current_balance}","${user.balance_status}","${user.total_spent}","${user.total_calls}","${formatDate(user.balance_updated_at)}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Datos exportados exitosamente');
  };

  const stats = {
    total: users.length,
    normal: users.filter(u => u.balance_status === 'normal').length,
    warning: users.filter(u => u.balance_status === 'warning').length,
    critical: users.filter(u => u.balance_status === 'critical').length,
    blocked: users.filter(u => u.is_blocked).length,
    totalBalance: users.reduce((sum, u) => sum + u.current_balance, 0),
    totalSpent: users.reduce((sum, u) => sum + u.total_spent, 0),
    totalCalls: users.reduce((sum, u) => sum + u.total_calls, 0)
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Por favor inicia sesión para ver el panel</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
              <p className="text-muted-foreground mb-4">
                Se requieren privilegios de super administrador para acceder a este panel.
              </p>
              <p className="text-xs text-gray-400">
                Usuario actual: {user?.email || 'No autenticado'}
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Cargando panel de gestión de créditos...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Banner identificador */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
              <span className="text-green-600 font-bold text-sm">✨</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Panel de Gestión de Créditos - Versión Funcional</h3>
              <p className="text-sm text-green-700">
                Sistema completo de gestión de créditos de usuarios con funcionalidad completa.
              </p>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              v3.0 - Completamente Funcional
            </Badge>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🚀 Gestión de Créditos</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Shield className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Eye className="w-3 h-3 mr-1" />
              Datos en Tiempo Real
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={fetchUsers} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Usuarios</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Normal</p>
                  <p className="text-xl font-bold text-green-600">{stats.normal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Advertencia</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.warning}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Crítico</p>
                  <p className="text-xl font-bold text-red-600">{stats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Bloqueados</p>
                  <p className="text-xl font-bold text-red-600">{stats.blocked}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Balance Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Gastado</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Llamadas</p>
                  <p className="text-xl font-bold text-purple-600">{stats.totalCalls}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Content */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email, nombre o ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-80"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="normal">Normal</option>
                    <option value="warning">Advertencia</option>
                    <option value="critical">Crítico</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setBulkModal(true)}
                  disabled={selectedUsers.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Acción Masiva ({selectedUsers.length})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios</h3>
                <p className="text-gray-600">Intenta ajustar los filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-medium">Seleccionar todos ({filteredUsers.length})</span>
                </div>

                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <Checkbox
                        checked={selectedUsers.includes(user.user_id)}
                        onCheckedChange={(checked) => handleUserSelection(user.user_id, checked as boolean)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-sm truncate">{user.email}</p>
                          <span className="text-xs text-gray-500">({user.name})</span>
                          
                          <Badge variant={getStatusBadgeVariant(user.balance_status)}>
                            {getStatusIcon(user.balance_status)}
                            <span className="ml-1 capitalize">{user.balance_status}</span>
                          </Badge>
                          
                          {user.is_blocked && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                          <span>Balance: <strong className="text-green-600">{formatCurrency(user.current_balance)}</strong></span>
                          <span>Gastado: <strong className="text-red-600">{formatCurrency(user.total_spent)}</strong></span>
                          <span>Llamadas: <strong>{user.total_calls}</strong> (recientes: {user.recent_calls})</span>
                          <span>Última llamada: <strong>{formatDate(user.last_call_date)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTransactionModal({
                          open: true,
                          userId: user.user_id
                        })}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Historial
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => setAdjustmentModal({
                          open: true,
                          userId: user.user_id,
                          currentBalance: user.current_balance
                        })}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Ajustar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modales */}
        {adjustmentModal.open && (
          <CreditAdjustmentModal
            userId={adjustmentModal.userId!}
            currentBalance={adjustmentModal.currentBalance!}
            onClose={() => setAdjustmentModal({ open: false })}
            onAdjust={handleAdjustCredit}
          />
        )}

        {bulkModal && (
          <BulkCreditModal
            selectedUserIds={selectedUsers}
            onClose={() => setBulkModal(false)}
            onAdjust={handleAdjustCredit}
            onSuccess={() => {
              fetchUsers();
              setSelectedUsers([]);
            }}
          />
        )}

        {transactionModal.open && (
          <TransactionHistoryModal
            userId={transactionModal.userId!}
            isOpen={transactionModal.open}
            onClose={() => setTransactionModal({ open: false })}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Modal de Ajuste Individual
function CreditAdjustmentModal({ 
  userId, 
  currentBalance, 
  onClose, 
  onAdjust 
}: {
  userId: string;
  currentBalance: number;
  onClose: () => void;
  onAdjust: (userId: string, amount: number, description: string, type: 'add' | 'subtract') => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setLoading(true);
    try {
      await onAdjust(userId, parseFloat(amount), description, type);
      onClose();
    } catch (error) {
      // Error ya manejado en onAdjust
    } finally {
      setLoading(false);
    }
  };

  const newBalance = type === 'add' 
    ? currentBalance + (parseFloat(amount) || 0)
    : currentBalance - (parseFloat(amount) || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Ajustar Créditos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Balance actual: <strong>{formatCurrency(currentBalance)}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Ajuste</label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={type === 'add' ? 'default' : 'outline'}
                  onClick={() => setType('add')}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
                <Button
                  type="button"
                  variant={type === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setType('subtract')}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Descontar
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cantidad (USD)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              {amount && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nuevo balance: <strong>{formatCurrency(newBalance)}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo del ajuste..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Procesando...' : 'Aplicar Ajuste'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Modal de Acción Masiva
function BulkCreditModal({ 
  selectedUserIds, 
  onClose, 
  onAdjust,
  onSuccess 
}: {
  selectedUserIds: string[];
  onClose: () => void;
  onAdjust: (userId: string, amount: number, description: string, type: 'add' | 'subtract') => Promise<void>;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUserIds) {
        try {
          await onAdjust(userId, parseFloat(amount), description, type);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Ajuste aplicado exitosamente a ${successCount} usuarios`);
      } else {
        toast.warning(`${successCount} exitosos, ${errorCount} fallidos`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error en ajuste masivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Ajuste Masivo de Créditos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aplicar a <strong>{selectedUserIds.length}</strong> usuarios seleccionados
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Ajuste</label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={type === 'add' ? 'default' : 'outline'}
                  onClick={() => setType('add')}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
                <Button
                  type="button"
                  variant={type === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setType('subtract')}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Descontar
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cantidad por Usuario (USD)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo del ajuste masivo..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Procesando...' : `Aplicar a ${selectedUserIds.length} usuarios`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Modal de Historial de Transacciones
function TransactionHistoryModal({ 
  userId, 
  isOpen, 
  onClose 
}: {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchTransactions();
      fetchUserInfo();
    }
  }, [isOpen, userId]);

  const fetchUserInfo = async () => {
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('id', userId)
        .single();

      const { data: creditData } = await supabase
        .from('user_credits')
        .select('current_balance')
        .eq('user_id', userId)
        .single();

      if (profileData && creditData) {
        setUserInfo({
          email: profileData.email,
          name: profileData.name,
          current_balance: creditData.current_balance
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error(`Error al cargar transacciones: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'admin_credit':
      case 'deposit':
      case 'credit':
        return 'default';
      case 'admin_debit':
      case 'call_charge':
      case 'debit':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'admin_credit': return 'Admin Credit';
      case 'admin_debit': return 'Admin Debit';
      case 'call_charge': return 'Call Charge';
      case 'deposit': return 'Deposit';
      case 'credit': return 'Credit';
      case 'debit': return 'Debit';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Transacciones
          </CardTitle>
          {userInfo && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{userInfo.email}</p>
                  {userInfo.name && <p className="text-sm text-gray-600">{userInfo.name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Balance Actual</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(userInfo.current_balance || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Cargando transacciones...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin transacciones</h3>
              <p className="text-gray-600">Este usuario no tiene historial de transacciones.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getTransactionTypeColor(transaction.transaction_type) as any}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                      <span className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{transaction.description || 'Sin descripción'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{formatDate(transaction.created_at)}</span>
                      <span>Balance después: {formatCurrency(transaction.balance_after)}</span>
                      <span>Por: {transaction.created_by || 'Sistema'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}

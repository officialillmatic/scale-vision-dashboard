import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Users, 
  AlertTriangle, 
  RefreshCw,
  Edit3,
  Trash2,
  DollarSign,
  Phone,
  Calendar,
  Filter,
  Shield,
  Crown,
  User,
  Eye,
  Zap
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  balance_status: string;
  total_spent: number;
  total_calls: number;
  recent_calls: number;
  last_call_date: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export function RegisteredMembers() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching all registered users...');

      // PASO 1: Obtener usuarios con créditos
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*');

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        toast.error('Error al cargar créditos de usuarios');
        return;
      }

      // PASO 2: Obtener perfiles de usuarios
      const userIds = creditsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, email, name, role, created_at')
        .in('id', userIds);

      // PASO 3: Fallback a users si no hay user_profiles
      let userProfiles = profilesData || [];
      if (!profilesData || profilesData.length < userIds.length) {
        console.log('🔄 Falling back to users table...');
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, name, created_at, last_sign_in_at')
          .in('id', userIds);
        
        const profileEmails = new Set(profilesData?.map(p => p.id) || []);
        const missingUsers = usersData?.filter(u => !profileEmails.has(u.id)) || [];
        
        const usersAsProfiles = missingUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: 'member',
          created_at: u.created_at
        }));

        userProfiles = [...(profilesData || []), ...usersAsProfiles];
      }

      // PASO 4: Obtener estadísticas de llamadas
      const { data: callsData } = await supabase
        .from('calls')
        .select('user_id, cost_usd, timestamp')
        .in('user_id', userIds);

      // PASO 5: Combinar todos los datos
      const combinedData: RegisteredUser[] = creditsData.map(credit => {
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
          id: credit.user_id,
          email: profile?.email || `user-${credit.user_id.slice(0, 8)}@unknown.com`,
          name: profile?.name || 'Usuario Desconocido',
          role: profile?.role || 'member',
          current_balance: balance,
          warning_threshold: warningThreshold,
          critical_threshold: criticalThreshold,
          is_blocked: credit.is_blocked || false,
          balance_status: balanceStatus,
          total_spent: totalSpent,
          total_calls: userCalls.length,
          recent_calls: recentCalls,
          last_call_date: lastCall?.timestamp || null,
          created_at: profile?.created_at || credit.created_at,
          last_sign_in_at: null
        };
      });

      console.log(`✅ Loaded ${combinedData.length} registered users`);
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
        user.id.includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'blocked') {
        filtered = filtered.filter(user => user.is_blocked);
      } else {
        filtered = filtered.filter(user => user.balance_status === statusFilter);
      }
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
    setSelectedUsers(selected ? filteredUsers.map(u => u.id) : []);
  };

  const handleDeleteUser = async (user: RegisteredUser) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar a ${user.email}?\n\nEsta acción:\n- Eliminará su perfil\n- Eliminará sus créditos\n- NO se puede deshacer`
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🗑️ Deleting user:', user.email);
      
      // Usar función RPC si existe, o eliminar manualmente
      const { error } = await supabase.rpc('cleanup_user_for_reinvite', {
        user_id_to_clean: user.id
      });
      
      if (error) {
        console.error('Error deleting user:', error);
        toast.error(`Error al eliminar usuario: ${error.message}`);
        return;
      }
      
      toast.success(`Usuario ${user.email} eliminado exitosamente`);
      fetchAllUsers(); // Recargar datos
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Error inesperado: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    const confirmed = window.confirm(
      `¿Eliminar ${selectedUsers.length} usuarios seleccionados?\n\nEsta acción NO se puede deshacer.`
    );
    
    if (!confirmed) return;
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const userId of selectedUsers) {
        try {
          await supabase.rpc('cleanup_user_for_reinvite', {
            user_id_to_clean: userId
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        toast.success(`${successCount} usuarios eliminados exitosamente`);
      } else {
        toast.warning(`${successCount} exitosos, ${errorCount} fallidos`);
      }
      
      setSelectedUsers([]);
      fetchAllUsers();
      
    } catch (error: any) {
      toast.error('Error en eliminación masiva');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return { variant: 'default' as const, icon: Crown, label: 'Super Admin', color: 'bg-purple-100 text-purple-800' };
      case 'admin':
        return { variant: 'secondary' as const, icon: Shield, label: 'Admin', color: 'bg-blue-100 text-blue-800' };
      case 'member':
        return { variant: 'outline' as const, icon: User, label: 'Member', color: 'bg-green-100 text-green-800' };
      case 'viewer':
        return { variant: 'outline' as const, icon: Eye, label: 'Viewer', color: 'bg-gray-100 text-gray-800' };
      default:
        return { variant: 'outline' as const, icon: User, label: role || 'Member', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getStatusBadge = (status: string, isBlocked: boolean) => {
    if (isBlocked) {
      return { variant: 'destructive' as const, label: 'Bloqueado', color: 'bg-red-100 text-red-800' };
    }
    
    switch (status) {
      case 'critical':
        return { variant: 'destructive' as const, label: 'Crítico', color: 'bg-red-100 text-red-800' };
      case 'warning':
        return { variant: 'secondary' as const, label: 'Advertencia', color: 'bg-yellow-100 text-yellow-800' };
      case 'normal':
        return { variant: 'default' as const, label: 'Normal', color: 'bg-green-100 text-green-800' };
      default:
        return { variant: 'outline' as const, label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const stats = {
    total: users.length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    members: users.filter(u => u.role === 'member').length,
    viewers: users.filter(u => u.role === 'viewer').length,
    blocked: users.filter(u => u.is_blocked).length,
    critical: users.filter(u => u.balance_status === 'critical').length,
    totalBalance: users.reduce((sum, u) => sum + u.current_balance, 0),
    totalSpent: users.reduce((sum, u) => sum + u.total_spent, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando usuarios registrados...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Miembros Registrados
          </h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {stats.total} usuarios
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && (
            <Button 
              onClick={handleBulkDelete}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar ({selectedUsers.length})
            </Button>
          )}
          <Button onClick={fetchAllUsers} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Super Admins</p>
                <p className="text-xl font-bold">{stats.superAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Admins</p>
                <p className="text-xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-xl font-bold">{stats.members}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-muted-foreground">Viewers</p>
                <p className="text-xl font-bold">{stats.viewers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
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

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Críticos</p>
                <p className="text-xl font-bold text-orange-600">{stats.critical}</p>
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
              <Phone className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Gastado</p>
                <p className="text-lg font-bold text-rose-600">{formatCurrency(stats.totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
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
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">Todos los Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                
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
          </div>
        </CardHeader>

        <CardContent>
          {filteredUsers.length === 0 ? (
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

              {filteredUsers.map((user) => {
                const roleBadge = getRoleBadge(user.role);
                const statusBadge = getStatusBadge(user.balance_status, user.is_blocked);
                const RoleIcon = roleBadge.icon;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-sm truncate">{user.email}</p>
                          <span className="text-xs text-gray-500">({user.name})</span>
                          
                          <Badge className={roleBadge.color}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleBadge.label}
                          </Badge>
                          
                          <Badge className={statusBadge.color}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-gray-600">
                          <span>Balance: <strong className="text-green-600">{formatCurrency(user.current_balance)}</strong></span>
                          <span>Gastado: <strong className="text-red-600">{formatCurrency(user.total_spent)}</strong></span>
                          <span>Llamadas: <strong>{user.total_calls}</strong></span>
                          <span>Última llamada: <strong>{formatDate(user.last_call_date)}</strong></span>
                          <span>Registro: <strong>{formatDate(user.created_at)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => console.log('Edit user:', user.email)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

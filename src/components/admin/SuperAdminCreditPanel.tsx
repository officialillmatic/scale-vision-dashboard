import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Minus,
  Download,
  Eye,
  Shield,
  Info
} from 'lucide-react';
import { UserCreditsList } from './UserCreditsList';
import { CreditAdjustmentModal } from './CreditAdjustmentModal';
import { BulkCreditModal } from './BulkCreditModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';

interface UserCredit {
  user_id: string;
  email: string;
  name: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  balance_status: string;
  recent_transactions_count: number;
  balance_updated_at: string;
  user_created_at: string;
}

export function SuperAdminCreditPanel() {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user } = useAuth();

  // Definir super admins
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  console.log("🔥 [SUPER_ADMIN_PANEL] User email:", user?.email);
  console.log("🔥 [SUPER_ADMIN_PANEL] isSuperAdmin:", isSuperAdmin);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 [SuperAdminCreditPanel] Fetching users...');
      console.log('🔍 [SuperAdminCreditPanel] Is super admin:', isSuperAdmin);
      
      // Primero intentar la vista admin si existe y tiene datos
      const { data: adminViewData, error: adminViewError } = await supabase
        .from('admin_user_credits_view')
        .select('*')
        .order('email');

      if (adminViewData && adminViewData.length > 0 && !adminViewError) {
        console.log('✅ [SuperAdminCreditPanel] Using admin view data:', adminViewData.length);
        setUsers(adminViewData);
        return;
      }

      console.log('⚠️ [SuperAdminCreditPanel] Admin view failed or empty, trying fallback:', adminViewError);
      
      // Fallback: Usar user_profiles en lugar de profiles
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('user_credits')
        .select(`
          user_id,
          current_balance,
          warning_threshold,
          critical_threshold,
          is_blocked,
          updated_at,
          created_at
        `);

      if (fallbackError) {
        console.error('❌ [SuperAdminCreditPanel] Fallback user_credits error:', fallbackError);
        throw fallbackError;
      }

      // Obtener los profiles por separado
      const userIds = fallbackData?.map(item => item.user_id) || [];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: userProfilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email, name')
          .in('id', userIds);

        if (profilesError) {
          console.warn('⚠️ [SuperAdminCreditPanel] user_profiles error, trying users table:', profilesError);
          
          // Intentar con la tabla users como segundo recurso
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, name, full_name')
            .in('id', userIds);

          if (usersError) {
            console.warn('⚠️ [SuperAdminCreditPanel] users table error, trying app_users:', usersError);
            
            // Intentar con app_users como tercer recurso
            const { data: appUsersData, error: appUsersError } = await supabase
              .from('app_users')
              .select('id, email, full_name')
              .in('id', userIds);

            if (!appUsersError && appUsersData) {
              profilesData = appUsersData.map(user => ({
                id: user.id,
                email: user.email,
                name: user.full_name
              }));
            }
          } else if (usersData) {
            profilesData = usersData.map(user => ({
              id: user.id,
              email: user.email,
              name: user.name || user.full_name
            }));
          }
        } else if (userProfilesData) {
          profilesData = userProfilesData;
        }
      }

      // Combinar datos de créditos con perfiles
      const transformedData = fallbackData?.map(item => {
        const profile = profilesData?.find(p => p.id === item.user_id);
        return {
          user_id: item.user_id,
          email: profile?.email || `user-${item.user_id.slice(0, 8)}@unknown.com`,
          name: profile?.name || 'Unknown User',
          current_balance: item.current_balance || 0,
          warning_threshold: item.warning_threshold || 10,
          critical_threshold: item.critical_threshold || 5,
          is_blocked: item.is_blocked || false,
          balance_status: item.current_balance <= (item.critical_threshold || 5) ? 'critical' : 
                         item.current_balance <= (item.warning_threshold || 10) ? 'warning' : 'normal',
          recent_transactions_count: 0,
          balance_updated_at: item.updated_at,
          user_created_at: item.created_at
        };
      }) || [];

      console.log('✅ [SuperAdminCreditPanel] Using combined data:', transformedData.length);
      setUsers(transformedData);

    } catch (error: any) {
      console.error('❌ [SuperAdminCreditPanel] Failed to fetch users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.balance_status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleUserSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(filteredUsers.map(user => user.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleAdjustCredit = (userId: string) => {
    if (!isSuperAdmin) {
      toast.error('Solo super administradores pueden ajustar créditos');
      return;
    }
    setSelectedUserId(userId);
    setShowAdjustmentModal(true);
  };

  const handleViewTransactions = (userId: string) => {
    setSelectedUserId(userId);
    setShowTransactionModal(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'blocked': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'normal': return 'default';
      default: return 'default';
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: users.length,
      normal: users.filter(u => u.balance_status === 'normal').length,
      warning: users.filter(u => u.balance_status === 'warning').length,
      critical: users.filter(u => u.balance_status === 'critical').length,
      blocked: users.filter(u => u.is_blocked).length,
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header con badges informativos */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold">Credit Management Panel</h2>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Eye className="w-3 h-3 mr-1" />
              Open Access
            </Badge>
            {isSuperAdmin && (
              <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>
          <Button onClick={fetchUsers} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Aviso informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Panel de Acceso Libre
              </p>
              <p className="text-sm text-blue-700">
                {isSuperAdmin 
                  ? "Tienes privilegios completos: puedes ver, editar y gestionar todos los créditos de usuarios."
                  : "Acceso de solo lectura: puedes ver información de créditos pero no realizar modificaciones."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Normal</p>
                <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="normal">Normal</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setShowBulkModal(true)}
                  disabled={selectedUsers.length === 0}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Bulk Actions ({selectedUsers.length})
                </Button>
                <Button onClick={fetchUsers} disabled={loading}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <UserCreditsList
            users={filteredUsers}
            loading={loading}
            selectedUsers={selectedUsers}
            onUserSelection={handleUserSelection}
            onSelectAll={handleSelectAll}
            onAdjustCredit={handleAdjustCredit}
            onViewTransactions={handleViewTransactions}
            isSuperAdmin={isSuperAdmin}
          />
        </CardContent>
      </Card>

      {/* Modales */}
      {showAdjustmentModal && selectedUserId && (
        <CreditAdjustmentModal
          userId={selectedUserId}
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedUserId(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setShowAdjustmentModal(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {showBulkModal && (
        <BulkCreditModal
          selectedUserIds={selectedUsers}
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            fetchUsers();
            setShowBulkModal(false);
            setSelectedUsers([]);
          }}
        />
      )}

      {showTransactionModal && selectedUserId && (
        <TransactionHistoryModal
          userId={selectedUserId}
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}

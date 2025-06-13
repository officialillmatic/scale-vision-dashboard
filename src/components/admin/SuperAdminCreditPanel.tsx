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
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
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
  Download
} from 'lucide-react';
import { RoleCheck } from '@/components/auth/RoleCheck';
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
  const { isSuperAdmin } = useSuperAdmin();

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
      
      // For super admins, try to fetch from the admin view first, fallback to direct query if needed
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('admin_user_credits_view')
          .select('*')
          .order('email');

        if (error) {
          console.error('❌ [SuperAdminCreditPanel] Error with admin view:', error);
          
          // Fallback: Query user_credits directly with profiles join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('user_credits')
            .select(`
              user_id,
              current_balance,
              warning_threshold,
              critical_threshold,
              is_blocked,
              updated_at,
              created_at,
              profiles!user_credits_user_id_fkey (
                email,
                name
              )
            `)
            .order('created_at');

          if (fallbackError) {
            console.error('❌ [SuperAdminCreditPanel] Fallback error:', fallbackError);
            throw fallbackError;
          }

          // Transform fallback data to match expected format
const transformedData = fallbackData?.map(item => ({
  user_id: item.user_id,
  email: item.profiles?.[0]?.email || 'No email',        // ⬅️ CAMBIO AQUÍ
  name: item.profiles?.[0]?.name || 'No name',           // ⬅️ CAMBIO AQUÍ
  current_balance: item.current_balance || 0,
  warning_threshold: item.warning_threshold || 10,
  critical_threshold: item.critical_threshold || 5,
  is_blocked: item.is_blocked || false,
  balance_status: item.current_balance <= (item.critical_threshold || 5) ? 'critical' : 
                 item.current_balance <= (item.warning_threshold || 10) ? 'warning' : 'normal',
  recent_transactions_count: 0,
  balance_updated_at: item.updated_at,
  user_created_at: item.created_at
})) || [];

          console.log('✅ [SuperAdminCreditPanel] Using fallback data:', transformedData.length);
          setUsers(transformedData);
        } else {
          console.log('✅ [SuperAdminCreditPanel] Using admin view data:', data?.length);
          setUsers(data || []);
        }
      } else {
        console.log('❌ [SuperAdminCreditPanel] Not a super admin, no access');
        setUsers([]);
      }
    } catch (error: any) {
      console.error('❌ [SuperAdminCreditPanel] Failed to fetch users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
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
    <RoleCheck superAdminOnly fallback={
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Only super administrators can access credit management.</p>
          </div>
        </CardContent>
      </Card>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Credit Management</h1>
            <p className="text-gray-600">Manage user credits and view transaction history</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Normal</p>
                  <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Warning</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Blocked</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.blocked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="normal">Normal</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBulkModal(true)}
                  disabled={selectedUsers.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Actions ({selectedUsers.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <UserCreditsList
          users={filteredUsers}
          loading={loading}
          selectedUsers={selectedUsers}
          onUserSelection={handleUserSelection}
          onSelectAll={handleSelectAll}
          onAdjustCredit={handleAdjustCredit}
          onViewTransactions={handleViewTransactions}
          getStatusBadgeColor={getStatusBadgeColor}
        />

        {/* Modals */}
        <CreditAdjustmentModal
          open={showAdjustmentModal}
          onOpenChange={setShowAdjustmentModal}
          userId={selectedUserId}
          onSuccess={fetchUsers}
        />

        <BulkCreditModal
          open={showBulkModal}
          onOpenChange={setShowBulkModal}
          selectedUserIds={selectedUsers}
          onSuccess={() => {
            fetchUsers();
            setSelectedUsers([]);
          }}
        />

        <TransactionHistoryModal
          open={showTransactionModal}
          onOpenChange={setShowTransactionModal}
          userId={selectedUserId}
        />
      </div>
    </RoleCheck>
  );
}

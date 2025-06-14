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
  Download,
} from 'lucide-react';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { UserCreditsList } from './UserCreditsList';
import { CreditAdjustmentModal } from './CreditAdjustmentModal';
import { BulkCreditModal } from './BulkCreditModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';

export interface UserCredit {
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
  const { user } = useAuth();
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isEmailSuperAdmin = Boolean(user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

  // Fetch & filter effects
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter]);

  // Fetch users (with fallback)
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 [SuperAdminCreditPanel] Fetching users...', isSuperAdmin);

      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('admin_user_credits_view')
          .select('*')
          .order('email');

        if (error) {
          console.error('❌ [SuperAdminCreditPanel] View error:', error);
          const { data: fallbackData, error: fbErr } = await supabase
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

          if (fbErr) throw fbErr;

          const transformedData = (fallbackData ?? []).map(item => ({
            user_id: item.user_id,
            email: item.profiles?.email ?? 'No email',
            name: item.profiles?.name ?? 'No name',
            current_balance: item.current_balance ?? 0,
            warning_threshold: item.warning_threshold ?? 10,
            critical_threshold: item.critical_threshold ?? 5,
            is_blocked: item.is_blocked ?? false,
            balance_status:
              (item.current_balance ?? 0) <= (item.critical_threshold ?? 5)
                ? 'critical'
                : (item.current_balance ?? 0) <= (item.warning_threshold ?? 10)
                ? 'warning'
                : 'normal',
            recent_transactions_count: 0,
            balance_updated_at: item.updated_at,
            user_created_at: item.created_at,
          }));

          console.log('✅ [SuperAdminCreditPanel] Fallback data count:', transformedData.length);
          setUsers(transformedData);
        } else {
          console.log('✅ [SuperAdminCreditPanel] View data count:', data?.length);
          setUsers(data ?? []);
        }
      } else {
        console.warn('❌ [SuperAdminCreditPanel] Not a super admin, clearing list');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('❌ [SuperAdminCreditPanel] Fetch failed:', err);
      toast.error(Failed to fetch users: ${err.message});
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filterUsers = () => {
    let result = users;
    if (searchQuery) {
      result = result.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result =
        statusFilter === 'blocked'
          ? result.filter(u => u.is_blocked)
          : result.filter(u => u.balance_status === statusFilter);
    }
    setFilteredUsers(result);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'blocked':
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const stats = {
    total: users.length,
    normal: users.filter(u => u.balance_status === 'normal').length,
    warning: users.filter(u => u.balance_status === 'warning').length,
    critical: users.filter(u => u.balance_status === 'critical').length,
    blocked: users.filter(u => u.is_blocked).length,
  };

  // Selection & modal handlers (fill in your own implementations)
  const handleUserSelection = (id: string) =>
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  const handleSelectAll = () =>
    setSelectedUsers(prev =>
      prev.length === filteredUsers.length
        ? []
        : filteredUsers.map(u => u.user_id)
    );
  const handleAdjustCredit = (id: string) => {
    setSelectedUserId(id);
    setShowAdjustmentModal(true);
  };
  const handleViewTransactions = (id: string) => {
    setSelectedUserId(id);
    setShowTransactionModal(true);
  };

  return (
    <RoleCheck
      superAdminOnly
      fallback={
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only super administrators can access credit management.
              </p>
            </div>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Credit Management</h1>
            <p className="text-gray-600">Manage user credits and view history</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Normal</p>
                <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Warning</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-gray-600">{stats.blocked}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Bulk */}
        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded bg-white"
              >
                <option value="all">All</option>
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <Button
              onClick={() => setShowBulkModal(true)}
              disabled={selectedUsers.length === 0}
              variant="outline"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk ({selectedUsers.length})
            </Button>
          </CardContent>
        </Card>

        {/* Users Table */}
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

import { debugLog } from "@/lib/debug";
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { 
  Search, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  RefreshCw,
  Crown,
  Plus,
  Minus,
  History
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

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

const SuperAdminCreditsNew = () => {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();

  // Super admin access verification
  useEffect(() => {
    if (isSuperAdminLoading) return;
    
    if (!isSuperAdmin) {
      debugLog('❌ [SuperAdminCreditsNew] Access denied - not super admin');
      toast.error("Access denied - Super admin required");
      navigate('/dashboard');
      return;
    } else {
      debugLog('✅ [SuperAdminCreditsNew] Super admin access granted');
    }
  }, [isSuperAdmin, isSuperAdminLoading, navigate]);

  // Fetch users with credits
  const fetchUsers = async () => {
    try {
      setLoading(true);
      debugLog('🔍 [SuperAdminCreditsNew] Fetching user credits...');
      
      // Direct query to user_credits with profiles join
      const { data: creditsData, error: creditsError } = await supabase
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
        .order('created_at', { ascending: false });

      if (creditsError) {
        console.error('❌ [SuperAdminCreditsNew] Credits error:', creditsError);
        throw creditsError;
      }

      // Transform data to match interface
      const transformedData: UserCredit[] = creditsData?.map(item => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        
        return {
          user_id: item.user_id,
          email: profile?.email || 'No email',
          name: profile?.name || profile?.email?.split('@')[0] || 'User',
          current_balance: item.current_balance || 0,
          warning_threshold: item.warning_threshold || 10,
          critical_threshold: item.critical_threshold || 5,
          is_blocked: item.is_blocked || false,
          balance_status: item.is_blocked ? 'blocked' : 
                         item.current_balance <= (item.critical_threshold || 5) ? 'critical' : 
                         item.current_balance <= (item.warning_threshold || 10) ? 'warning' : 'normal',
          recent_transactions_count: 0,
          balance_updated_at: item.updated_at,
          user_created_at: item.created_at
        };
      }) || [];

      debugLog('✅ [SuperAdminCreditsNew] Found user credits:', transformedData.length);
      setUsers(transformedData);
    } catch (error: any) {
      console.error('❌ [SuperAdminCreditsNew] Failed to fetch users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and status
  useEffect(() => {
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
  }, [users, searchQuery, statusFilter]);

  // Initial load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  // Loading state
  if (isSuperAdminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading permissions...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Access denied state
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied - Super administrator privileges required.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

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

  const handleAdjustCredit = (userId: string) => {
    toast.info('Credit adjustment functionality - Coming soon!');
  };

  const handleViewTransactions = (userId: string) => {
    toast.info('Transaction history functionality - Coming soon!');
  };

  const handleBulkActions = () => {
    toast.info('Bulk actions functionality - Coming soon!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Admin Credits 2 (Super Admin) 💳
            </h1>
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
              <Crown className="h-3 w-3" />
              SUPER ADMIN
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Enhanced Access
            </Badge>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Complete credit management with super administrator privileges
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={fetchUsers} variant="outline">
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
                  onClick={handleBulkActions}
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
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-muted-foreground">Loading user credits...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No user credits found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'No credit data available'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.name?.[0] || user.email[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{user.current_balance.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(user.balance_status)} className="capitalize">
                          {user.balance_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Warning: ${user.warning_threshold}</div>
                          <div>Critical: ${user.critical_threshold}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.balance_updated_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAdjustCredit(user.user_id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adjust
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewTransactions(user.user_id)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            History
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminCreditsNew;
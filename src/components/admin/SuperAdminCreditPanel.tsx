
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
  const { user } = useAuth();
const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
const isEmailSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

console.log("🔥 [SUPER_ADMIN_PANEL] User email:", user?.email);
console.log("🔥 [SUPER_ADMIN_PANEL] isSuperAdmin:", isSuperAdmin);
console.log("🔥 [SUPER_ADMIN_PANEL] isEmailSuperAdmin:", isEmailSuperAdmin);

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
      / Permitir acceso de solo lectura a todos los usuarios autenticados
if (true) {
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
          const transformedData = fallbackData?.map(item => {
            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return {
              user_id: item.user_id,
              email: profile?.email || 'No email',
              name: profile?.name || 'No name',
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
    if (!isSuperAdmin && !isEmailSuperAdmin) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You need super administrator privileges to access this panel.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Debug: Email={user?.email}, isSuperAdmin={isSuperAdmin}, isEmailSuperAdmin={isEmailSuperAdmin}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
  );
}

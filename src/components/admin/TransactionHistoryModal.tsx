import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { History, Download, RefreshCw, User } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
  created_by_email: string;
}

interface TransactionHistoryModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Props compatibles con el modal anterior
interface TransactionHistoryModalLegacyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export function TransactionHistoryModal({ 
  userId,
  isOpen,
  onClose
}: TransactionHistoryModalProps) {
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
    if (!userId) return;
    
    try {
      // Intentar desde la vista admin primero
      const { data: adminData, error: adminError } = await supabase
        .from('admin_user_credits_view')
        .select('email, name, current_balance')
        .eq('user_id', userId)
        .single();

      if (!adminError && adminData) {
        setUserInfo(adminData);
        return;
      }

      // Fallback: consultar user_credits + user_profiles
      const { data: creditData, error: creditError } = await supabase
        .from('user_credits')
        .select('current_balance')
        .eq('user_id', userId)
        .single();

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (creditData && profileData) {
        setUserInfo({
          email: profileData.email,
          name: profileData.name,
          current_balance: creditData.current_balance
        });
      } else {
        // Último fallback: solo mostrar ID
        setUserInfo({
          email: `User ID: ${userId}`,
          name: null,
          current_balance: 0
        });
      }
    } catch (error: any) {
      console.warn('Could not fetch user info:', error);
      setUserInfo({
        email: `User ID: ${userId}`,
        name: null,
        current_balance: 0
      });
    }
  };

  const fetchTransactions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Intentar usar la función RPC primero
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_credit_transactions', {
        p_user_id: userId,
        p_limit: 100
      });

      if (!rpcError && rpcData) {
        setTransactions(rpcData);
        return;
      }

      console.warn('RPC function failed, trying direct query:', rpcError);

      // Fallback: consulta directa a credit_transactions
      const { data: directData, error: directError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          amount,
          transaction_type,
          description,
          balance_after,
          created_at,
          created_by
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (directError) throw directError;

      // Transformar datos para que coincidan con la interfaz esperada
      const transformedData = directData?.map(tx => ({
        ...tx,
        created_by_email: tx.created_by || 'System'
      })) || [];

      setTransactions(transformedData);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      toast.error(`Failed to fetch transactions: ${error.message}`);
      setTransactions([]);
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
      case 'adjustment':
        return 'secondary';
      default:
        return 'outline';
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
      case 'adjustment': return 'Adjustment';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const exportTransactions = () => {
    if (transactions.length === 0) {
      toast.warning('No transactions to export');
      return;
    }

    const csvContent = [
      'Date,Type,Amount,Description,Balance After,Created By',
      ...transactions.map(tx => 
        `"${formatDate(tx.created_at)}","${getTransactionTypeLabel(tx.transaction_type)}","${tx.amount}","${tx.description}","${tx.balance_after}","${tx.created_by_email}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </DialogTitle>
        </DialogHeader>

        {userInfo && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{userInfo.email}</p>
                  {userInfo.name && <p className="text-sm text-gray-600">{userInfo.name}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(userInfo.current_balance || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${transactions.length} transactions found`}
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={exportTransactions} 
              variant="outline" 
              size="sm"
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchTransactions} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-gray-600">This user has no transaction history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getTransactionTypeColor(transaction.transaction_type) as any}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                      <span className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate" title={transaction.description}>
                      {transaction.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{formatDate(transaction.created_at)}</span>
                      <span>By: {transaction.created_by_email}</span>
                      <span>Balance after: {formatCurrency(transaction.balance_after)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Versión legacy para compatibilidad
export function TransactionHistoryModalLegacy({ 
  open, 
  onOpenChange, 
  userId 
}: TransactionHistoryModalLegacyProps) {
  if (!userId) return null;
  
  return (
    <TransactionHistoryModal
      userId={userId}
      isOpen={open}
      onClose={() => onOpenChange(false)}
    />
  );
}

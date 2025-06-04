
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { History, Download, RefreshCw } from 'lucide-react';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export function TransactionHistoryModal({ 
  open, 
  onOpenChange, 
  userId 
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (open && userId) {
      fetchTransactions();
      fetchUserInfo();
    }
  }, [open, userId]);

  const fetchUserInfo = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('admin_user_credits_view')
        .select('email, name, current_balance')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserInfo(data);
    } catch (error: any) {
      toast.error(`Failed to fetch user info: ${error.message}`);
    }
  };

  const fetchTransactions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_credit_transactions', {
        p_user_id: userId,
        p_limit: 100
      });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'admin_credit':
      case 'deposit':
        return 'default';
      case 'admin_debit':
      case 'call_charge':
        return 'destructive';
      case 'adjustment':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'admin_credit': return 'Admin Credit';
      case 'admin_debit': return 'Admin Debit';
      case 'call_charge': return 'Call Charge';
      case 'deposit': return 'Deposit';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <div>
                <p className="font-medium">{userInfo.email}</p>
                {userInfo.name && <p className="text-sm text-gray-600">{userInfo.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-bold">${userInfo.current_balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {transactions.length} transactions found
          </p>
          <Button onClick={fetchTransactions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
              <p className="text-gray-600">This user has no transaction history.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
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
                      {transaction.description}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

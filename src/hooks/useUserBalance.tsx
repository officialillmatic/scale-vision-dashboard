
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getUserBalance, 
  getTransactionHistory, 
  updateUserBalance, 
  calculateRemainingMinutes,
  UserBalance,
  Transaction
} from "@/services/balanceService";
import { toast } from "sonner";

export function useUserBalance() {
  const { user, company } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const userId = user?.id;
  const companyId = company?.id;

  const { 
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['user-balance', userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return null;
      return getUserBalance(userId, companyId);
    },
    enabled: !!userId && !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['user-transactions', userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return [];
      return getTransactionHistory(userId, companyId);
    },
    enabled: !!userId && !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // This mutation is for admin use only - users cannot modify their own balance
  const updateBalanceMutation = useMutation({
    mutationFn: async ({
      amount,
      type,
      description,
      callId
    }: {
      amount: number;
      type: 'deposit' | 'deduction' | 'adjustment';
      description?: string;
      callId?: string;
    }) => {
      if (!userId || !companyId) throw new Error("User or company not found");
      setIsUpdating(true);
      try {
        return await updateUserBalance(
          userId,
          companyId,
          amount,
          type,
          description,
          callId
        );
      } finally {
        setIsUpdating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
    }
  });

  const refreshBalanceData = () => {
    refetchBalance();
    refetchTransactions();
  };

  // Calculate remaining minutes based on current balance and average rate
  const remainingMinutes = balance ? calculateRemainingMinutes(balance.balance) : 0;

  // Check if balance is below warning threshold
  const isLowBalance = balance ? 
    (balance.warning_threshold !== null && balance.balance < balance.warning_threshold) : 
    false;
    
  // Function to get total call usage for a given period (default: current month)
  const getCallUsage = (startDate?: Date, endDate?: Date) => {
    if (!transactions) return 0;
    
    const start = startDate || new Date(new Date().setDate(1)); // First day of current month
    const end = endDate || new Date(); // Today
    
    return transactions
      .filter(tx => 
        tx.transaction_type === 'deduction' &&
        new Date(tx.created_at) >= start &&
        new Date(tx.created_at) <= end
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  // Effect to show warning toast when balance becomes low
  useEffect(() => {
    if (balance && balance.warning_threshold && balance.balance < balance.warning_threshold) {
      // Only show warning if balance is non-zero (to avoid showing on first load with zero balance)
      if (balance.balance > 0) {
        toast.warning(`Your balance is running low (${formatCurrency(balance.balance)}). Please contact your administrator to add funds.`, {
          id: 'low-balance-warning',
          duration: 6000,
        });
      }
    }
  }, [balance?.balance, balance?.warning_threshold]);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return {
    balance,
    transactions,
    remainingMinutes,
    isLowBalance,
    isLoading: isLoadingBalance || isLoadingTransactions,
    isUpdating,
    error: balanceError || transactionsError,
    updateBalance: updateBalanceMutation.mutate,
    refreshBalanceData,
    getCallUsage
  };
}

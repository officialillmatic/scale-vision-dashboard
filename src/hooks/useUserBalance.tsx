
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

  // Calculate remaining minutes based on current balance
  const remainingMinutes = balance ? calculateRemainingMinutes(balance.balance) : 0;

  // Check if balance is below warning threshold
  const isLowBalance = balance ? 
    (balance.warning_threshold !== null && balance.balance < balance.warning_threshold) : 
    false;

  return {
    balance,
    transactions,
    remainingMinutes,
    isLowBalance,
    isLoading: isLoadingBalance || isLoadingTransactions,
    isUpdating,
    error: balanceError || transactionsError,
    updateBalance: updateBalanceMutation.mutate,
    refreshBalanceData
  };
}

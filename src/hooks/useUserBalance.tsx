
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  updateUserBalance, 
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
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['user-balance-detailed', userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return null;
      
      // Use optimized security definer function
      const { data, error } = await supabase
        .rpc('get_user_balance_detailed', {
          p_user_id: userId,
          p_company_id: companyId
        });

      if (error) {
        console.error("Error fetching user balance:", error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!userId && !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform the data to match the original interface
  const balance: UserBalance | null = balanceData ? {
    balance: balanceData.balance,
    warning_threshold: balanceData.warning_threshold,
    user_id: userId!,
    company_id: companyId!,
    id: '', // Not needed for display
    created_at: new Date(), // Convert to Date object
    last_updated: new Date() // Convert to Date object
  } : null;

  const transactions: Transaction[] = balanceData?.recent_transactions || [];
  const remainingMinutes = balanceData?.remaining_minutes || 0;

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
      queryClient.invalidateQueries({ queryKey: ['user-balance-detailed'] });
    }
  });

  const refreshBalanceData = () => {
    refetchBalance();
  };

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
      .filter((tx: any) => 
        tx.type === 'call_cost' &&
        new Date(tx.created_at) >= start &&
        new Date(tx.created_at) <= end
      )
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
  };

  // Effect to show warning toast when balance becomes low
  useEffect(() => {
    if (balance && balance.warning_threshold && balance.balance < balance.warning_threshold) {
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
    isLoading: isLoadingBalance,
    isUpdating,
    error: balanceError,
    updateBalance: updateBalanceMutation.mutate,
    refreshBalanceData,
    getCallUsage
  };
}

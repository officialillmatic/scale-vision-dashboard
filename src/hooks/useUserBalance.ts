
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  warning_threshold: number;
  created_at: string;
  last_updated: string;
}

export function useUserBalance() {
  const { user, company } = useAuth();

  const { 
    data: balance, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['user-balance', user?.id, company?.id],
    queryFn: async (): Promise<UserBalance | null> => {
      if (!user?.id || !company?.id) {
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("user_balances")
          .select("*")
          .eq("user_id", user.id)
          .eq("company_id", company.id)
          .single();

        if (error) {
          console.error("[BALANCE_SERVICE] Error fetching user balance:", error);
          // Return null if no balance found instead of throwing
          if (error.code === 'PGRST116') {
            return null;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        console.error("[BALANCE_SERVICE] Error in useUserBalance:", error);
        throw new Error(`Failed to fetch user balance: ${error.message}`);
      }
    },
    enabled: !!user?.id && !!company?.id
  });

  // Calculate remaining minutes based on current balance and average cost
  const remainingMinutes = balance ? Math.floor(balance.balance / 0.02) : 0;
  
  // Determine if balance is low
  const isLowBalance = balance ? balance.balance <= (balance.warning_threshold || 10) : false;

  return {
    balance,
    isLoading,
    error,
    remainingMinutes,
    isLowBalance
  };
}

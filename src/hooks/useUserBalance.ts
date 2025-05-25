
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  warning_threshold: number;
  last_updated: Date;
  created_at: Date;
}

export const useUserBalance = () => {
  const { user, company } = useAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id || !company?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_balances")
          .select("*")
          .eq("user_id", user.id)
          .eq("company_id", company.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching user balance:", error);
        } else if (data) {
          setBalance({
            ...data,
            last_updated: new Date(data.last_updated),
            created_at: new Date(data.created_at)
          });
        }
      } catch (error) {
        console.error("Error in fetchBalance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [user?.id, company?.id]);

  const remainingMinutes = balance ? Math.floor(balance.balance / 0.02) : 0;
  const isLowBalance = balance ? balance.balance < (balance.warning_threshold || 10) : false;

  return {
    balance,
    isLoading,
    remainingMinutes,
    isLowBalance
  };
};

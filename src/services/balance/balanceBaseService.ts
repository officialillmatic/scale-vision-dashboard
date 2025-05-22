
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  last_updated: Date;
  created_at: Date;
  warning_threshold: number | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  company_id: string;
  amount: number;
  transaction_type: 'deposit' | 'deduction' | 'adjustment';
  description: string | null;
  call_id: string | null;
  created_at: Date;
}

/**
 * Get the current balance for a user in a company
 */
export const getUserBalance = async (userId: string, companyId: string): Promise<UserBalance | null> => {
  try {
    const { data, error } = await supabase
      .from("user_balances")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // Create a balance entry if it doesn't exist
      return createUserBalance(userId, companyId);
    }

    return {
      ...data,
      last_updated: new Date(data.last_updated),
      created_at: new Date(data.created_at),
    };
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch user balance",
      showToast: false
    });
    return null;
  }
};

/**
 * Create a new balance entry for a user in a company
 */
const createUserBalance = async (userId: string, companyId: string, initialBalance = 0): Promise<UserBalance | null> => {
  try {
    const { data, error } = await supabase
      .from("user_balances")
      .insert({
        user_id: userId,
        company_id: companyId,
        balance: initialBalance
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      last_updated: new Date(data.last_updated),
      created_at: new Date(data.created_at),
    };
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to create user balance",
      showToast: false
    });
    return null;
  }
};

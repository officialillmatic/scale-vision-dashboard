
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
export const createUserBalance = async (userId: string, companyId: string, initialBalance = 0): Promise<UserBalance | null> => {
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

/**
 * Update user balance (add or subtract)
 */
export const updateUserBalance = async (
  userId: string, 
  companyId: string, 
  amount: number, 
  description: string,
  callId?: string
): Promise<boolean> => {
  try {
    console.log(`💳 Actualizando balance: userId=${userId}, amount=${amount}`);
    
    // Obtener balance actual
    const currentBalance = await getUserBalance(userId, companyId);
    if (!currentBalance) {
      console.error('❌ No se pudo obtener balance actual');
      return false;
    }

    const newBalance = currentBalance.balance + amount; // amount negativo para descuentos
    console.log(`💰 Balance: ${currentBalance.balance} → ${newBalance}`);

    // Actualizar balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ 
        balance: newBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('❌ Error actualizando balance:', updateError);
      return false;
    }

    // Registrar transacción
    const transactionType = amount > 0 ? 'deposit' : 'deduction';
    const { error: transactionError } = await supabase
      .from('balance_transactions')
      .insert({
        user_id: userId,
        company_id: companyId,
        amount: Math.abs(amount),
        transaction_type: transactionType,
        description: description,
        call_id: callId,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ Error registrando transacción:', transactionError);
      // Revertir balance
      await supabase
        .from('user_balances')
        .update({ balance: currentBalance.balance })
        .eq('user_id', userId)
        .eq('company_id', companyId);
      return false;
    }

    console.log('✅ Balance y transacción actualizados exitosamente');
    return true;

  } catch (error) {
    console.error('💥 Error en updateUserBalance:', error);
    return false;
  }
};

/**
 * Process call cost deduction
 */
export const processCallCostDeduction = async (
  callId: string,
  userId: string,
  companyId: string,
  duration: number,
  ratePerMinute: number
): Promise<boolean> => {
  try {
    console.log(`🔄 Procesando costo de llamada: ${callId}`);
    
    // Calcular costo
    const costAmount = (duration / 60) * ratePerMinute;
    console.log(`💰 Costo calculado: ${duration}s × $${ratePerMinute}/min = $${costAmount.toFixed(4)}`);

    if (costAmount <= 0) {
      console.log('⚠️ Costo es 0, no se procesa');
      return false;
    }

    // Actualizar balance (amount negativo para descuento)
    const success = await updateUserBalance(
      userId,
      companyId,
      -costAmount, // Negativo para descuento
      `Call cost deduction - Call ID: ${callId}`,
      callId
    );

    return success;

  } catch (error) {
    console.error('💥 Error en processCallCostDeduction:', error);
    return false;
  }
};

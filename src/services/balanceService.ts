
/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please import from '@/services/balance' instead.
 * 
 * For example:
 * import { getUserBalance, updateUserBalance } from '@/services/balance';
 * 
 * This file exists only to provide backwards compatibility during migration.
 */

import { 
  getUserBalance,
  createUserBalance,
  getTransactionHistory,
  recordTransaction,
  updateUserBalance,
  hasSufficientBalance,
  calculateRemainingMinutes,
  calculateCallCost,
  calculateAgentCallCost,
  UserBalance,
  Transaction
} from './balance';

// Re-export everything from the modularized balance services
export {
  getUserBalance,
  createUserBalance,
  getTransactionHistory,
  updateUserBalance,
  hasSufficientBalance,
  calculateRemainingMinutes,
  calculateCallCost,
  calculateAgentCallCost,
  type UserBalance,
  type Transaction
};

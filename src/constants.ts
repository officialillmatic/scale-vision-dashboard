// Centralised constants for RPC names, table names and other repeated strings.
// Use these constants instead of hard-coded strings throughout the app to avoid typos.

export const RPC = {
  /**
   * Supabase RPC function for deducting balance from a user.
   * See supabase/sql/universal_balance_deduction.sql for implementation.
   */
  UNIVERSAL_BALANCE_DEDUCTION: 'universal_balance_deduction',

  /**
   * RPC function used to fetch users with low balance who need notifications.
   */
  GET_USERS_NEEDING_NOTIFICATION: 'get_users_needing_notification',
};

export const TABLES = {
  /** Table storing user credit balances. */
  USER_CREDITS: 'user_credits',
  /** Table that links users to their assigned agents. */
  USER_AGENT_ASSIGNMENTS: 'user_agent_assignments',
  /** Table storing call records. */
  CALLS: 'calls',
  /** Agents table for custom and retell agents. */
  AGENTS: 'agents',
};

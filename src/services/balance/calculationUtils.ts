
/**
 * Calculate estimated remaining minutes based on current balance and rate
 */
export const calculateRemainingMinutes = (
  balance: number,
  ratePerMinute = 0.02
): number => {
  return Math.floor(balance / ratePerMinute);
};

/**
 * Calculate call cost based on duration and rate
 */
export const calculateCallCost = (
  durationSec: number,
  ratePerMinute = 0.02
): number => {
  const durationMin = durationSec / 60;
  return parseFloat((durationMin * ratePerMinute).toFixed(4));
};

/**
 * Calculate call cost based on duration and agent-specific rate
 */
export const calculateAgentCallCost = (
  durationSec: number,
  agentRatePerMinute?: number
): number => {
  const ratePerMinute = agentRatePerMinute || 0.02; // Default rate if agent rate not specified
  const durationMin = durationSec / 60;
  return parseFloat((durationMin * ratePerMinute).toFixed(4));
};

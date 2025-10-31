
// Call-related constants
export const CALL_STATUS_OPTIONS = [
  'completed',
  'user_hangup', 
  'dial_no_answer',
  'voicemail',
  'failed',
  'unknown'
] as const;

export const CALL_DISPOSITION_OPTIONS = [
  'enrolled',
  'completed', 
  'success',
  'no_answer',
  'voicemail',
  'busy',
  'declined',
  'failed',
  'error'
] as const;

export const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.7,
  NEUTRAL: 0.3,
  NEGATIVE: 0
} as const;

export const DEFAULT_CALL_RATE_PER_MINUTE = 0.02;
export const DEFAULT_PAGINATION_LIMIT = 100;
export const DEFAULT_QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes

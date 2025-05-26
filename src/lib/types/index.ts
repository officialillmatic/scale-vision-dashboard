
// Core type definitions for the application
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  user_details?: {
    email: string;
    name?: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  rate_per_minute?: number;
  retell_agent_id?: string;
}

export interface Call {
  id: string;
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id?: string;
  timestamp: string;
  start_time?: string;
  duration_sec: number;
  cost_usd: number;
  sentiment?: string;
  sentiment_score?: number;
  disconnection_reason?: string;
  call_status: string;
  from: string;
  to: string;
  from_number?: string;
  to_number?: string;
  audio_url?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  call_type: string;
  call_summary?: string;
  disposition?: string;
  latency_ms?: number;
  result_sentiment?: any;
}

export interface UserAgent {
  id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  company_id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  call_id?: string;
  created_at: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  warning_threshold?: number;
  last_updated: string;
  created_at: string;
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  invited_by?: string;
}

// Form value types
export interface AgentAssignFormValues {
  agent_id: string;
  user_id: string;
  is_primary: boolean;
}

export interface AgentFormValues {
  name: string;
  description?: string;
  rate_per_minute?: number;
  retell_agent_id?: string;
}

// Permission and role types
export type Role = 'admin' | 'member' | 'viewer';

export interface PermissionSet {
  manageTeam: boolean;
  manageAgents: boolean;
  viewAgents: boolean;
  createAgents: boolean;
  assignAgents: boolean;
  deleteAgents: boolean;
  viewCalls: boolean;
  uploadCalls: boolean;
  manageBalances: boolean;
  viewBalance: boolean;
  accessBillingSettings: boolean;
  editSettings: boolean;
  uploadCompanyLogo: boolean;
  inviteUsers: boolean;
  removeUsers: boolean;
  sendInvitations: boolean;
  superAdminAccess: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Dashboard types
export interface DashboardMetrics {
  totalCalls: number;
  totalMinutes: number;
  avgDuration: string;
  totalCost: string;
  percentChange: {
    calls: string;
    minutes: string;
    duration: string;
    cost: string;
  };
}

export interface CallOutcome {
  name: string;
  value: number;
  color: string;
}

export interface AgentUsage {
  id: string;
  name: string;
  calls: number;
  minutes: number;
  cost: number;
}

// Webhook and event types
export interface WebhookPayload {
  event: string;
  call: any;
  timestamp: string;
}

export interface WebhookLog {
  id: string;
  event_type: string;
  call_id?: string;
  agent_id?: string;
  user_id?: string;
  company_id?: string;
  status: 'success' | 'error';
  processing_time_ms?: number;
  duration_sec?: number;
  cost_usd?: number;
  created_at: string;
}

// System health types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'error';
  webhook_endpoint: 'active' | 'inactive';
  retell_integration: 'healthy' | 'error' | 'no_agents';
  retell_secret_configured: boolean;
  timestamp: string;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

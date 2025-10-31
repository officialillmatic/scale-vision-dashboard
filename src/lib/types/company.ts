
import { User } from './index';

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
  company_name?: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  default_agent_rate: number;
  warning_threshold: number;
  email_notifications: boolean;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyStats {
  total_calls: number;
  total_cost: number;
  total_users: number;
  active_agents: number;
  monthly_calls: number;
  monthly_cost: number;
}

export interface CompanyBilling {
  id: string;
  company_id: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billing_cycle: 'monthly' | 'yearly';
  current_balance: number;
  credit_limit: number;
  auto_reload: boolean;
  auto_reload_amount: number;
  auto_reload_threshold: number;
  created_at: string;
  updated_at: string;
}

// New pricing structure
export interface CompanyPricing {
  id: string;
  company_id: string;
  pricing_type: 'standard' | 'custom' | 'enterprise';
  base_rate_per_minute: number;
  volume_discount_threshold?: number;
  volume_discount_rate?: number;
  custom_rate_per_minute?: number;
  created_at: string;
  updated_at: string;
}

// New white label configuration
export interface WhiteLabelConfig {
  id: string;
  company_id: string;
  enabled: boolean;
  company_name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_domain?: string;
  email_from_name?: string;
  email_from_address?: string;
  support_email?: string;
  created_at: string;
  updated_at: string;
}

export type CompanyRole = 'admin' | 'member' | 'viewer';

export interface CompanyPermissions {
  canManageTeam: boolean;
  canManageAgents: boolean;
  canViewFinancials: boolean;
  canEditSettings: boolean;
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canAccessBilling: boolean;
  canConfigureWhiteLabel: boolean;
  canManagePricing: boolean;
}

export interface CompanyUsage {
  calls_this_month: number;
  cost_this_month: number;
  minutes_this_month: number;
  storage_used_mb: number;
  api_requests_this_month: number;
}

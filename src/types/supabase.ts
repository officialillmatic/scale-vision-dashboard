
import { Database as OriginalDatabase } from "@/integrations/supabase/types";

// Define the calls table structure
export interface CallsTable {
  id: string;
  user_id: string;
  call_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  sentiment: string | null;
  disconnection_reason: string | null;
  call_status: string;
  from: string;
  to: string;
  audio_url: string | null;
  transcript?: string;
  company_id?: string | null;
  result_sentiment?: any | null;
  from_number?: string | null;
  to_number?: string | null;
  recording_url?: string | null;
  transcript_url?: string | null;
  sentiment_score?: number | null;
  disposition?: string | null;
  latency_ms?: number | null;
  call_type?: string;
  call_summary?: string | null;
  start_time?: string | null;
  agent_id?: string | null;
}

// Define agent table structure with company_id
export interface AgentTable {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  rate_per_minute?: number;
  retell_agent_id?: string;
  company_id: string; // Now required for company-specific agents
}

// Define user agent relationship table structure
export interface UserAgentTable {
  id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Define company pricing structure
export interface CompanyPricingTable {
  id: string;
  company_id: string;
  pricing_type: 'standard' | 'custom' | 'enterprise';
  base_rate_per_minute: number;
  volume_discount_threshold?: number | null;
  volume_discount_rate?: number | null;
  custom_rate_per_minute?: number | null;
  created_at: string;
  updated_at: string;
}

// Define white label configuration structure
export interface WhiteLabelConfigTable {
  id: string;
  company_id: string;
  enabled: boolean;
  company_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_domain?: string | null;
  email_from_name?: string | null;
  email_from_address?: string | null;
  support_email?: string | null;
  created_at: string;
  updated_at: string;
}

// Extend the original database types
export interface ExtendedDatabase extends OriginalDatabase {
  public: {
    Tables: {
      calls: {
        Row: CallsTable;
        Insert: Partial<CallsTable>;
        Update: Partial<CallsTable>;
      };
      agents: {
        Row: AgentTable;
        Insert: Partial<AgentTable>;
        Update: Partial<AgentTable>;
      };
      user_agents: {
        Row: UserAgentTable;
        Insert: Partial<UserAgentTable>;
        Update: Partial<UserAgentTable>;
      };
      company_pricing: {
        Row: CompanyPricingTable;
        Insert: Partial<CompanyPricingTable>;
        Update: Partial<CompanyPricingTable>;
      };
      white_label_configs: {
        Row: WhiteLabelConfigTable;
        Insert: Partial<WhiteLabelConfigTable>;
        Update: Partial<WhiteLabelConfigTable>;
      };
    } & OriginalDatabase['public']['Tables'];
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'] & {
      get_user_accessible_agents: {
        Args: { p_user_id: string; p_company_id: string };
        Returns: {
          id: string;
          name: string;
          description: string;
          rate_per_minute: number;
          retell_agent_id: string;
          avatar_url: string;
          status: string;
          created_at: string;
          updated_at: string;
          company_id: string;
        }[];
      };
    };
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}

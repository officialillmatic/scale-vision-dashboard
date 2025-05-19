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
}

// Define agent table structure
export interface AgentTable {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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
    } & OriginalDatabase['public']['Tables'];
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'];
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}

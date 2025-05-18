
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
    } & OriginalDatabase['public']['Tables'];
    Views: OriginalDatabase['public']['Views'];
    Functions: OriginalDatabase['public']['Functions'];
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}

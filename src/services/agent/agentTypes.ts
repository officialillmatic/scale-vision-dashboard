
import { AgentTable } from "@/types/supabase";

export type Agent = AgentTable & {
  ai_agent_id?: string;
};

export type UserAgent = {
  id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  agent?: Agent;
  user_details?: {
    email: string;
    name?: string;
  };
};

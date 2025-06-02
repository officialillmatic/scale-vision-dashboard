
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
  company_id?: string;
}

export interface UserAgent {
  id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  // Add the populated agent data
  agent?: Agent;
  user_details?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

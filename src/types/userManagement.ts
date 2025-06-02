
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Department {
  id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  parent_department_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  department_id?: string;
  avatar_url?: string;
  phone?: string;
  position?: string;
  start_date?: string;
  last_login?: string;
  is_team_lead: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'login' | 'call_made' | 'agent_assigned' | 'role_changed' | 'department_changed';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserMetrics {
  user_id: string;
  total_calls: number;
  total_duration_minutes: number;
  average_call_duration: number;
  success_rate: number;
  last_activity_date: string;
  agents_assigned: number;
  performance_score: number;
}

export interface BulkAction {
  type: 'assign_agent' | 'change_role' | 'change_department' | 'activate' | 'deactivate';
  user_ids: string[];
  payload: Record<string, any>;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
}

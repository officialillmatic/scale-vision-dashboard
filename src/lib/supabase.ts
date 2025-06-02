
import { createClient } from '@supabase/supabase-js';

// Use environment variables from Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

// Create a placeholder client if the environment variables are missing (for development only)
// This prevents the app from crashing during development if .env is not set up
const devFallbackUrl = 'https://jqkkhwoybcenxqpvodev.supabase.co';
const devFallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8';

export const supabase = createClient(
  SUPABASE_URL || devFallbackUrl, 
  SUPABASE_ANON_KEY || devFallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Profile': 'public',
        'Content-Profile': 'public'
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Export a function to check if we're using real credentials
export const hasValidSupabaseCredentials = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// TypeScript interfaces for agent management system

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface RetellAgent {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  status: string;
  rate_per_minute: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAgentAssignment {
  id: string;
  user_id: string;
  agent_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string;
}

export interface CallCache {
  id: string;
  call_id: string;
  agent_id: string;
  duration: number;
  status: string;
  start_timestamp: string;
  end_timestamp: string | null;
  cost: number;
  transcript: string | null;
  sentiment: string | null;
  from_number: string;
  to_number: string;
  created_at: string;
  updated_at: string;
}

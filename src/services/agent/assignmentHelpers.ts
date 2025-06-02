
import { supabase } from "@/integrations/supabase/client";

export interface AssignmentUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface AssignmentAgent {
  id: string;
  name: string;
  description?: string;
  status: string;
  retell_agent_id?: string;
}

export const fetchAvailableUsers = async (): Promise<AssignmentUser[]> => {
  try {
    console.log('🔍 [fetchAvailableUsers] Starting fetch - checking auth status');
    
    // Check if we have a session
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.warn('🔍 [fetchAvailableUsers] No active session found');
      throw new Error('No active session - please log in');
    }
    
    console.log('🔍 [fetchAvailableUsers] Session found, fetching ALL users from profiles table');
    
    // Fetch ALL users from profiles table without any role filters
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name");

    if (error) {
      console.error("[ASSIGNMENT_HELPERS] Supabase error fetching users:", error);
      console.error("[ASSIGNMENT_HELPERS] Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('🔍 [fetchAvailableUsers] Raw query response:', data);
    console.log('🔍 [fetchAvailableUsers] Total users fetched:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.warn('🔍 [fetchAvailableUsers] No users found in profiles table!');
      console.warn('🔍 [fetchAvailableUsers] This might indicate:');
      console.warn('  - The profiles table is empty');
      console.warn('  - RLS policies are blocking access');
      console.warn('  - Wrong table name or connection issues');
      
      // Let's also try to check if the table exists and has any data at all
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });
        
      if (countError) {
        console.error('🔍 [fetchAvailableUsers] Error checking user count:', countError);
      } else {
        console.log('🔍 [fetchAvailableUsers] Total rows in profiles table:', count);
      }
    }
    
    // Log each user for debugging
    data?.forEach((user, index) => {
      console.log(`🔍 [fetchAvailableUsers] User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      });
    });

    // Transform the data to match the AssignmentUser interface
    const transformedUsers = data?.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name
    })) || [];

    console.log('🔍 [fetchAvailableUsers] Transformed users:', transformedUsers);
    return transformedUsers;
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableUsers:", error);
    console.error("[ASSIGNMENT_HELPERS] Error stack:", error.stack);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

export const fetchAvailableAgents = async (): Promise<AssignmentAgent[]> => {
  try {
    console.log('🔍 [fetchAvailableAgents] Fetching agents from retell_agents table');
    
    const { data, error } = await supabase
      .from("retell_agents")
      .select("id, name, description, status, retell_agent_id")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("[ASSIGNMENT_HELPERS] Error fetching agents:", error);
      throw error;
    }

    console.log('🔍 [fetchAvailableAgents] Agents fetched:', data?.length || 0, 'agents');
    return data || [];
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

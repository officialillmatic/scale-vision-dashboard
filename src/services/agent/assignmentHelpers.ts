
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
    
    console.log('🔍 [fetchAvailableUsers] Session found, user ID:', session.session.user.id);
    console.log('🔍 [fetchAvailableUsers] Fetching ALL users from profiles table with exact query');
    
    // Use the exact query requested - no WHERE clauses, no filters
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role');

    console.log('🔍 [fetchAvailableUsers] Raw Supabase response:', { data, error });

    if (error) {
      console.error('🔍 [fetchAvailableUsers] Supabase error:', error);
      console.error('🔍 [fetchAvailableUsers] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('🔍 [fetchAvailableUsers] Query successful!');
    console.log('🔍 [fetchAvailableUsers] Raw data returned:', data);
    console.log('🔍 [fetchAvailableUsers] Total users fetched:', data?.length || 0);
    
    if (!data) {
      console.warn('🔍 [fetchAvailableUsers] Data is null/undefined');
      return [];
    }
    
    if (data.length === 0) {
      console.warn('🔍 [fetchAvailableUsers] No users found in profiles table!');
      console.warn('🔍 [fetchAvailableUsers] This might indicate:');
      console.warn('  - The profiles table is empty');
      console.warn('  - RLS policies are still blocking access');
      console.warn('  - User does not have SELECT permissions');
      
      // Let's also try to check if the table exists and has any data at all
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('🔍 [fetchAvailableUsers] Error checking user count:', countError);
      } else {
        console.log('🔍 [fetchAvailableUsers] Total rows in profiles table:', count);
      }
      
      return [];
    }
    
    // Log each user for debugging
    data.forEach((user, index) => {
      console.log(`🔍 [fetchAvailableUsers] User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        displayName: user.full_name || user.email
      });
    });

    // Transform the data to match the AssignmentUser interface
    // Handle null full_name by using email as fallback
    const transformedUsers = data.map(user => ({
      id: user.id,
      email: user.email || 'No email', // Fallback for null email
      full_name: user.full_name // Keep as is, can be null
    }));

    console.log('🔍 [fetchAvailableUsers] Transformed users:', transformedUsers);
    console.log('🔍 [fetchAvailableUsers] Final count:', transformedUsers.length);
    
    return transformedUsers;
  } catch (error: any) {
    console.error('🔍 [fetchAvailableUsers] Error in fetchAvailableUsers:', error);
    console.error('🔍 [fetchAvailableUsers] Error stack:', error.stack);
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

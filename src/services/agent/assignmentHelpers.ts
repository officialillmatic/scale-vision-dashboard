import { debugLog } from "@/lib/debug";
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
    debugLog('🔍 [fetchAvailableUsers] Starting fetch - checking auth status');
    
    // Check if we have a session
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.warn('🔍 [fetchAvailableUsers] No active session found');
      throw new Error('No active session - please log in');
    }
    
    debugLog('🔍 [fetchAvailableUsers] Session found, user ID:', session.session.user.id);
    debugLog('🔍 [fetchAvailableUsers] Fetching ALL users from profiles table with exact query');
    
    // Use the exact query requested - no WHERE clauses, no filters
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role');

    debugLog('🔍 [fetchAvailableUsers] Raw Supabase response:', { data, error });

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

    debugLog('🔍 [fetchAvailableUsers] Query successful!');
    debugLog('🔍 [fetchAvailableUsers] Raw data returned:', data);
    debugLog('🔍 [fetchAvailableUsers] Total users fetched:', data?.length || 0);
    
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
        debugLog('🔍 [fetchAvailableUsers] Total rows in profiles table:', count);
      }
      
      return [];
    }
    
    // Log each user for debugging
    data.forEach((user, index) => {
      debugLog(`🔍 [fetchAvailableUsers] User ${index + 1}:`, {
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

    debugLog('🔍 [fetchAvailableUsers] Transformed users:', transformedUsers);
    debugLog('🔍 [fetchAvailableUsers] Final count:', transformedUsers.length);
    
    return transformedUsers;
  } catch (error: any) {
    console.error('🔍 [fetchAvailableUsers] Error in fetchAvailableUsers:', error);
    console.error('🔍 [fetchAvailableUsers] Error stack:', error.stack);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

export const fetchAvailableAgents = async (): Promise<AssignmentAgent[]> => {
  try {
    debugLog('🔍 [fetchAvailableAgents] Fetching agents from agents table (CORRECTED)');
    
    const { data, error } = await supabase
      .from("agents")  // ✅ CAMBIADO DE "retell_agents" A "agents"
      .select("id, name, description, status, retell_agent_id")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("[ASSIGNMENT_HELPERS] Error fetching agents:", error);
      throw error;
    }

    debugLog('🔍 [fetchAvailableAgents] Agents fetched from agents table:', data?.length || 0, 'agents');
    debugLog('🔍 [fetchAvailableAgents] Agent details:', data);
    return data || [];
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};
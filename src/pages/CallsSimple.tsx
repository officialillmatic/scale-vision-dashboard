import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function CallsSimple() {
  const { user } = useAuth();
  const [agentAssignments, setAgentAssignments] = useState<any[]>([]);
  const [globalAgents, setGlobalAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgentAssignments() {
      if (!user) {
        setAgentAssignments([]);
        setGlobalAgents([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch agent assignments for the current user
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('agent_assignments')
          .select('*')
          .eq('user_id', user.id);

        if (assignmentsError) {
          console.error('Error fetching agent assignments:', assignmentsError);
          setAgentAssignments([]);
        } else {
          setAgentAssignments(assignmentsData || []);
        }

        // Fetch global agents (for super admin or fallback)
        const { data: globalAgentsData, error: globalAgentsError } = await supabase
          .from('agents')
          .select('*')
          .eq('is_global', true);

        if (globalAgentsError) {
          console.error('Error fetching global agents:', globalAgentsError);
          setGlobalAgents([]);
        } else {
          setGlobalAgents(globalAgentsData || []);
        }
      } catch (error) {
        console.error('Unexpected error fetching agents:', error);
        setAgentAssignments([]);
        setGlobalAgents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentAssignments();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Access the first agent assignment id safely
  const agentId = agentAssignments?.[0]?.id;
  
  console.log('🔍 [CALLS] Agent assignments for user:', {
    userId: user?.id,
    assignments: agentAssignments,
    firstAgentId: agentId,
    assignmentsLength: agentAssignments?.length
  });

  // If no specific agent assignment, get global agents (for super admin or fallback)
  let effectiveAgentIds: string[] = [];
  
  if (agentAssignments && agentAssignments.length > 0) {
    effectiveAgentIds = agentAssignments.map(assignment => assignment.id);
  } else if (globalAgents && globalAgents.length > 0) {
    effectiveAgentIds = globalAgents.map(agent => agent.id);
  }

  console.log('🎯 [CALLS] Effective agent IDs:', effectiveAgentIds);

  // Render the calls page content here
  return (
    <div>
      <h1>My Calls</h1>
      {/* Render calls or other UI based on effectiveAgentIds */}
      <p>Effective Agent IDs: {effectiveAgentIds.join(', ')}</p>
    </div>
  );
}

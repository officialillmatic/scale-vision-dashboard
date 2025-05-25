
import { supabase } from "@/integrations/supabase/client";

export async function setupTestAgentUserLink() {
  try {
    // Get existing agent
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (agentsError || !agents || agents.length === 0) {
      console.log('No agents found - creating test agent');
      
      // Create a test agent
      const { data: newAgent, error: createError } = await supabase
        .from('agents')
        .insert({
          name: 'Test Agent',
          description: 'Test agent for development',
          status: 'active',
          rate_per_minute: 0.02,
          retell_agent_id: 'test-retell-agent-id'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating test agent:', createError);
        return false;
      }
      
      console.log('Created test agent:', newAgent);
      return true;
    }

    // Get companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (companiesError || !companies || companies.length === 0) {
      console.error('No companies found');
      return false;
    }

    // Check if user_agents link exists
    const { data: existingLink } = await supabase
      .from('user_agents')
      .select('*')
      .eq('agent_id', agents[0].id)
      .eq('company_id', companies[0].id);

    if (!existingLink || existingLink.length === 0) {
      // Create the link
      const { error: linkError } = await supabase
        .from('user_agents')
        .insert({
          user_id: companies[0].owner_id,
          agent_id: agents[0].id,
          company_id: companies[0].id,
          is_primary: true
        });

      if (linkError) {
        console.error('Error creating user-agent link:', linkError);
        return false;
      }

      console.log('Created user-agent link successfully');
    }

    return true;
  } catch (error) {
    console.error('Error in setupTestAgentUserLink:', error);
    return false;
  }
}

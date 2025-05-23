
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/corsUtils.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate user permissions for agent actions
    const { data: userData, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { data: body } = await req.json();
    const { action, companyId, agentId, userId } = body;
    
    // Check if user is company owner (always has admin rights)
    const { data: isOwner } = await supabase.rpc(
      'is_company_owner',
      { company_id: companyId }
    );
    
    // Check if user is admin for the company
    const { data: isAdmin } = await supabase.rpc(
      'is_admin_of_company',
      { company_id: companyId }
    );
    
    const hasAdminRights = isOwner || isAdmin;
    
    // If not admin, check if user is trying to access their own assigned agent
    if (!hasAdminRights && agentId) {
      const { data: userAgent, error: userAgentError } = await supabase
        .from('user_agents')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('agent_id', agentId)
        .maybeSingle();
      
      if (userAgentError || !userAgent) {
        return new Response(JSON.stringify({ error: 'You do not have permission to access this agent', action }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // If trying to access another user's data, verify admin status
    if (userId && userId !== userData.user.id && !hasAdminRights) {
      return new Response(JSON.stringify({ error: 'You do not have permission to access other users\' data', action }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Success response
    return new Response(JSON.stringify({ success: true, isAdmin: hasAdminRights, action }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error enforcing agent permissions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


-- Add missing database functions for production readiness

-- Function to get user accessible agents (used in agentService)
CREATE OR REPLACE FUNCTION public.get_user_accessible_agents(p_user_id UUID, p_company_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  status TEXT,
  rate_per_minute NUMERIC,
  retell_agent_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin can access all agents
  IF public.is_super_admin(p_user_id) THEN
    RETURN QUERY
    SELECT a.id, a.name, a.description, a.avatar_url, a.status, a.rate_per_minute, a.retell_agent_id, a.created_at, a.updated_at
    FROM public.agents a
    ORDER BY a.name;
    RETURN;
  END IF;

  -- Company admins and owners can access all agents
  IF public.user_is_company_admin(p_user_id, p_company_id) THEN
    RETURN QUERY
    SELECT a.id, a.name, a.description, a.avatar_url, a.status, a.rate_per_minute, a.retell_agent_id, a.created_at, a.updated_at
    FROM public.agents a
    ORDER BY a.name;
    RETURN;
  END IF;

  -- Regular users can only access agents assigned to them
  RETURN QUERY
  SELECT a.id, a.name, a.description, a.avatar_url, a.status, a.rate_per_minute, a.retell_agent_id, a.created_at, a.updated_at
  FROM public.agents a
  INNER JOIN public.user_agents ua ON ua.agent_id = a.id
  WHERE ua.user_id = p_user_id AND ua.company_id = p_company_id
  ORDER BY a.name;
END;
$$;

-- Function to get company user agents (used in agentService)
CREATE OR REPLACE FUNCTION public.get_company_user_agents(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  agent_id UUID,
  company_id UUID,
  is_primary BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  agent_name TEXT,
  agent_description TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.user_id,
    ua.agent_id,
    ua.company_id,
    ua.is_primary,
    ua.created_at,
    ua.updated_at,
    a.name as agent_name,
    a.description as agent_description,
    up.email as user_email
  FROM public.user_agents ua
  LEFT JOIN public.agents a ON a.id = ua.agent_id
  LEFT JOIN public.user_profiles up ON up.id = ua.user_id
  WHERE ua.company_id = p_company_id
  ORDER BY ua.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_accessible_agents(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_user_agents(UUID) TO authenticated;

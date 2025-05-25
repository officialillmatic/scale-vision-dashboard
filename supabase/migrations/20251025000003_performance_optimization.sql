
-- Phase 3: Performance Optimization
-- Create security definer functions to replace complex nested queries

-- 1. Consolidated dashboard metrics function
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_optimized(
  p_company_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  current_calls BIGINT,
  current_duration_min NUMERIC,
  current_cost NUMERIC,
  current_avg_duration NUMERIC,
  previous_calls BIGINT,
  previous_duration_min NUMERIC,
  previous_cost NUMERIC,
  previous_avg_duration NUMERIC,
  daily_data JSONB,
  outcomes_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_start TIMESTAMP WITH TIME ZONE;
  v_previous_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate previous period dates
  v_previous_start := p_start_date - (p_end_date - p_start_date);
  v_previous_end := p_start_date;
  
  RETURN QUERY
  WITH current_metrics AS (
    SELECT 
      COUNT(*)::BIGINT as calls,
      COALESCE(SUM(duration_sec), 0)::NUMERIC / 60 as duration_min,
      COALESCE(SUM(cost_usd), 0)::NUMERIC as cost,
      COALESCE(AVG(duration_sec), 0)::NUMERIC as avg_duration
    FROM public.calls
    WHERE company_id = p_company_id
      AND timestamp >= p_start_date
      AND timestamp <= p_end_date
  ),
  previous_metrics AS (
    SELECT 
      COUNT(*)::BIGINT as calls,
      COALESCE(SUM(duration_sec), 0)::NUMERIC / 60 as duration_min,
      COALESCE(SUM(cost_usd), 0)::NUMERIC as cost,
      COALESCE(AVG(duration_sec), 0)::NUMERIC as avg_duration
    FROM public.calls
    WHERE company_id = p_company_id
      AND timestamp >= v_previous_start
      AND timestamp <= v_previous_end
  ),
  daily_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', DATE(timestamp),
        'calls', call_count,
        'minutes', total_duration_min
      ) ORDER BY DATE(timestamp)
    ) as daily_data
    FROM (
      SELECT 
        DATE(timestamp) as date,
        COUNT(*)::BIGINT as call_count,
        COALESCE(SUM(duration_sec), 0)::NUMERIC / 60 as total_duration_min
      FROM public.calls
      WHERE company_id = p_company_id
        AND timestamp >= p_start_date
        AND timestamp <= p_end_date
      GROUP BY DATE(timestamp)
    ) daily
  ),
  outcomes_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', status_type,
        'value', count
      )
    ) as outcomes_data
    FROM (
      SELECT 
        CASE 
          WHEN call_status = 'completed' THEN 'completed'
          WHEN call_status = 'failed' OR disconnection_reason IS NOT NULL THEN 'no-answer'
          WHEN disposition = 'voicemail' THEN 'voicemail'
          ELSE 'hangup'
        END as status_type,
        COUNT(*)::BIGINT as count
      FROM public.calls
      WHERE company_id = p_company_id
        AND timestamp >= p_start_date
        AND timestamp <= p_end_date
      GROUP BY status_type
    ) outcomes
  )
  SELECT 
    cm.calls,
    cm.duration_min,
    cm.cost,
    cm.avg_duration,
    pm.calls,
    pm.duration_min,
    pm.cost,
    pm.avg_duration,
    COALESCE(ds.daily_data, '[]'::jsonb),
    COALESCE(os.outcomes_data, '[]'::jsonb)
  FROM current_metrics cm
  CROSS JOIN previous_metrics pm
  CROSS JOIN daily_stats ds
  CROSS JOIN outcomes_stats os;
END;
$$;

-- 2. Optimized agent fetching function
CREATE OR REPLACE FUNCTION public.get_user_accessible_agents(p_user_id UUID, p_company_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  rate_per_minute NUMERIC,
  retell_agent_id TEXT,
  avatar_url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin first
  IF public.is_super_admin(p_user_id) THEN
    RETURN QUERY
    SELECT a.id, a.name, a.description, a.rate_per_minute, a.retell_agent_id, 
           a.avatar_url, a.status, a.created_at, a.updated_at
    FROM public.agents a
    ORDER BY a.name;
  ELSE
    RETURN QUERY
    SELECT DISTINCT a.id, a.name, a.description, a.rate_per_minute, a.retell_agent_id,
           a.avatar_url, a.status, a.created_at, a.updated_at
    FROM public.agents a
    INNER JOIN public.user_agents ua ON a.id = ua.agent_id
    WHERE ua.user_id = p_user_id 
      AND ua.company_id = p_company_id
    ORDER BY a.name;
  END IF;
END;
$$;

-- 3. Optimized user agents fetching function
CREATE OR REPLACE FUNCTION public.get_company_user_agents(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  agent_id UUID,
  company_id UUID,
  is_primary BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
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
    COALESCE(up.email, au.email) as user_email
  FROM public.user_agents ua
  LEFT JOIN public.agents a ON ua.agent_id = a.id
  LEFT JOIN public.user_profiles up ON ua.user_id = up.id
  LEFT JOIN auth.users au ON ua.user_id = au.id
  WHERE ua.company_id = p_company_id
  ORDER BY ua.created_at DESC;
END;
$$;

-- 4. Optimize balance checking function
CREATE OR REPLACE FUNCTION public.get_user_balance_detailed(p_user_id UUID, p_company_id UUID)
RETURNS TABLE(
  balance NUMERIC,
  warning_threshold NUMERIC,
  recent_transactions JSONB,
  remaining_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
  v_threshold NUMERIC;
  v_avg_rate NUMERIC := 0.02; -- Default rate per minute
BEGIN
  -- Get balance and threshold
  SELECT ub.balance, ub.warning_threshold 
  INTO v_balance, v_threshold
  FROM public.user_balances ub
  WHERE ub.user_id = p_user_id AND ub.company_id = p_company_id;
  
  -- Set defaults if no balance record exists
  v_balance := COALESCE(v_balance, 0);
  v_threshold := COALESCE(v_threshold, 10.00);
  
  -- Calculate average rate from user's agents
  SELECT COALESCE(AVG(a.rate_per_minute), 0.02)
  INTO v_avg_rate
  FROM public.user_agents ua
  JOIN public.agents a ON ua.agent_id = a.id
  WHERE ua.user_id = p_user_id AND ua.company_id = p_company_id;
  
  RETURN QUERY
  WITH recent_txns AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'amount', t.amount,
        'type', t.transaction_type,
        'description', t.description,
        'created_at', t.created_at
      ) ORDER BY t.created_at DESC
    ) as transactions
    FROM (
      SELECT * FROM public.transactions
      WHERE user_id = p_user_id AND company_id = p_company_id
      ORDER BY created_at DESC
      LIMIT 10
    ) t
  )
  SELECT 
    v_balance,
    v_threshold,
    COALESCE(rt.transactions, '[]'::jsonb),
    CASE WHEN v_avg_rate > 0 THEN v_balance / v_avg_rate ELSE 0 END
  FROM recent_txns rt;
END;
$$;

-- 5. Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_company_timestamp 
ON public.calls (company_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_company_status 
ON public.calls (company_id, call_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_agents_company_user 
ON public.user_agents (company_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_company_date 
ON public.transactions (user_id, company_id, created_at DESC);

-- 6. Standardize RLS to use 'authenticated' role consistently
-- Update any policies that might be using other roles

-- Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure all future objects have proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

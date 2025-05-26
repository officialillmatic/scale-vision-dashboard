
-- Production Security Fixes Migration
-- This migration implements critical security fixes for production readiness

-- 1. Enable RLS on all tables that don't have it yet
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_errors ENABLE ROW LEVEL SECURITY;

-- 2. Create comprehensive RLS policies for agents table
CREATE POLICY "Super admins can manage all agents" ON public.agents
  FOR ALL USING (public.is_super_admin_safe());

CREATE POLICY "Users can view assigned agents" ON public.agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.agent_id = agents.id 
      AND ua.user_id = (SELECT auth.uid())
    )
  );

-- 3. Create RLS policies for calls table
CREATE POLICY "Super admins can view all calls" ON public.calls
  FOR SELECT USING (public.is_super_admin_safe());

CREATE POLICY "Users can view their own calls" ON public.calls
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Company members can view company calls" ON public.calls
  FOR SELECT USING (
    public.user_has_company_access(company_id)
  );

CREATE POLICY "Users can insert their own calls" ON public.calls
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- 4. Create RLS policies for companies table
CREATE POLICY "Super admins can manage all companies" ON public.companies
  FOR ALL USING (public.is_super_admin_safe());

CREATE POLICY "Company owners can manage their companies" ON public.companies
  FOR ALL USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Company members can view their companies" ON public.companies
  FOR SELECT USING (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = companies.id 
      AND cm.user_id = (SELECT auth.uid())
      AND cm.status = 'active'
    )
  );

-- 5. Create RLS policies for company_members table
CREATE POLICY "Super admins can manage all company members" ON public.company_members
  FOR ALL USING (public.is_super_admin_safe());

CREATE POLICY "Company owners can manage their company members" ON public.company_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_members.company_id 
      AND c.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Company admins can manage company members" ON public.company_members
  FOR ALL USING (
    public.user_is_company_admin((SELECT auth.uid()), company_id)
  );

CREATE POLICY "Users can view their own membership" ON public.company_members
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 6. Create RLS policies for user_agents table
CREATE POLICY "Super admins can manage all user agents" ON public.user_agents
  FOR ALL USING (public.is_super_admin_safe());

CREATE POLICY "Users can manage their own agent assignments" ON public.user_agents
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Company admins can manage company user agents" ON public.user_agents
  FOR ALL USING (
    public.user_is_company_admin((SELECT auth.uid()), company_id)
  );

-- 7. Create RLS policies for user_balances table
CREATE POLICY "Super admins can view all balances" ON public.user_balances
  FOR SELECT USING (public.is_super_admin_safe());

CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Company admins can view company balances" ON public.user_balances
  FOR SELECT USING (
    public.user_is_company_admin((SELECT auth.uid()), company_id)
  );

CREATE POLICY "System can update balances" ON public.user_balances
  FOR UPDATE USING (true);

CREATE POLICY "System can insert balances" ON public.user_balances
  FOR INSERT WITH CHECK (true);

-- 8. Create RLS policies for transactions table
CREATE POLICY "Super admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.is_super_admin_safe());

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Company admins can view company transactions" ON public.transactions
  FOR SELECT USING (
    public.user_is_company_admin((SELECT auth.uid()), company_id)
  );

CREATE POLICY "System can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- 9. Create RLS policies for webhook logs (admin only)
CREATE POLICY "Super admins can view webhook logs" ON public.webhook_logs
  FOR SELECT USING (public.is_super_admin_safe());

CREATE POLICY "Company admins can view their webhook logs" ON public.webhook_logs
  FOR SELECT USING (
    company_id IS NOT NULL AND 
    public.user_is_company_admin((SELECT auth.uid()), company_id)
  );

-- 10. Create RLS policies for webhook errors (admin only)
CREATE POLICY "Super admins can view webhook errors" ON public.webhook_errors
  FOR SELECT USING (public.is_super_admin_safe());

-- 11. Create performance indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_user_id_timestamp ON public.calls(user_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_company_id_timestamp ON public.calls(company_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_user_company ON public.company_members(user_id, company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_agents_user_company ON public.user_agents(user_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_company ON public.transactions(user_id, company_id, created_at DESC);

-- 12. Create audit logging function
CREATE OR REPLACE FUNCTION public.audit_log_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log sensitive operations
  IF TG_TABLE_NAME = 'super_admins' OR TG_TABLE_NAME = 'companies' THEN
    INSERT INTO public.webhook_logs (
      event_type, 
      status, 
      user_id,
      created_at
    ) VALUES (
      TG_OP || '_' || TG_TABLE_NAME,
      'audit',
      COALESCE((SELECT auth.uid()), '00000000-0000-0000-0000-000000000000'::UUID),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 13. Create audit triggers for sensitive tables
CREATE TRIGGER audit_super_admins
  AFTER INSERT OR UPDATE OR DELETE ON public.super_admins
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_function();

CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_function();

-- 14. Improve existing functions for better security
CREATE OR REPLACE FUNCTION public.get_user_accessible_calls(p_user_id uuid, p_company_id uuid)
RETURNS TABLE(
  id uuid,
  call_id text,
  user_id uuid,
  company_id uuid,
  agent_id uuid,
  timestamp timestamp with time zone,
  duration_sec integer,
  cost_usd numeric,
  call_status text,
  sentiment text,
  call_summary text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin first
  IF public.is_super_admin_safe(p_user_id) THEN
    RETURN QUERY
    SELECT c.id, c.call_id, c.user_id, c.company_id, c.agent_id,
           c.timestamp, c.duration_sec, c.cost_usd, c.call_status,
           c.sentiment, c.call_summary
    FROM public.calls c
    WHERE c.company_id = p_company_id
    ORDER BY c.timestamp DESC;
  ELSE
    -- Check if user has access to the company
    IF NOT public.user_has_company_access(p_company_id) THEN
      RETURN;
    END IF;
    
    RETURN QUERY
    SELECT c.id, c.call_id, c.user_id, c.company_id, c.agent_id,
           c.timestamp, c.duration_sec, c.cost_usd, c.call_status,
           c.sentiment, c.call_summary
    FROM public.calls c
    WHERE c.company_id = p_company_id
      AND (
        c.user_id = p_user_id OR
        public.user_is_company_admin(p_user_id, p_company_id)
      )
    ORDER BY c.timestamp DESC;
  END IF;
END;
$$;

-- 15. Create rate limiting function for API calls
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit_per_hour integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Count actions in the last hour
  SELECT COUNT(*)
  INTO current_count
  FROM public.webhook_logs
  WHERE user_id = p_user_id
    AND event_type = p_action
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN current_count < p_limit_per_hour;
END;
$$;

-- 16. Add constraint to prevent invalid data
ALTER TABLE public.user_balances 
ADD CONSTRAINT check_positive_balance 
CHECK (balance >= 0);

ALTER TABLE public.transactions 
ADD CONSTRAINT check_valid_transaction_type 
CHECK (transaction_type IN ('debit', 'credit', 'adjustment', 'refund'));

-- 17. Update user preferences with better defaults
ALTER TABLE public.user_preferences 
ALTER COLUMN email_notifications_calls SET DEFAULT true,
ALTER COLUMN email_notifications_agents SET DEFAULT true,
ALTER COLUMN theme SET DEFAULT 'system';

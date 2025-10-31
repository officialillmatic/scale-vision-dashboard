
-- Enable RLS on all core tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_errors ENABLE ROW LEVEL SECURITY;

-- Companies table policies
CREATE POLICY "Users can view companies they own or are members of"
ON public.companies FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = companies.id 
    AND cm.user_id = auth.uid() 
    AND cm.status = 'active'
  )
);

CREATE POLICY "Users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Company owners can update their companies"
ON public.companies FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() OR
  public.is_super_admin()
);

CREATE POLICY "Company owners can delete their companies"
ON public.companies FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid() OR
  public.is_super_admin()
);

-- Company members table policies
CREATE POLICY "Users can view members of their companies"
ON public.company_members FOR SELECT
TO authenticated
USING (
  public.user_has_company_access(company_id)
);

CREATE POLICY "Company admins can manage members"
ON public.company_members FOR ALL
TO authenticated
USING (
  public.is_super_admin() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

-- Agents table policies
CREATE POLICY "Users can view agents in their companies"
ON public.agents FOR SELECT
TO authenticated
USING (
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.agent_id = agents.id
    AND public.user_has_company_access(ua.company_id)
  )
);

CREATE POLICY "Company admins can manage agents"
ON public.agents FOR ALL
TO authenticated
USING (
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.agent_id = agents.id
    AND public.user_is_company_admin(auth.uid(), ua.company_id)
  )
);

-- User agents table policies
CREATE POLICY "Users can view their agent assignments"
ON public.user_agents FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_super_admin() OR
  public.user_has_company_access(company_id)
);

CREATE POLICY "Company admins can manage user agent assignments"
ON public.user_agents FOR ALL
TO authenticated
USING (
  public.is_super_admin() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

-- Calls table policies
CREATE POLICY "Users can view calls in their companies"
ON public.calls FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_super_admin() OR
  public.user_has_company_access(company_id)
);

CREATE POLICY "System can insert calls"
ON public.calls FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_company_access(company_id)
);

CREATE POLICY "Company admins can update calls"
ON public.calls FOR UPDATE
TO authenticated
USING (
  public.is_super_admin() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

-- User balances table policies
CREATE POLICY "Users can view their own balances"
ON public.user_balances FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_super_admin() OR
  public.user_has_company_access(company_id)
);

CREATE POLICY "System can manage user balances"
ON public.user_balances FOR ALL
TO authenticated
USING (
  public.is_super_admin() OR
  user_id = auth.uid() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

-- Transactions table policies
CREATE POLICY "Users can view their transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_super_admin() OR
  public.user_has_company_access(company_id)
);

CREATE POLICY "System can insert transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_company_access(company_id)
);

-- Company invitations table policies
CREATE POLICY "Users can view invitations for their companies"
ON public.company_invitations FOR SELECT
TO authenticated
USING (
  public.is_super_admin() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Company admins can manage invitations"
ON public.company_invitations FOR ALL
TO authenticated
USING (
  public.is_super_admin() OR
  public.user_is_company_admin(auth.uid(), company_id)
);

-- Webhook logs table policies
CREATE POLICY "Super admins can view all webhook logs"
ON public.webhook_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Users can view logs for their companies"
ON public.webhook_logs FOR SELECT
TO authenticated
USING (
  public.user_has_company_access(company_id)
);

CREATE POLICY "System can insert webhook logs"
ON public.webhook_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Webhook errors table policies
CREATE POLICY "Super admins can view all webhook errors"
ON public.webhook_errors FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "System can insert webhook errors"
ON public.webhook_errors FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_members_user_company ON public.company_members(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_user_company ON public.user_agents(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_timestamp ON public.calls(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_user_timestamp ON public.calls(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_company ON public.transactions(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON public.webhook_logs(created_at DESC);

-- Update existing tables to ensure proper constraints
ALTER TABLE public.calls ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.user_agents ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.user_balances ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN company_id SET NOT NULL;

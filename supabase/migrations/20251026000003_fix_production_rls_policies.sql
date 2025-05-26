
-- Fix RLS policies for production data access issues

-- Enable RLS on all tables that need it
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Company invitations policies (fixes 403 errors)
DROP POLICY IF EXISTS "Company admins can view invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Company admins can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Users can verify their own invitations" ON public.company_invitations;

CREATE POLICY "Users can view company invitations"
  ON public.company_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- Company owners can see all invitations
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    -- Company admins can see all invitations
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
    OR
    -- Users can see invitations sent to their email
    email = (
      SELECT email FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.company_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can update invitations"
  ON public.company_invitations
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

-- Company members policies (fixes 406 errors)
DROP POLICY IF EXISTS "Company members can view other members" ON public.company_members;

CREATE POLICY "Users can view company members"
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    -- Company owners can see all members
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    -- Company members can see other members
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.company_members
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

-- User agents policies
CREATE POLICY "Users can view their agents"
  ON public.user_agents
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can manage their agents"
  ON public.user_agents
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
  );

-- Agents policies
CREATE POLICY "Users can view accessible agents"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all agents
    public.is_super_admin()
    OR
    -- Users can see agents assigned to them
    id IN (
      SELECT agent_id FROM public.user_agents 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage agents"
  ON public.agents
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
  );

-- Calls policies
CREATE POLICY "Users can view their calls"
  ON public.calls
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    OR
    public.is_super_admin()
  );

CREATE POLICY "System can insert calls"
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Users can view their transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin') 
      AND status = 'active'
    )
    OR
    public.is_super_admin()
  );

-- User balances policies
CREATE POLICY "Users can view their balance"
  ON public.user_balances
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    company_id IN (
      SELECT id FROM public.companies 
      WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin') 
      AND status = 'active'
    )
    OR
    public.is_super_admin()
  );

CREATE POLICY "System can manage balances"
  ON public.user_balances
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    public.is_super_admin()
  );

-- Create recordings storage bucket if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings', 
  'recordings', 
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for recordings bucket
DROP POLICY IF EXISTS "Users can view recordings from their company" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete recordings" ON storage.objects;

CREATE POLICY "Users can view recordings from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update recordings" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete recordings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recordings' 
    AND auth.role() = 'authenticated'
  );

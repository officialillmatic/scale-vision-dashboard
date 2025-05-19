
-- Create company invitations table
CREATE TABLE IF NOT EXISTS public.company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Each email can only have one pending invitation per company
  UNIQUE (company_id, email, status) 
  WHERE status = 'pending'
);

-- Enable RLS on the invitations table
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Policies to allow company admins and owners to manage invitations
CREATE POLICY "Company admins can view invitations"
  ON public.company_invitations
  FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id 
      FROM public.company_members cm 
      WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
    )
    OR 
    company_id IN (
      SELECT c.id 
      FROM public.companies c 
      WHERE c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can create invitations"
  ON public.company_invitations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cm.company_id 
      FROM public.company_members cm 
      WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
    )
    OR 
    company_id IN (
      SELECT c.id 
      FROM public.companies c 
      WHERE c.owner_id = auth.uid()
    )
  );

-- Allow users to check if they have a pending invitation by email
CREATE POLICY "Users can verify their own invitations"
  ON public.company_invitations
  FOR SELECT
  USING (
    email = (
      SELECT email 
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

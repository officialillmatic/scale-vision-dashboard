
-- Function to accept an invitation as a transaction
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_role TEXT;
  v_invitation_id UUID;
BEGIN
  -- Find the invitation and lock it
  SELECT id, company_id, role INTO v_invitation_id, v_company_id, v_role
  FROM public.company_invitations
  WHERE token = p_token AND status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  -- Check if the user is already a member of the company
  IF EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE company_id = v_company_id AND user_id = p_user_id
  ) THEN
    -- Update the invitation status
    UPDATE public.company_invitations
    SET status = 'accepted'
    WHERE id = v_invitation_id;
    
    RETURN TRUE;
  END IF;
  
  -- Add the user to the company
  INSERT INTO public.company_members (company_id, user_id, role, status)
  VALUES (v_company_id, p_user_id, v_role, 'active');
  
  -- Update the invitation status
  UPDATE public.company_invitations
  SET status = 'accepted'
  WHERE id = v_invitation_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

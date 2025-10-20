-- Ensure super admin record exists and RLS policies use dynamic checks

-- Upsert super admin using the current user UUID
INSERT INTO public.super_admins (id, user_id, email, created_at)
SELECT gen_random_uuid(), u.id, u.email, now()
FROM auth.users u
WHERE u.email = 'aiagentsdevelopers@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- Replace old UID-based policy with dynamic check
DROP POLICY IF EXISTS "SuperAdmins_Profiles_Access_UID" ON public.user_profiles;
CREATE POLICY "SuperAdmins_Profiles_Access"
  ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR id = auth.uid());

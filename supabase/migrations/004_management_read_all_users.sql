-- =============================================================================
-- ADD MANAGEMENT USER POLICY - Allow management users to read all users
-- =============================================================================
-- This policy allows users with type 'management' to read all user records
-- =============================================================================

-- Drop policy if it exists (in case of re-running)
DROP POLICY IF EXISTS "Management users can read all users" ON public.users;

-- Create a SECURITY DEFINER function to check if user is management
-- This bypasses RLS to avoid circular dependency
CREATE OR REPLACE FUNCTION public.is_management_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND type = 'management'
  );
END;
$$;

-- Policy: Management users can read all users
CREATE POLICY "Management users can read all users"
  ON public.users
  FOR SELECT
  USING (public.is_management_user() = true);

-- =============================================================================
-- Policy added!
-- =============================================================================


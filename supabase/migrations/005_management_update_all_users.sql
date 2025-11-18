-- =============================================================================
-- ADD MANAGEMENT UPDATE POLICY - Allow management users to update all users
-- =============================================================================
-- This policy allows users with type 'management' to update all user records
-- =============================================================================

-- Drop policy if it exists (in case of re-running)
DROP POLICY IF EXISTS "Management users can update all users" ON public.users;

-- Policy: Management users can update all users
CREATE POLICY "Management users can update all users"
  ON public.users
  FOR UPDATE
  USING (public.is_management_user() = true)
  WITH CHECK (public.is_management_user() = true);

-- =============================================================================
-- Policy added!
-- =============================================================================


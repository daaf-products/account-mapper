-- =============================================================================
-- SETUP RLS - Row Level Security Policies
-- =============================================================================
-- Configures security policies for the users table
-- =============================================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Allow server-side user creation (needed for registration fallback)
CREATE POLICY "Allow server-side user creation"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role has full access (for admin operations)
CREATE POLICY "Service role full access"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- RLS setup complete!
-- =============================================================================


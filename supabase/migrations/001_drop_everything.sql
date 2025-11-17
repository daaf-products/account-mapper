-- =============================================================================
-- DROP EVERYTHING - Clean slate script
-- =============================================================================
-- Run this to completely reset the database schema
-- WARNING: This will delete ALL user data!
-- =============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow server-side user creation" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;

-- Drop existing table
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing ENUM types
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;

-- =============================================================================
-- Cleanup complete!
-- =============================================================================

